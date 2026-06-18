"""
Build hotspot JSON from a plan JPG and component slot keys.

Usage:
    python docs/build-hotspots-json.py <image.jpg> <keys.json> [callouts.json]

keys.json format:
{
  "refrigerator": "refrigerator",
  "wall": ["wall-cabinet-1", "wall-cabinet-2"],
  "base": ["base-module-1", "oven-module", "sink-base"],
  "worktop": "worktop",
  "calloutMap": {"1": "base-module-1", "9": "wall-cabinet-1", ...}
}

callouts.json (optional, from detect-plan-callouts.py):
[{"nr": 1, "xPct": 34.72, "yPct": 61.69}, ...]

When callouts are provided the script uses NR x-positions to derive slot dividers
and replaces the vertical line detection for whichever rows have enough callout data.
Falls back to divider detection when callouts are absent or insufficient.

Prints a JSON array of {componentKey, left, top, width, height} in % to stdout.
"""
import json
import sys

import numpy as np
from PIL import Image

INK_THRESHOLD = 150
WALL_BAND = (0.18, 0.40, 0.75)
BASE_BAND = (0.62, 0.90, 0.60)
ALIGN_TOLERANCE = 0.75
RUN_START_MIN_PCT = 12.0
BASE_DOOR_TOP_OFFSET = 1.35
WORKTOP_HEIGHT = 1.35
SINK_FAUCET_WIDTH = 4.5
SINK_FAUCET_HEIGHT = 8.0
HOOD_DRAWING_HEIGHT = 3.5


def load_ink(path):
    img = Image.open(path).convert("L")
    w, h = img.size
    return np.asarray(img) < INK_THRESHOLD, w, h


def runs(mask):
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            out.append((i, j - 1, (i + j - 1) / 2.0))
            i = j
        else:
            i += 1
    return out


def major_horizontal_lines(ink, w, h):
    row = ink.sum(axis=1)
    lines = []
    for s, e, c in runs(row > 0.45 * w):
        lines.append({"y0": s, "y1": e, "center": c, "pct": 100 * c / h})
    return sorted(lines, key=lambda line: line["center"])


def band_vertical_centers(ink, w, h, y0f, y1f, thresh):
    y0, y1 = int(y0f * h), int(y1f * h)
    band = ink[y0:y1, :]
    centers = []
    for s, e, c in runs(band.sum(axis=0) > thresh * (y1 - y0)):
        centers.append({"x0": s, "x1": e, "center": c, "pct": 100 * c / w})
    return sorted(centers, key=lambda line: line["center"])


def box_from_dividers(left_pct, right_pct, top_pct, bottom_pct):
    return {
        "left": round(left_pct, 2),
        "top": round(top_pct, 2),
        "width": round(max(right_pct - left_pct, 0.5), 2),
        "height": round(max(bottom_pct - top_pct, 0.5), 2),
    }


def horizontal_edges_at_callout(
    ink,
    w,
    h,
    callout,
    top_pct,
    bottom_pct,
    min_width_pct=7.0,
    merge_neighbors=True,
    left_pct_bound=None,
    right_pct_bound=None,
):
    """Find left/right cabinet edges in a row band at a callout x-position."""
    top = int(max(0.0, top_pct) / 100.0 * h)
    bottom = int(min(100.0, bottom_pct) / 100.0 * h)
    if bottom <= top + 2:
        return None

    cx = int(callout["xPct"] / 100.0 * w)
    band = ink[top:bottom, :]
    band_height = bottom - top
    thresh = max(2, int(band_height * 0.22))
    column_runs = runs(band.sum(axis=0) > thresh)
    if not column_runs:
        return None

    containing = [index for index, run in enumerate(column_runs) if run[0] <= cx <= run[1]]
    if containing:
        chosen_index = min(containing, key=lambda index: abs(column_runs[index][2] - cx))
    else:
        chosen_index = min(range(len(column_runs)), key=lambda index: abs(column_runs[index][2] - cx))

    left_index = right_index = chosen_index
    if merge_neighbors:
        max_gap = max(6, int(w * 0.008))
        while left_index > 0 and column_runs[left_index][0] - column_runs[left_index - 1][1] <= max_gap:
            left_index -= 1
        while right_index < len(column_runs) - 1 and column_runs[right_index + 1][0] - column_runs[right_index][1] <= max_gap:
            right_index += 1

    pad = max(1, int(w * 0.0015))
    left_px = max(0, int(column_runs[left_index][0]) - pad)
    right_px = min(w, int(column_runs[right_index][1]) + pad + 1)

    # Refine to columns that actually carry cabinet outline ink.
    col_thresh = max(2, int(band_height * 0.10))
    ink_cols = [
        x
        for x in range(max(0, left_px - 3), min(w, right_px + 3))
        if band[:, x].sum() >= col_thresh
    ]
    if ink_cols:
        edge_pad = max(0, int(w * 0.0008))
        left_px = max(0, ink_cols[0] - edge_pad)
        right_px = min(w, ink_cols[-1] + edge_pad + 1)

    if left_pct_bound is not None:
        left_px = max(left_px, int(left_pct_bound / 100.0 * w))
    if right_pct_bound is not None:
        right_px = min(right_px, int(right_pct_bound / 100.0 * w))
    if right_px <= left_px + 1:
        return None

    min_width_px = int(w * (min_width_pct / 100.0))
    if right_px - left_px < min_width_px:
        expand = (min_width_px - (right_px - left_px)) // 2 + 1
        left_px = max(0, left_px - expand)
        right_px = min(w, right_px + expand)
        if left_pct_bound is not None:
            left_px = max(left_px, int(left_pct_bound / 100.0 * w))
        if right_pct_bound is not None:
            right_px = min(right_px, int(right_pct_bound / 100.0 * w))
    if right_px <= left_px + 1:
        return None
    return left_px, right_px


def snap_row_boxes_horizontal(ink, w, h, boxes, skip_keys=None):
    skip_keys = skip_keys or set()
    snapped = []
    for box in boxes:
        if box.get("componentKey") in skip_keys:
            snapped.append(box)
            continue
        faux_callout = {
            "xPct": box["left"] + box["width"] / 2.0,
            "yPct": box["top"] + box["height"] / 2.0,
        }
        edges = horizontal_edges_at_callout(
            ink,
            w,
            h,
            faux_callout,
            box["top"],
            box["top"] + box["height"],
            min_width_pct=max(box.get("width", 0) * 0.75, 6.5),
            merge_neighbors=False,
        )
        if not edges:
            snapped.append(box)
            continue
        left_px, right_px = edges
        snapped.append(
            {
                **box,
                "left": round(100.0 * left_px / w, 2),
                "width": round(100.0 * (right_px - left_px) / w, 2),
            }
        )
    return snapped


def box_from_callout_ink(
    ink, w, h, callout, top_pct, bottom_pct, x_window_pct=7.0, min_width_pct=8.5, merge_neighbors=False
):
    """Snap a hotspot box to cabinet column edges around a PDF callout centre."""
    edges = horizontal_edges_at_callout(
        ink,
        w,
        h,
        callout,
        top_pct,
        bottom_pct,
        min_width_pct=min_width_pct,
        merge_neighbors=merge_neighbors,
    )
    if not edges:
        return None
    left_px, right_px = edges
    return {
        "left": round(100.0 * left_px / w, 2),
        "top": round(top_pct, 2),
        "width": round(100.0 * (right_px - left_px) / w, 2),
        "height": round(max(bottom_pct - top_pct, 0.5), 2),
    }


def is_compact_right_fridge_layout(keys):
    fridge_side = keys.get("fridgeSide") or "left"
    wall_count = len(keys.get("wall") or [])
    return fridge_side == "right" and wall_count <= 5


def refine_box_with_ink(ink, w, h, box):
    """Snap a coarse %-box to the actual cabinet linework inside it."""
    left = int(box["left"] / 100.0 * w)
    top = int(box["top"] / 100.0 * h)
    right = int((box["left"] + box["width"]) / 100.0 * w)
    bottom = int((box["top"] + box["height"]) / 100.0 * h)

    left = max(0, min(left, w - 1))
    right = max(left + 1, min(right, w))
    top = max(0, min(top, h - 1))
    bottom = max(top + 1, min(bottom, h))

    region = ink[top:bottom, left:right]
    if not region.any():
        return box

    ys, xs = np.where(region)
    pad = max(1, int(min(w, h) * 0.0015))
    x0 = max(0, left + int(xs.min()) - pad)
    x1 = min(w, left + int(xs.max()) + pad + 1)
    y0 = max(0, top + int(ys.min()) - pad)
    y1 = min(h, top + int(ys.max()) + pad + 1)

    refined = {
        "left": round(100.0 * x0 / w, 2),
        "top": round(100.0 * y0 / h, 2),
        "width": round(100.0 * (x1 - x0) / w, 2),
        "height": round(100.0 * (y1 - y0) / h, 2),
    }

    orig_width = box.get("width", 0)
    orig_height = box.get("height", 0)
    if refined["width"] < orig_width * 0.5 or refined["height"] < orig_height * 0.5:
        return box
    return refined


def refine_hotspot_boxes(ink, w, h, boxes):
    skip = {"worktop", "sink-faucet", "extractor-hood"}
    refined = []
    for box in boxes:
        component_key = box.get("componentKey") or ""
        if (
            component_key in skip
            or component_key == "refrigerator"
            or is_wall_component_key(component_key)
            or is_base_component_key(component_key)
        ):
            refined.append(box)
            continue
        next_box = refine_box_with_ink(ink, w, h, box)
        refined.append({**box, **next_box})
    return refined


def pick_horizontal_bands(horizontals):
    pcts = [line["pct"] for line in horizontals]
    if len(pcts) < 4:
        raise SystemExit("Could not detect enough horizontal lines in the plan image.")

    wall_top = next((p for p in pcts if 14 <= p <= 22), None)
    if wall_top is None:
        wall_top = next((p for p in pcts if p >= 10), pcts[1])

    wall_bottom = next((p for p in pcts if p > wall_top + 10 and 36 <= p <= 46), wall_top + 24)

    # Worktop sits directly above the base row (high-50s %), not at the wall-cabinet bottom line.
    worktop_band = [p for p in pcts if 55 <= p <= 62]
    if len(worktop_band) >= 2:
        worktop_top, worktop_bottom = worktop_band[0], worktop_band[1]
    elif worktop_band:
        worktop_top = worktop_band[0]
        worktop_bottom = round(worktop_top + 1.35, 2)
    else:
        worktop_top = next((p for p in pcts if 55 <= p <= 68), wall_bottom + 18)
        worktop_bottom = round(worktop_top + 1.35, 2)

    base_top = next((p for p in pcts if p >= worktop_bottom - 0.5 and 59 <= p <= 68), worktop_bottom + 1.0)
    base_bottom_candidates = [p for p in pcts if 78 <= p <= 92]
    base_bottom = base_bottom_candidates[-1] if base_bottom_candidates else base_top + 25

    return wall_top, wall_bottom, worktop_top, worktop_bottom, base_top, base_bottom


def fridge_left_edge(base_centers, run_left):
    candidates = sorted({round(center["pct"], 2) for center in base_centers if center["pct"] < run_left - 0.5})
    if len(candidates) >= 2:
        return candidates[1]
    if candidates:
        return candidates[0]
    return max(0.5, run_left - 14.0)


def fridge_right_edge(base_centers, run_left):
    candidates = sorted(
        round(center["pct"], 2) for center in base_centers if run_left - 3.0 <= center["pct"] <= run_left
    )
    if candidates:
        return candidates[0]
    return run_left


def fridge_top_pct(wall_top, wall_bottom):
    # Tall fridge outline starts partway down the elevation, below the header frame.
    return round(wall_top + (wall_bottom - wall_top) * 0.54, 2)


def aligned_divider_pcts(wall_centers, base_centers):
    wall_pcts = [center["pct"] for center in wall_centers]
    base_pcts = [center["pct"] for center in base_centers]
    aligned = []
    for wall_pct in wall_pcts:
        if any(abs(wall_pct - base_pct) <= ALIGN_TOLERANCE for base_pct in base_pcts):
            aligned.append(round(wall_pct, 2))
    return sorted(set(aligned))


def filter_narrow_slot_dividers(dividers, min_width=3.5):
    if len(dividers) < 2:
        return dividers

    kept = [dividers[0]]
    for divider in dividers[1:]:
        if divider - kept[-1] >= min_width:
            kept.append(divider)

    if dividers[-1] - kept[-1] >= min_width:
        kept.append(dividers[-1])

    return kept


def trim_run_dividers(dividers, slot_count, fridge_side="left"):
    if fridge_side == "right":
        # Compact right-fridge plans can start very close to the left drawing frame
        # (AB 105819 starts at ~3.7%). Keep that real run divider instead of
        # shifting every slot one cabinet to the right.
        start_index = next((index for index, pct in enumerate(dividers) if pct >= 3.0), 0)
    else:
        start_index = next((index for index, pct in enumerate(dividers) if pct >= RUN_START_MIN_PCT), 0)

    candidates = filter_narrow_slot_dividers(dividers[start_index:])
    needed = slot_count + 1

    if fridge_side == "right" and len(candidates) > needed:
        # The last aligned divider on compact right-fridge layouts is often the
        # room/frame line past the refrigerator, not part of the cabinet run.
        candidates = candidates[:needed]

    while len(candidates) > needed:
        trailing_gap = candidates[-1] - candidates[-2]
        if candidates[-1] > 96 or trailing_gap < min_width_gap():
            candidates = candidates[:-1]
        else:
            break

    return candidates[:needed] if len(candidates) >= needed else candidates


def min_width_gap():
    return 3.5


def build_boxes(ink, w, h, keys):
    horizontals = major_horizontal_lines(ink, w, h)
    wall_top, wall_bottom, worktop_top, worktop_bottom, base_top, base_bottom = pick_horizontal_bands(
        horizontals
    )

    wall_keys = keys.get("wall") or []
    base_keys = keys.get("base") or []
    fridge_side = keys.get("fridgeSide") or "left"
    # Detect vertical dividers inside the plan bands inferred from horizontal lines.
    # This is more robust for layouts with different proportions than using fixed
    # fractions (WALL_BAND / BASE_BAND).
    #
    # Strategy:
    # 1) Try strict thresholds (more stable for existing layouts like AB 105812).
    # 2) If we find too few aligned dividers (smaller/different layouts), retry relaxed.
    min_needed_dividers = max(len(wall_keys), len(base_keys)) + 1 if (wall_keys or base_keys) else 3

    wall_centers_strict = band_vertical_centers(ink, w, h, wall_top / 100.0, wall_bottom / 100.0, 0.75)
    base_centers_strict = band_vertical_centers(ink, w, h, base_top / 100.0, base_bottom / 100.0, 0.60)
    aligned_strict = aligned_divider_pcts(wall_centers_strict, base_centers_strict)

    if len(aligned_strict) >= min_needed_dividers:
        aligned = aligned_strict
        wall_centers = wall_centers_strict
        base_centers = base_centers_strict
    else:
        # Thresholds are intentionally lower than detect-plan-hotspots.py because
        # some plans use thinner/less-solid linework for internal divider edges.
        wall_centers = band_vertical_centers(ink, w, h, wall_top / 100.0, wall_bottom / 100.0, 0.40)
        base_centers = band_vertical_centers(ink, w, h, base_top / 100.0, base_bottom / 100.0, 0.35)
        aligned = aligned_divider_pcts(wall_centers, base_centers)

    if len(aligned) < 3:
        raise SystemExit("Could not detect enough aligned vertical dividers in the plan image.")

    boxes = []

    wall_dividers = trim_run_dividers(aligned, len(wall_keys), fridge_side) if wall_keys else []
    base_dividers = trim_run_dividers(aligned, len(base_keys), fridge_side) if base_keys else []

    fridge_key = keys.get("refrigerator")
    if fridge_key:
        if fridge_side == "right":
            run_dividers = wall_dividers or base_dividers
            if run_dividers:
                run_right = run_dividers[-1]
                fridge_left = run_right
                fridge_right_candidates = [pct for pct in aligned if pct > run_right + 3.0 and pct < 96.0]
                fridge_right = fridge_right_candidates[0] if fridge_right_candidates else min(run_right + 12.0, 95.0)
            else:
                fridge_left = max(aligned[-2], 45.0)
                fridge_right = min(aligned[-1], 95.0)
            fridge_top = fridge_top_pct(wall_top, wall_bottom)
            boxes.append(
                {
                    "componentKey": fridge_key,
                    **box_from_dividers(fridge_left, fridge_right, fridge_top, base_bottom),
                }
            )
        else:
            run_left = wall_dividers[0] if wall_dividers else next(
                (pct for pct in aligned if pct >= RUN_START_MIN_PCT), aligned[-2]
            )
            fridge_left = fridge_left_edge(base_centers, run_left)
            fridge_right = fridge_right_edge(base_centers, run_left)
            fridge_top = fridge_top_pct(wall_top, wall_bottom)
            boxes.append(
                {
                    "componentKey": fridge_key,
                    **box_from_dividers(fridge_left, fridge_right, fridge_top, base_bottom),
                }
            )

    def add_row(component_keys, dividers, top_pct, bottom_pct):
        slots_available = len(dividers) - 1
        if slots_available <= 0:
            return
        keys_to_use = component_keys[: min(len(component_keys), slots_available)]
        for index, component_key in enumerate(keys_to_use):
            left = dividers[index]
            right = dividers[index + 1]
            boxes.append(
                {
                    "componentKey": component_key,
                    **box_from_dividers(left, right, top_pct, bottom_pct),
                }
            )

    add_row(wall_keys, wall_dividers, wall_top, wall_bottom)
    add_row(base_keys, base_dividers, base_top, base_bottom)

    worktop_key = keys.get("worktop")
    if worktop_key and wall_dividers and base_dividers:
        if fridge_side == "right":
            left = min(wall_dividers[0], base_dividers[0])
            right = max(wall_dividers[-1], base_dividers[-1])
        else:
            left = min(wall_dividers[0], base_dividers[0])
            right = max(wall_dividers[-1], base_dividers[-1])
        boxes.append(
            {
                "componentKey": worktop_key,
                **box_from_dividers(left, right, worktop_top, worktop_bottom),
            }
        )

    return boxes


def centers_to_dividers(centers, left_margin=5.0, right_margin=5.0):
    """Convert a sorted list of slot-centre x-percentages to slot boundary dividers."""
    if not centers:
        return []
    dividers = [centers[0] - left_margin]
    for i in range(len(centers) - 1):
        dividers.append((centers[i] + centers[i + 1]) / 2.0)
    dividers.append(centers[-1] + right_margin)
    return [round(max(0.0, min(100.0, d)), 2) for d in dividers]


def nr_to_component_key(callout_map):
    return {int(nr_str): component_key for nr_str, component_key in callout_map.items() if nr_str.isdigit()}


def boxes_for_band_from_callout_dividers(entries, top_pct, bottom_pct, edge_margin=3.5):
    """One hotspot per PDF callout NR; column width from midpoints between neighbors."""
    if not entries:
        return []

    sorted_entries = sorted(entries, key=lambda entry: entry["callout"]["xPct"])
    centers = [entry["callout"]["xPct"] for entry in sorted_entries]
    dividers = centers_to_dividers(centers, edge_margin, edge_margin)
    boxes = []
    for index, entry in enumerate(sorted_entries):
        left = dividers[index]
        right = dividers[index + 1]
        boxes.append(
            {
                "componentKey": entry["component_key"],
                **box_from_dividers(left, right, top_pct, bottom_pct),
            }
        )
    return boxes


def detect_ink_run_dividers(ink, w, h, horizontals, slot_count, fridge_side="left"):
    """Vertical divider positions detected from drawn plan linework."""
    wall_top, wall_bottom, _, _, base_top, base_bottom = pick_horizontal_bands(horizontals)
    min_needed = max(slot_count + 1, 3)

    wall_centers_strict = band_vertical_centers(ink, w, h, wall_top / 100.0, wall_bottom / 100.0, 0.75)
    base_centers_strict = band_vertical_centers(ink, w, h, base_top / 100.0, base_bottom / 100.0, 0.60)
    aligned_strict = aligned_divider_pcts(wall_centers_strict, base_centers_strict)

    if len(aligned_strict) >= min_needed:
        aligned = aligned_strict
        base_centers = base_centers_strict
    else:
        wall_centers = band_vertical_centers(ink, w, h, wall_top / 100.0, wall_bottom / 100.0, 0.40)
        base_centers = band_vertical_centers(ink, w, h, base_top / 100.0, base_bottom / 100.0, 0.35)
        aligned = aligned_divider_pcts(wall_centers, base_centers)

    if len(aligned) < 3:
        return None, base_centers

    return trim_run_dividers(aligned, slot_count, fridge_side), base_centers


def match_entries_to_ink_slots(entries, dividers):
    """Map each callout-mapped component to one ink divider column."""
    slot_count = len(dividers) - 1
    if slot_count <= 0 or not entries:
        return []

    sorted_entries = sorted(entries, key=lambda entry: entry["callout"]["xPct"])
    if len(sorted_entries) > slot_count:
        sorted_entries = sorted_entries[:slot_count]

    if len(sorted_entries) == slot_count:
        return [(entry, index) for index, entry in enumerate(sorted_entries)]

    assignments = []
    used_slots = set()
    for entry in sorted_entries:
        callout_x = entry["callout"]["xPct"]
        best_index = None
        best_distance = None
        for slot_index in range(slot_count):
            if slot_index in used_slots:
                continue
            slot_center = (dividers[slot_index] + dividers[slot_index + 1]) / 2.0
            distance = abs(callout_x - slot_center)
            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_index = slot_index
        if best_index is not None:
            used_slots.add(best_index)
            assignments.append((entry, best_index))
    return assignments


def boxes_for_band_from_ink_dividers(entries, dividers, top_pct, bottom_pct):
    boxes = []
    for entry, slot_index in match_entries_to_ink_slots(entries, dividers):
        left = dividers[slot_index]
        right = dividers[slot_index + 1]
        boxes.append(
            {
                "componentKey": entry["component_key"],
                **box_from_dividers(left, right, top_pct, bottom_pct),
            }
        )
    return boxes


def resolve_cabinet_row_overlaps(boxes):
    """Split overlapping ink-snapped cabinets at the midpoint between neighbors."""
    if len(boxes) < 2:
        return boxes

    ordered = sorted(boxes, key=lambda box: box["left"])
    for index in range(len(ordered) - 1):
        left_box = ordered[index]
        right_box = ordered[index + 1]
        left_right = left_box["left"] + left_box["width"]
        if left_right <= right_box["left"] + 0.05:
            continue
        split = round((left_right + right_box["left"]) / 2.0, 2)
        left_box["width"] = round(max(split - left_box["left"], 0.5), 2)
        right_width = right_box["left"] + right_box["width"] - split
        right_box["left"] = split
        right_box["width"] = round(max(right_width, 0.5), 2)
    return ordered


def snap_cabinet_box_to_linework(
    ink,
    w,
    h,
    box,
    callout,
    top_pct,
    bottom_pct,
    min_width_ratio=0.72,
    left_pct_bound=None,
    right_pct_bound=None,
):
    """Snap a cabinet hotspot to ink column edges; optional bounds keep search inside a NR column."""
    original_width = float(box.get("width") or 0)
    if original_width <= 0:
        return box

    guide = callout or {
        "xPct": box["left"] + box["width"] / 2.0,
        "yPct": (top_pct + bottom_pct) / 2.0,
    }
    edges = horizontal_edges_at_callout(
        ink,
        w,
        h,
        guide,
        top_pct,
        bottom_pct,
        min_width_pct=max(3.5, original_width * min_width_ratio),
        merge_neighbors=False,
        left_pct_bound=left_pct_bound,
        right_pct_bound=right_pct_bound,
    )
    if not edges:
        return {**box, "top": round(top_pct, 2), "height": round(max(bottom_pct - top_pct, 0.5), 2)}

    left_px, right_px = edges
    snapped = {
        **box,
        "left": round(100.0 * left_px / w, 2),
        "top": round(top_pct, 2),
        "width": round(100.0 * (right_px - left_px) / w, 2),
        "height": round(max(bottom_pct - top_pct, 0.5), 2),
    }
    if snapped["width"] < original_width * min_width_ratio:
        return box
    return snapped


def snap_box_to_ink_within_column(ink, w, h, box, top_pct, bottom_pct, min_width_pct=4.5):
    """Nudge divider edges to linework without shrinking below the column width."""
    return snap_cabinet_box_to_linework(
        ink,
        w,
        h,
        box,
        None,
        top_pct,
        bottom_pct,
        min_width_ratio=max(0.72, min_width_pct / max(float(box.get("width") or 1), 1)),
        left_pct_bound=box["left"],
        right_pct_bound=box["left"] + box["width"],
    )


def callouts_for_band(callouts, *, min_y=None, max_y=None, excluded_nrs=None):
    excluded = excluded_nrs or set()
    filtered = []
    for callout in callouts:
        if callout["nr"] in excluded:
            continue
        if min_y is not None and callout["yPct"] < min_y:
            continue
        if max_y is not None and callout["yPct"] >= max_y:
            continue
        filtered.append(callout)
    return filtered


def add_row_by_callouts(boxes, callouts_in_band, dividers, top_pct, bottom_pct, callout_map, fallback_keys=None):
    """Place one hotspot box per detected callout, mapped by NR -> componentKey."""
    if len(dividers) < 2 or not callouts_in_band:
        return

    nr_to_key = nr_to_component_key(callout_map)
    fallback_keys = list(fallback_keys or [])
    used_keys = set()

    for index in range(len(dividers) - 1):
        left = dividers[index]
        right = dividers[index + 1]
        slot_center = (left + right) / 2.0
        in_slot = [
            callout
            for callout in callouts_in_band
            if left - 0.25 <= callout["xPct"] <= right + 0.25
        ]
        if not in_slot:
            in_slot = [min(callouts_in_band, key=lambda callout: abs(callout["xPct"] - slot_center))]

        callout = min(in_slot, key=lambda item: abs(item["xPct"] - slot_center))
        component_key = nr_to_key.get(callout["nr"])
        if not component_key:
            while fallback_keys and fallback_keys[0] in used_keys:
                fallback_keys.pop(0)
            if fallback_keys:
                component_key = fallback_keys.pop(0)
        if not component_key or component_key in used_keys:
            continue

        used_keys.add(component_key)
        boxes.append({
            "componentKey": component_key,
            **box_from_dividers(left, right, top_pct, bottom_pct),
        })


def build_boxes_from_callouts(callouts, keys, horizontals):
    """
    Build hotspot boxes using the callout centre positions extracted from the PDF.

    callouts  – list of {nr, xPct, yPct} dicts.
    keys      – same keys dict passed to build_boxes().
    horizontals – horizontal line positions from the JPG (used for row banding).

    Returns a list of hotspot dicts (same format as build_boxes), or None if
    there are not enough callouts to cover both wall and base rows.
    """
    wall_keys = keys.get("wall") or []
    base_keys = keys.get("base") or []
    fridge_key = keys.get("refrigerator")
    worktop_key = keys.get("worktop")
    callout_map = keys.get("calloutMap") or {}  # nr (str) -> componentKey
    fridge_side = keys.get("fridgeSide") or "left"

    wall_top, wall_bottom, worktop_top, worktop_bottom, base_top, base_bottom = (
        pick_horizontal_bands(horizontals)
    )

    # Split callouts into wall-band and base-band by y-position.
    # Threshold: mid-point between the two band centres.
    split_y = (wall_top + wall_bottom + base_top + base_bottom) / 4.0

    # Identify which callouts belong to the fridge (if any).
    # Priority 1: use calloutMap to find which NRs map to "refrigerator".
    # Priority 2: heuristic — callouts whose y is in the fridge-zone (between wall
    #             bottom and base top) are assumed to be the fridge marker.
    fridge_zone_top = wall_bottom
    fridge_zone_bottom = base_top

    fridge_callout_nrs = set()
    if callout_map:
        fridge_callout_nrs = {
            int(nr_str)
            for nr_str, ck in callout_map.items()
            if ck == fridge_key and nr_str.isdigit()
        }
        for nr_str, ck in callout_map.items():
            if ck in {worktop_key, "sink-faucet"} and nr_str.isdigit():
                fridge_callout_nrs.add(int(nr_str))
    if not fridge_callout_nrs and fridge_key:
        # Auto-detect: callouts sitting between the two cabinet rows.
        for c in callouts:
            if fridge_zone_top <= c["yPct"] <= fridge_zone_bottom:
                fridge_callout_nrs.add(c["nr"])

    wall_callouts = callouts_for_band(
        callouts,
        max_y=split_y,
        excluded_nrs=fridge_callout_nrs,
    )
    base_callouts = callouts_for_band(
        callouts,
        min_y=split_y,
        excluded_nrs=fridge_callout_nrs,
    )

    wall_x = sorted(callout["xPct"] for callout in wall_callouts)
    base_x = sorted(callout["xPct"] for callout in base_callouts)

    # Require at least as many callouts as slot keys; otherwise fall back.
    if len(wall_x) < max(len(wall_keys), 1) and len(base_x) < max(len(base_keys), 1):
        return None

    # Build dividers from centres. Use tighter edge margins for compact plans.
    edge_margin = 3.5 if len(wall_x) <= 4 or len(base_x) <= 4 else 5.0
    wall_dividers = centers_to_dividers(wall_x, edge_margin, edge_margin) if wall_x else []
    base_dividers = centers_to_dividers(base_x, edge_margin, edge_margin) if base_x else []

    boxes = []

    # Refrigerator box.
    if fridge_key:
        if fridge_side == "right":
            run_right = (wall_dividers or base_dividers or [80.0])[-1]
            fridge_x_callouts = sorted(
                c["xPct"]
                for c in callouts
                if c["nr"] in fridge_callout_nrs or c["xPct"] > run_right + 2.0
            )
            if fridge_x_callouts:
                fridge_left = run_right
                fridge_right = fridge_x_callouts[-1] + 6.0
            else:
                fridge_left = run_right
                fridge_right = min(run_right + 13.0, 97.0)
        else:
            # Left fridge: spans from just before the run start.
            run_left = (wall_dividers or base_dividers or [15.0])[0]
            fridge_left = max(0.5, run_left - 13.0)
            fridge_right = run_left
        fridge_top = fridge_top_pct(wall_top, wall_bottom)
        boxes.append({
            "componentKey": fridge_key,
            **box_from_dividers(fridge_left, fridge_right, fridge_top, base_bottom),
        })

    def add_row(component_keys, dividers, top_pct, bottom_pct, band_callouts):
        if callout_map and band_callouts:
            add_row_by_callouts(
                boxes,
                band_callouts,
                dividers,
                top_pct,
                bottom_pct,
                callout_map,
                fallback_keys=component_keys,
            )
            return

        slots_available = len(dividers) - 1
        if slots_available <= 0:
            return
        keys_to_use = component_keys[: min(len(component_keys), slots_available)]
        for index, component_key in enumerate(keys_to_use):
            left = dividers[index]
            right = dividers[index + 1]
            boxes.append({
                "componentKey": component_key,
                **box_from_dividers(left, right, top_pct, bottom_pct),
            })

    add_row(wall_keys, wall_dividers, wall_top, wall_bottom, wall_callouts)
    add_row(base_keys, base_dividers, base_top, base_bottom, base_callouts)

    if worktop_key and (wall_dividers or base_dividers):
        all_dividers = sorted(set(wall_dividers + base_dividers))
        left = all_dividers[0]
        right = all_dividers[-1]
        boxes.append({
            "componentKey": worktop_key,
            **box_from_dividers(left, right, worktop_top, worktop_bottom),
        })

    return boxes


def is_base_component_key(component_key):
    if not component_key:
        return False
    if component_key == "worktop":
        return False
    return bool(
        component_key.startswith("base-module")
        or component_key in {"oven-module", "sink-base", "drawer-module"}
        or "dishwasher" in component_key
    )


def is_wall_component_key(component_key):
    return bool(component_key and component_key.startswith("wall-cabinet"))


def apply_base_door_top_offset(boxes, offset=BASE_DOOR_TOP_OFFSET):
    adjusted = []
    for box in boxes:
        if not is_base_component_key(box.get("componentKey")):
            adjusted.append(box)
            continue
        old_top = box["top"]
        old_bottom = old_top + box["height"]
        new_top = round(max(0.0, old_top - offset), 2)
        adjusted.append({
            **box,
            "top": new_top,
            "height": round(max(old_bottom - new_top, 0.5), 2),
        })
    return adjusted


def refine_fridge_hotspot_box(box, ink, w, h):
    if not box:
        return box
    component_key = box.get("componentKey")
    original_width = float(box.get("width") or 0)
    refined = refine_box_with_ink(ink, w, h, box)
    max_width = 13.5
    if refined["width"] > max_width:
        center = refined["left"] + refined["width"] / 2.0
        refined = {
            **refined,
            "left": round(max(0.5, center - max_width / 2.0), 2),
            "width": round(max_width, 2),
        }
    if original_width > 0 and refined["width"] < original_width * 0.75:
        refined = {**box, "componentKey": component_key}
    elif component_key:
        refined["componentKey"] = component_key
    return refined


def find_faucet_center_x(ink, w, h, sink_box, search_top_pct, search_bottom_pct):
    top = int(max(0.0, search_top_pct) / 100.0 * h)
    bottom = int(min(100.0, search_bottom_pct) / 100.0 * h)
    left = int(max(0.0, sink_box["left"]) / 100.0 * w)
    right = int(min(100.0, sink_box["left"] + sink_box["width"]) / 100.0 * w)
    if bottom <= top + 2 or right <= left + 2:
        return sink_box["left"] + sink_box["width"] / 2.0

    region = ink[top:bottom, left:right]
    if not region.any():
        return sink_box["left"] + sink_box["width"] / 2.0

    columns = region.sum(axis=0)
    peak_index = int(columns.argmax())
    return 100.0 * (left + peak_index) / w


def append_sink_faucet_hotspot(boxes, keys, ink, w, h, horizontals):
    faucet_key = keys.get("sinkFaucet") or "sink-faucet"
    if any(box.get("componentKey") == faucet_key for box in boxes):
        return boxes

    sink_box = next((box for box in boxes if box.get("componentKey") == "sink-base"), None)
    if not sink_box:
        return boxes

    try:
        wall_top, wall_bottom, worktop_top, worktop_bottom, _, _ = pick_horizontal_bands(horizontals)
    except SystemExit:
        worktop_top = sink_box["top"] - 2.0
        worktop_bottom = worktop_top + WORKTOP_HEIGHT

    center_x = find_faucet_center_x(ink, w, h, sink_box, worktop_top - 4.0, worktop_bottom + 1.0)
    faucet_box = {
        "componentKey": faucet_key,
        "left": round(max(0.5, center_x - SINK_FAUCET_WIDTH / 2.0), 2),
        "top": round(max(0.5, worktop_top - SINK_FAUCET_HEIGHT * 0.35), 2),
        "width": round(SINK_FAUCET_WIDTH, 2),
        "height": round(SINK_FAUCET_HEIGHT, 2),
    }
    return [*boxes, faucet_box]


def append_extractor_hood_hotspot(boxes, keys, horizontals):
    hood_key = keys.get("extractorHood") or "extractor-hood"
    if any(box.get("componentKey") == hood_key for box in boxes):
        return boxes

    hood_wall_key = keys.get("hoodWallCabinet")
    if not hood_wall_key:
        return boxes

    hood_wall_box = next((box for box in boxes if box.get("componentKey") == hood_wall_key), None)
    if not hood_wall_box:
        return boxes

    try:
        wall_top, wall_bottom, worktop_top, _, _, _ = pick_horizontal_bands(horizontals)
    except SystemExit:
        wall_top = hood_wall_box["top"]
        wall_bottom = hood_wall_box["top"] + hood_wall_box["height"]
        worktop_top = wall_bottom + 2.0

    hood_top = round(wall_bottom, 2)
    hood_bottom = round(min(worktop_top, hood_top + HOOD_DRAWING_HEIGHT), 2)
    hood_box = {
        "componentKey": hood_key,
        "left": hood_wall_box["left"],
        "top": hood_top,
        "width": hood_wall_box["width"],
        "height": round(max(hood_bottom - hood_top, 0.5), 2),
    }
    return [*boxes, hood_box]


def snap_cabinet_boxes_to_linework(boxes, keys, ink, w, h, horizontals):
    """Re-snap wall/base/fridge boxes to ink linework using row band heights."""
    try:
        wall_top, wall_bottom, _, _, base_top, base_bottom = pick_horizontal_bands(horizontals)
    except SystemExit:
        return boxes

    fridge_key = keys.get("refrigerator")
    snapped = []
    for box in boxes:
        component_key = box.get("componentKey") or ""
        if is_wall_component_key(component_key):
            top_pct, bottom_pct = wall_top, wall_bottom
        elif is_base_component_key(component_key):
            top_pct = round(base_top, 2)
            bottom_pct = base_bottom
        elif component_key == fridge_key:
            top_pct = fridge_top_pct(wall_top, wall_bottom)
            bottom_pct = base_bottom
        else:
            snapped.append(box)
            continue
        snapped.append(
            snap_cabinet_box_to_linework(
                ink,
                w,
                h,
                box,
                None,
                top_pct,
                bottom_pct,
                left_pct_bound=max(0.0, box["left"] - 0.5),
                right_pct_bound=min(100.0, box["left"] + box["width"] + 0.5),
            )
        )
    return snapped


def finalize_selection_hotspots(boxes, keys, ink, w, h, horizontals):
    if not boxes:
        return boxes

    fridge_key = keys.get("refrigerator")
    next_boxes = [box for box in boxes if box.get("componentKey")]
    next_boxes = [
        refine_fridge_hotspot_box(box, ink, w, h) if box.get("componentKey") == fridge_key else box
        for box in next_boxes
    ]
    next_boxes = append_extractor_hood_hotspot(next_boxes, keys, horizontals)
    next_boxes = append_sink_faucet_hotspot(next_boxes, keys, ink, w, h, horizontals)
    return refine_hotspot_boxes(ink, w, h, next_boxes)


def build_boxes_per_callout_ink(callouts, keys, ink, w, h, horizontals):
    """
    Place one ink-snapped hotspot box per mapped PDF callout (NR -> componentKey).
    Column width comes from adjacent callout midpoints so each NR stays on its own line.
    """
    callout_map = keys.get("calloutMap") or {}
    if not callout_map or not callouts:
        return None

    try:
        wall_top, wall_bottom, worktop_top, worktop_bottom, base_top, base_bottom = pick_horizontal_bands(
            horizontals
        )
    except SystemExit:
        return None

    split_y = (wall_top + wall_bottom + base_top + base_bottom) / 4.0
    fridge_key = keys.get("refrigerator")
    worktop_key = keys.get("worktop")
    callout_by_nr = {callout["nr"]: callout for callout in callouts}
    wall_entries = []
    base_entries = []
    fridge_entries = []

    for nr_str, component_key in callout_map.items():
        if not nr_str.isdigit() or not component_key:
            continue
        if component_key in {worktop_key, "sink-faucet"}:
            continue

        callout = callout_by_nr.get(int(nr_str))
        if not callout:
            continue

        entry = {"callout": callout, "component_key": component_key}
        if component_key == fridge_key:
            entry["top_pct"] = fridge_top_pct(wall_top, wall_bottom)
            entry["bottom_pct"] = base_bottom
            fridge_entries.append(entry)
        elif is_wall_component_key(component_key):
            entry["top_pct"] = wall_top
            entry["bottom_pct"] = wall_bottom
            wall_entries.append(entry)
        elif is_base_component_key(component_key):
            entry["top_pct"] = round(base_top, 2)
            entry["bottom_pct"] = base_bottom
            base_entries.append(entry)
        elif callout["yPct"] < split_y:
            entry["top_pct"] = wall_top
            entry["bottom_pct"] = wall_bottom
            wall_entries.append(entry)
        else:
            entry["top_pct"] = round(base_top, 2)
            entry["bottom_pct"] = base_bottom
            base_entries.append(entry)

    boxes = []
    fridge_side = keys.get("fridgeSide") or "left"
    run_slot_count = max(len(wall_entries), len(base_entries), 1)
    ink_dividers, base_centers = detect_ink_run_dividers(
        ink, w, h, horizontals, run_slot_count, fridge_side
    )

    for entries in (wall_entries, base_entries):
        if not entries:
            continue
        top_pct = entries[0]["top_pct"]
        bottom_pct = entries[0]["bottom_pct"]
        if ink_dividers:
            boxes.extend(boxes_for_band_from_ink_dividers(entries, ink_dividers, top_pct, bottom_pct))
        else:
            edge_margin = 3.5 if len(entries) <= 4 else 5.0
            sorted_entries = sorted(entries, key=lambda entry: entry["callout"]["xPct"])
            divider_boxes = boxes_for_band_from_callout_dividers(sorted_entries, top_pct, bottom_pct, edge_margin)
            for entry, divider_box in zip(sorted_entries, divider_boxes):
                left_bound = max(0.0, divider_box["left"] - 0.75)
                right_bound = min(100.0, divider_box["left"] + divider_box["width"] + 0.75)
                boxes.append(
                    snap_cabinet_box_to_linework(
                        ink,
                        w,
                        h,
                        divider_box,
                        entry["callout"],
                        top_pct,
                        bottom_pct,
                        left_pct_bound=left_bound,
                        right_pct_bound=right_bound,
                    )
                )

    for entry in fridge_entries:
        callout = entry["callout"]
        top_pct = entry["top_pct"]
        bottom_pct = entry["bottom_pct"]

        if fridge_side == "right":
            run_right = (
                max(box["left"] + box["width"] for box in boxes)
                if boxes
                else (ink_dividers[-1] if ink_dividers else 60.0)
            )
            if base_centers is not None:
                fridge_dividers = filter_narrow_slot_dividers(
                    sorted(
                        round(center["pct"], 2)
                        for center in base_centers
                        if run_right + 1.0 <= center["pct"] < 95.0
                    )
                )
                if len(fridge_dividers) >= 2:
                    boxes.append(
                        {
                            "componentKey": fridge_key,
                            **box_from_dividers(fridge_dividers[0], fridge_dividers[1], top_pct, bottom_pct),
                        }
                    )
                    continue

            fridge_box = box_from_callout_ink(
                ink,
                w,
                h,
                callout,
                top_pct,
                bottom_pct,
                min_width_pct=10.0,
                merge_neighbors=False,
            )
            if fridge_box and fridge_box["left"] + fridge_box["width"] / 2.0 > run_right - 2.0:
                boxes.append({**fridge_box, "componentKey": fridge_key})
                continue

            fridge_left = max(run_right, callout["xPct"] - 8.0)
            fridge_right = min(99.0, max(callout["xPct"] + 8.0, fridge_left + 12.0))
            divider_box = {
                **box_from_dividers(fridge_left, fridge_right, top_pct, bottom_pct),
                "componentKey": fridge_key,
            }
            boxes.append(
                snap_cabinet_box_to_linework(
                    ink,
                    w,
                    h,
                    divider_box,
                    callout,
                    top_pct,
                    bottom_pct,
                    left_pct_bound=max(run_right - 1.0, callout["xPct"] - 12.0),
                    right_pct_bound=min(99.5, callout["xPct"] + 12.0),
                )
            )
            continue

        if ink_dividers and base_centers is not None:
            run_left = ink_dividers[0]
            fridge_left = fridge_left_edge(base_centers, run_left)
            fridge_right = fridge_right_edge(base_centers, run_left)
            fridge_box = box_from_callout_ink(
                ink,
                w,
                h,
                callout,
                top_pct,
                bottom_pct,
                min_width_pct=10.0,
                merge_neighbors=False,
            )
            if fridge_box and fridge_box["left"] + fridge_box["width"] / 2.0 < run_left + 2.0:
                boxes.append({**fridge_box, "componentKey": fridge_key})
                continue
            boxes.append(
                {
                    "componentKey": fridge_key,
                    **box_from_dividers(fridge_left, fridge_right, top_pct, bottom_pct),
                }
            )
            continue

        if boxes:
            run_left = min(box["left"] for box in boxes)
            run_right = max(box["left"] + box["width"] for box in boxes)
        else:
            run_left = 15.0
            run_right = 85.0

        if fridge_side == "right":
            fridge_left = max(run_right, callout["xPct"] - 7.0)
            fridge_right = min(99.0, max(callout["xPct"] + 7.0, fridge_left + 12.0))
        else:
            fridge_left = max(0.5, min(callout["xPct"] - 7.0, run_left - 13.0))
            fridge_right = max(fridge_left + 10.0, min(run_left, callout["xPct"] + 8.0))

        divider_box = {
            **box_from_dividers(fridge_left, fridge_right, top_pct, bottom_pct),
            "componentKey": fridge_key,
        }
        boxes.append(
            snap_cabinet_box_to_linework(
                ink,
                w,
                h,
                divider_box,
                callout,
                top_pct,
                bottom_pct,
                left_pct_bound=max(0.0, fridge_left - 1.0),
                right_pct_bound=min(100.0, fridge_right + 1.0),
            )
        )

    if worktop_key:
        run_boxes = [box for box in boxes if box.get("componentKey") not in {fridge_key, worktop_key}]
        if run_boxes:
            left = min(box["left"] for box in run_boxes)
            right = max(box["left"] + box["width"] for box in run_boxes)
            boxes.append({
                "componentKey": worktop_key,
                **box_from_dividers(left, right, worktop_top, worktop_bottom),
            })

    return boxes if boxes else None


def build_boxes_from_callout_ink(callouts, keys, ink, w, h, horizontals):
    """
    Compact right-fridge plans: start from callout slot dividers, then snap each
    box horizontally to detected cabinet linework while keeping row band heights.
    """
    boxes = build_boxes_from_callouts(callouts, keys, horizontals)
    if not boxes:
        return None

    worktop_key = keys.get("worktop")
    fridge_key = keys.get("refrigerator")
    skip = {worktop_key} if worktop_key else set()
    boxes = snap_row_boxes_horizontal(ink, w, h, boxes, skip_keys=skip)

    if fridge_key:
        fridge_nrs = {
            int(nr_str)
            for nr_str, component_key in (keys.get("calloutMap") or {}).items()
            if component_key == fridge_key and nr_str.isdigit()
        }
        fridge_callouts = [callout for callout in callouts if callout["nr"] in fridge_nrs]
        if fridge_callouts:
            wall_top, wall_bottom, _, _, _, base_bottom = pick_horizontal_bands(horizontals)
            fridge_callout = fridge_callouts[0]
            fridge_box = box_from_callout_ink(
                ink,
                w,
                h,
                fridge_callout,
                fridge_top_pct(wall_top, wall_bottom),
                base_bottom,
            )
            if fridge_box:
                boxes = [
                    {**fridge_box, "componentKey": fridge_key}
                    if box.get("componentKey") == fridge_key
                    else box
                    for box in boxes
                ]

    return boxes


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(1)

    image_path, keys_path = sys.argv[1], sys.argv[2]
    with open(keys_path, encoding="utf-8") as handle:
        keys = json.load(handle)

    callouts = []
    if len(sys.argv) >= 4:
        with open(sys.argv[3], encoding="utf-8") as fh:
            callouts = json.load(fh)

    ink, w, h = load_ink(image_path)
    horizontals = major_horizontal_lines(ink, w, h)

    # Try callout-based approach first when we have positions.
    if callouts:
        boxes = build_boxes_per_callout_ink(callouts, keys, ink, w, h, horizontals)
        if not boxes:
            boxes = build_boxes_from_callout_ink(callouts, keys, ink, w, h, horizontals)
        if not boxes:
            boxes = build_boxes_from_callouts(callouts, keys, horizontals)
        if boxes:
            boxes = finalize_selection_hotspots(boxes, keys, ink, w, h, horizontals)
            json.dump(boxes, sys.stdout)
            return

    # Fall back to divider detection from the JPG.
    boxes = refine_hotspot_boxes(ink, w, h, build_boxes(ink, w, h, keys))
    boxes = finalize_selection_hotspots(boxes, keys, ink, w, h, horizontals)
    json.dump(boxes, sys.stdout)


if __name__ == "__main__":
    main()

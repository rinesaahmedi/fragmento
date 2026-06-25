"""Build SVG-aligned hotspot polygons for AB 105805 (L-shaped isometric plan).

These boxes were measured directly against frontend/public/jpg/AB 105805_page-0001.jpg
(the corrected plan export) using sub-pixel line detection (cv2.HoughLinesP on the ink
mask) to find each cabinet's true corners, then verified with
docs/detect-plan-hotspots.py --overlay.

Per the Corner Blende rule, the Excel's "ARTICLE NR 2" Blende codes are folded into the
adjacent cabinet's hotspot rather than left as separate unselected strips:
- NR 6 (base-module-2, UPK20 Blende) -> base-module-2/corner-base boundary moved from
  54.0% to 55.57% to absorb the visible Blende panel before the corner.
- NR 12 (wall-cabinet-4, HPK2002 Blende) -> right edge extended to 62.24% to include
  the cabinet's own outer corner edge, in one straight line (no notch — see below).
- NR 3 (corner filler, UPK20 Blende) is already part of the corner-base hotspot.

A duct/chimney box stands between the fridge and wall-cabinet-1 (no NR, no price) at the
left outside corner of the wall run -> folded into wall-cabinet-1's hotspot.

Every wall cabinet hotspot is a hexagon, not a plain quad: each cabinet has a visible
back-top edge (the roofline) **and** a front-top edge (where the door starts) — a thin
lid sliver in between that's part of the same cabinet, not a separate piece. The two
edges are parallel with a constant depth offset of (-4.39%, -1.05%) front-to-back,
measured from the matching pair of roofline/door-line segments and verified consistent
across the whole row (predicted vs measured front-top values matched within 0.01%).

Two things to avoid, found by visual review of the rendered overlay:
- Don't extrapolate a cabinet's own depth vector onto an attached duct/filler that has
  no visible lid of its own (it produced a flap poking out past the duct's real left
  edge) — just connect the duct's front-top-left point straight to the shared back-top
  corner of the next cabinet.
- Don't split one cabinet's hotspot into a main shape plus a separate notch/extension
  rectangle for an absorbed Blende — a concave notch makes the polygon's border double
  back on itself, which renders as a visible stray line across the fill. Extend the
  affected edge to one straight line instead (wall-cabinet-4's right edge here).

The worktop is ONE polygon, not several adjoining quads. Each separate piece used to
draw its own border, and since they're all the same locked component, the borders at
their shared edges showed up as distracting lines across what should look like a single
continuous counter surface. The single polygon below traces the whole visible
counter-top surface — main run, corner, and both sides of the sink — as one outline,
so only the true outer edge gets a border.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105805-boxes.json"

boxes = [
    {"componentKey": "refrigerator", "points": [[10.6, 29.8], [20.1, 28.4], [28.3, 30.15], [28.41, 85.81], [19.07, 86.73], [10.57, 84.68]]},
    {"componentKey": "worktop", "points": [[28.41, 58.0], [29.3, 58.55], [29.5, 85.5], [28.7, 85.77]], "preserveManualSize": True},
    {"componentKey": "wall-cabinet-1", "points": [[19.92, 18.27], [27.11, 17.25], [31.5, 18.3], [31.5, 42.3], [24.7, 43.3], [19.9, 28.43]]},
    {"componentKey": "wall-cabinet-2", "points": [[31.5, 18.3], [27.11, 17.25], [37.21, 15.8], [41.6, 16.85], [41.6, 40.85], [31.5, 42.3]]},
    {"componentKey": "extractor-hood", "points": [[31.5, 42.3], [41.6, 40.85], [41.6, 42.15], [31.5, 43.6]]},
    {"componentKey": "wall-cabinet-3", "points": [[41.6, 16.85], [37.21, 15.8], [45.66, 14.55], [50.05, 15.6], [50.05, 38.06], [41.6, 40.85]]},
    {"componentKey": "wall-cabinet-4", "points": [[50.05, 15.6], [45.66, 14.55], [56.61, 12.94], [62.24, 13.99], [62.24, 36.49], [50.05, 38.06]]},
    {"componentKey": "worktop", "points": [
        [28.7, 54.44], [35.45, 53.44], [45.57, 51.94], [55.57, 50.4], [64.05, 51.89], [72.55, 53.68],
        [76.8, 54.5], [87.17, 56.68], [87.17, 57.0], [76.8, 59.27], [72.55, 58.4], [64.05, 56.65],
        [55.57, 54.9], [45.57, 56.13], [35.45, 57.58], [28.7, 58.55],
    ]},
    {"componentKey": "base-module-1", "points": [[28.7, 58.55], [35.45, 57.58], [35.45, 84.84], [28.7, 85.77]]},
    {"componentKey": "oven-module", "points": [[35.45, 57.58], [45.57, 56.13], [45.57, 83.35], [35.45, 84.84]]},
    {"componentKey": "base-module-2", "points": [[45.57, 56.13], [55.57, 54.9], [55.57, 82.16], [45.57, 83.35]]},
    {"componentKey": "corner-base", "points": [[55.57, 54.9], [64.05, 56.65], [64.05, 83.91], [55.57, 82.16]]},
    {"componentKey": "base-module-3", "points": [[64.05, 56.65], [72.55, 58.4], [72.55, 85.65], [64.05, 83.91]]},
    {"componentKey": "sink-base", "points": [[72.55, 58.4], [76.8, 59.27], [76.8, 86.53], [72.55, 85.65]]},
    {"componentKey": "sink-base", "points": [[76.8, 59.27], [87.17, 56.65], [87.17, 85.12], [76.8, 86.53]], "preserveManualSize": True},
    {"componentKey": "sink-faucet", "left": 64, "top": 40, "width": 6, "height": 10.2, "preserveManualSize": True},
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(boxes, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    print(json.dumps(boxes, indent=2))

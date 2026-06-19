"""
Detect cabinet/grid edges in a to-scale kitchen elevation render (clean black-on-white
CAD export) so you can place pixel-perfect hotspots over the plan image.

Part of the "build a kitchen from PDF + Excel" workflow (see kitchen-from-pdf-agent-guide.md).

Usage:
    python docs/detect-plan-hotspots.py <image.jpg>
    python docs/detect-plan-hotspots.py <image.jpg> --overlay boxes.json out.png

Detection prints:
  - major horizontal lines (frame, wall top/bottom, worktop, base bottom, dimension line)
  - vertical dividers inside the wall band and the base band (the cabinet edges)

All positions are printed as % of image width/height, which is exactly what the hotspot
map in components/kitchen-svg-stage.jsx expects (left/top/width/height in %).

The optional --overlay step draws a JSON list of boxes back onto the image so you can
eyeball the fit. boxes.json format: [{"name","left","top","width","height"}, ...] in %.
Polygon hotspots are also supported with {"name","points": [[x, y], ...]} in %.
"""
import sys
import json
import numpy as np
from PIL import Image, ImageDraw

INK_THRESHOLD = 150  # pixel luminance below this counts as linework


def load_ink(path):
    img = Image.open(path).convert("L")
    W, H = img.size
    return np.asarray(img) < INK_THRESHOLD, W, H


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


def detect(path):
    ink, W, H = load_ink(path)
    print(f"image {W}x{H}")

    row = ink.sum(axis=1)
    print("\nHORIZONTAL LINES (dark across >45% of width):")
    for s, e, c in runs(row > 0.45 * W):
        print(f"  y {s}-{e}  {100*c/H:6.2f}%")

    # Heuristic bands: wall cabinets sit above the worktop, base below it. Adjust the
    # fractions if a plan differs, then re-run.
    for label, y0f, y1f, thresh in [("WALL", 0.18, 0.40, 0.75), ("BASE", 0.62, 0.90, 0.60)]:
        y0, y1 = int(y0f * H), int(y1f * H)
        band = ink[y0:y1, :]
        print(f"\n{label} band y {y0}-{y1} vertical dividers (dark across >{int(thresh*100)}% of band):")
        for s, e, c in runs(band.sum(axis=0) > thresh * (y1 - y0)):
            print(f"  x {s}-{e}  {100*c/W:6.2f}%")


def overlay(path, boxes_json, out_png):
    with open(boxes_json, encoding="utf-8") as fh:
        boxes = json.load(fh)
    img = Image.open(path).convert("RGB")
    W, H = img.size
    d = ImageDraw.Draw(img, "RGBA")
    for b in boxes:
        if b.get("points"):
            points = [(x / 100 * W, y / 100 * H) for x, y in b["points"]]
            d.line(points + [points[0]], fill=(214, 40, 40, 255), width=5, joint="curve")
            x0 = min(x for x, _ in points)
            y0 = min(y for _, y in points)
        else:
            x0, y0 = b["left"] / 100 * W, b["top"] / 100 * H
            x1 = (b["left"] + b["width"]) / 100 * W
            y1 = (b["top"] + b["height"]) / 100 * H
            d.rectangle([x0, y0, x1, y1], outline=(214, 40, 40, 255), width=5)
        name = b.get("name", b.get("componentKey", ""))
        if name:
            d.rectangle([x0, y0, x0 + 110, y0 + 26], fill=(214, 40, 40, 220))
            d.text((x0 + 4, y0 + 6), name, fill=(255, 255, 255, 255))
    img.save(out_png)
    print("saved", out_png)


if __name__ == "__main__":
    if len(sys.argv) >= 5 and sys.argv[2] == "--overlay":
        overlay(sys.argv[1], sys.argv[3], sys.argv[4])
    elif len(sys.argv) >= 2:
        detect(sys.argv[1])
    else:
        print(__doc__)

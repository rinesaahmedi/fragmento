"""Build SVG-aligned hotspot polygons for AB 105834 (L-shaped isometric plan).

Measured against frontend/public/jpg/AB 105834_page-0001.jpg rendered from pdfs/AB 105834.pdf.
Fridge-left L kitchen: main leg (500 + oven + 500), return leg (corner + sink + dishwasher).
Three wall cabinets (500 filler, hood, H6002) above the main run only.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105834-boxes.json"
JPG = ROOT / "frontend/public/jpg/AB 105834_page-0001.jpg"

DX, DY = -4.39, -1.05


def wall_hex(x0, x1, y_top, y_bottom):
    return [
        [x0, y_top],
        [x0 + DX, y_top + DY],
        [x1 + DX, y_top + DY],
        [x1, y_top],
        [x1, y_bottom],
        [x0, y_bottom],
    ]


def quad(x0, x1, y0, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


boxes = [
    {
        "componentKey": "refrigerator",
        "points": [
            [0.85, 34.5],
            [8.38, 32.0],
            [18.41, 36.5],
            [18.41, 90.5],
            [8.38, 92.5],
            [0.85, 88.0],
        ],
    },
    {"componentKey": "wall-cabinet-1", "points": wall_hex(18.41, 35.48, 18.0, 41.5)},
    {"componentKey": "wall-cabinet-2", "points": wall_hex(35.48, 47.46, 16.5, 40.0)},
    {
        "componentKey": "extractor-hood",
        "points": [[35.48, 39.5], [47.46, 37.0], [47.46, 38.8], [35.48, 41.3]],
    },
    {"componentKey": "wall-cabinet-3", "points": wall_hex(47.46, 62.0, 15.0, 38.5)},
    {
        "componentKey": "worktop",
        "points": [
            [18.41, 56.5],
            [29.52, 54.0],
            [39.81, 51.5],
            [51.84, 49.0],
            [62.31, 52.0],
            [72.36, 55.0],
            [82.42, 58.0],
            [94.39, 61.0],
            [94.39, 61.5],
            [82.42, 58.5],
            [72.36, 55.5],
            [62.31, 52.5],
            [51.84, 49.5],
            [39.81, 52.0],
            [29.52, 54.5],
            [18.41, 57.0],
        ],
    },
    {
        "componentKey": "worktop",
        "points": [[18.41, 57.0], [20.5, 59.0], [20.5, 90.0], [18.41, 88.0]],
        "preserveManualSize": True,
    },
    {"componentKey": "base-module-1", "points": quad(18.41, 29.52, 54.0, 89.0)},
    {"componentKey": "oven-module", "points": quad(29.52, 39.81, 51.5, 87.0)},
    {"componentKey": "base-module-2", "points": quad(39.81, 51.84, 49.0, 85.5)},
    {"componentKey": "corner-base", "points": quad(51.84, 62.31, 52.0, 84.0)},
    {"componentKey": "sink-base", "points": quad(62.31, 82.42, 55.0, 83.5)},
    {"componentKey": "base-module-3", "points": quad(82.42, 94.39, 58.0, 82.0)},
    {
        "componentKey": "sink-faucet",
        "points": [[68.0, 52.0], [76.0, 50.5], [78.0, 56.0], [76.0, 59.0], [68.0, 60.5], [66.0, 56.0]],
        "preserveManualSize": True,
    },
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(boxes, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    overlay = ROOT / "frontend/public/jpg/AB 105834_hotspots-overlay.jpg"
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "docs/detect-plan-hotspots.py"),
            str(JPG),
            "--overlay",
            str(OUT),
            str(overlay),
        ],
        check=True,
    )
    print("wrote", OUT)

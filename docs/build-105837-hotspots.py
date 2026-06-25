"""Build SVG-aligned hotspot polygons for AB 105837 (L-shaped isometric plan).

Measured against frontend/public/jpg/AB 105837_page-0001.jpg rendered from pdfs/AB 105837.pdf.
Fridge-left L kitchen (105834 family): US60 + oven + 500R on the main leg; corner + dishwasher +
locked sink on the return. Three wall cabinets (US60 R, hood, US60 L).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105837-boxes.json"
JPG = ROOT / "frontend/public/jpg/AB 105837_page-0001.jpg"

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
            [4.82, 34.48],
            [15.59, 31.25],
            [22.26, 36.53],
            [22.26, 88.42],
            [11.48, 91.65],
            [4.82, 86.38],
        ],
    },
    {"componentKey": "wall-cabinet-1", "points": wall_hex(22.26, 42.31, 17.5, 41.0)},
    {"componentKey": "wall-cabinet-2", "points": wall_hex(42.31, 53.15, 16.0, 39.5)},
    {
        "componentKey": "extractor-hood",
        "points": [[42.31, 38.5], [53.15, 36.0], [53.15, 37.8], [42.31, 40.3]],
    },
    {"componentKey": "wall-cabinet-3", "points": wall_hex(53.15, 63.99, 14.5, 38.0)},
    {
        "componentKey": "worktop",
        "points": [
            [22.26, 58.5],
            [34.30, 56.0],
            [45.20, 53.5],
            [57.80, 51.0],
            [63.20, 52.5],
            [69.20, 54.0],
            [86.80, 57.5],
            [86.80, 58.0],
            [69.20, 55.5],
            [63.20, 54.0],
            [57.80, 52.5],
            [45.20, 54.0],
            [34.30, 56.5],
            [22.26, 59.0],
        ],
    },
    {
        "componentKey": "worktop",
        "points": [[22.26, 59.0], [24.45, 61.0], [24.45, 89.0], [22.26, 87.5]],
        "preserveManualSize": True,
    },
    {"componentKey": "base-module-1", "points": quad(22.26, 34.30, 59.0, 88.5)},
    {"componentKey": "oven-module", "points": quad(34.30, 45.20, 56.5, 86.0)},
    {"componentKey": "base-module-2", "points": quad(45.20, 57.80, 54.0, 83.5)},
    {"componentKey": "corner-base", "points": quad(57.80, 63.20, 55.0, 82.0)},
    {"componentKey": "base-module-3", "points": quad(63.20, 69.20, 57.5, 83.5)},
    {"componentKey": "sink-base", "points": quad(69.20, 86.80, 59.5, 85.0)},
    {
        "componentKey": "sink-faucet",
        "points": [[74.0, 52.0], [82.0, 50.5], [84.0, 56.0], [82.0, 59.0], [74.0, 60.5], [72.0, 56.0]],
        "preserveManualSize": True,
    },
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(boxes, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    overlay = ROOT / "frontend/public/jpg/AB 105837_hotspots-overlay.jpg"
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

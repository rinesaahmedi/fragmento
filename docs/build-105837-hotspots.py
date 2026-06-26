"""Build SVG-aligned hotspot polygons for AB 105837 (L-shaped isometric plan).

Measured against frontend/public/jpg/AB 105837_page-0001.jpg rendered from
frontend/public/pdfs/AB 105837.pdf. Coordinates are source-image percentages.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105837-boxes.json"
JPG = ROOT / "frontend/public/jpg/AB 105837_page-0001.jpg"

boxes = [
    {"componentKey": "refrigerator", "points": [[10.86, 29.72], [19.92, 28.48], [29.88, 30.14], [19.92, 31.35]]},
    {"componentKey": "refrigerator", "points": [[10.86, 29.72], [19.92, 31.35], [19.92, 91.0], [10.74, 89.15]]},
    {"componentKey": "refrigerator", "points": [[19.92, 31.35], [29.88, 30.14], [30.09, 90.04], [19.92, 91.0]]},
    {"componentKey": "wall-cabinet-1", "points": [[19.92, 15.16], [30.09, 14.17], [37.08, 13.17], [26.1, 16.0]]},
    {"componentKey": "wall-cabinet-1", "points": [[19.92, 15.16], [26.1, 16.0], [26.1, 26.3], [20.05, 28.0]]},
    {"componentKey": "wall-cabinet-1", "points": [[26.1, 16.0], [37.08, 13.17], [37.08, 40.18], [30.09, 39.45], [30.09, 29.68], [26.1, 26.3]]},
    {"componentKey": "wall-cabinet-2", "points": [[30.09, 14.17], [41.07, 12.6], [48.02, 11.59], [37.08, 13.17]]},
    {"componentKey": "wall-cabinet-2", "points": [[37.08, 13.17], [48.02, 11.59], [48.02, 38.69], [37.08, 40.38]]},
    {"componentKey": "extractor-hood", "points": [[37.08, 40.38], [48.02, 38.69], [48.02, 39.78], [37.08, 41.0]]},
    {"componentKey": "wall-cabinet-3", "points": [[41.07, 12.72], [54.55, 11.05], [59.76, 11.9], [48.02, 11.75]]},
    {"componentKey": "wall-cabinet-3", "points": [[48.02, 11.75], [59.02, 11.96], [59.02, 36.0], [48.02, 38.55]]},
    {"componentKey": "wall-cabinet-3", "points": [[59.02, 11.96], [59.76, 11.9], [59.76, 35.82], [59.02, 36.0]]},
    {"componentKey": "worktop", "points": [[30.34, 59.08], [41.07, 55.93], [52.05, 53.0], [53.98, 52.7], [61.64, 53.95], [70.85, 55.88], [80.05, 57.72], [91.22, 59.92], [91.22, 60.48], [80.05, 61.82], [70.85, 59.38], [61.64, 57.48], [53.98, 55.95], [52.05, 55.82], [41.07, 58.02], [30.34, 60.02]]},
    {"componentKey": "base-module-1", "points": [[30.09, 60.3], [41.07, 58.25], [41.07, 89.01], [30.09, 90.0]]},
    {"componentKey": "oven-module", "points": [[41.07, 58.25], [52.05, 56.25], [52.05, 87.42], [41.07, 89.01]]},
    {"componentKey": "base-module-2", "points": [[52.05, 56.25], [61.64, 57.72], [61.64, 88.1], [52.05, 87.42]]},
    {"componentKey": "base-module-4", "points": [[61.64, 57.48], [70.85, 59.38], [70.85, 89.25], [61.64, 87.85]]},
    {"componentKey": "base-module-3", "points": [[70.85, 59.38], [80.05, 61.42], [80.05, 91.25], [70.85, 89.25]]},
    {"componentKey": "base-module-3", "points": [[80.05, 61.42], [91.22, 60.0], [91.22, 90.1], [80.05, 91.25]]},
    {"componentKey": "sink-faucet", "points": [[64.65, 56.05], [76.95, 55.82], [82.35, 57.02], [80.28, 59.28], [67.18, 58.92], [64.0, 57.55]], "preserveManualSize": True},
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

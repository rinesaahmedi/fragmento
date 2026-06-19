"""Build SVG-aligned hotspot polygons for AB 105837 (L-shaped isometric plan)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105837-boxes.json"

# Traced from frontend/public/jpg/AB 105837_page-0001.jpg (3509x2480).
# Same isometric family as AB 105834 / AB 105809; fewer wall cabinets (hood only in catalog).
boxes = [
    {
        "componentKey": "refrigerator",
        "points": [[4.82, 34.48], [15.59, 31.25], [22.26, 36.53], [22.26, 88.42], [11.48, 91.65], [4.82, 86.38]],
    },
    {
        "componentKey": "wall-cabinet-1",
        "points": [[24.62, 20.72], [31.38, 18.72], [34.78, 21.35], [34.78, 41.85], [28.02, 43.85], [24.62, 40.42]],
    },
    {
        "componentKey": "wall-cabinet-2",
        "points": [[31.38, 18.72], [41.82, 15.58], [45.22, 18.22], [45.22, 38.72], [34.78, 41.85], [34.78, 21.35]],
    },
    {
        "componentKey": "extractor-hood",
        "points": [[34.78, 38.72], [45.22, 35.58], [45.22, 40.15], [34.78, 43.28]],
    },
    {
        "componentKey": "wall-cabinet-3",
        "points": [[41.82, 15.58], [51.05, 12.85], [54.45, 15.48], [54.45, 35.98], [45.22, 38.72], [45.22, 18.22]],
    },
    {
        "componentKey": "worktop",
        "points": [[22.26, 54.85], [45.15, 48.35], [57.75, 53.95], [86.85, 64.85], [86.85, 66.05], [75.95, 69.45], [57.75, 58.55], [56.95, 56.75], [23.15, 61.85], [22.26, 60.25]],
    },
    {
        "componentKey": "worktop",
        "points": [[22.26, 60.25], [24.45, 63.05], [24.45, 89.25], [23.15, 89.35], [22.26, 87.82]],
    },
    {
        "componentKey": "worktop",
        "points": [[23.15, 61.85], [56.95, 56.75], [57.75, 58.55], [56.95, 57.95], [55.92, 58.25], [44.55, 61.65], [33.18, 65.05], [24.45, 63.05]],
    },
    {
        "componentKey": "base-module-1",
        "points": [[24.45, 63.05], [33.18, 65.05], [33.18, 86.25], [24.45, 88.25]],
    },
    {
        "componentKey": "oven-module",
        "points": [[33.18, 65.05], [44.55, 61.65], [44.55, 82.85], [33.18, 86.25]],
    },
    {
        "componentKey": "base-module-2",
        "points": [[44.55, 61.65], [55.92, 58.25], [56.95, 57.95], [56.95, 79.15], [55.92, 79.45], [44.55, 82.85]],
    },
    {
        "componentKey": "drawer-module",
        "points": [[56.95, 57.95], [57.75, 58.55], [62.35, 61.85], [62.35, 83.05], [57.75, 79.75], [56.95, 79.15]],
    },
    {
        "componentKey": "base-module-3",
        "points": [[62.35, 61.85], [69.25, 66.15], [69.25, 87.35], [62.35, 83.05]],
    },
    {
        "componentKey": "sink-base",
        "points": [[69.25, 66.15], [86.85, 64.85], [86.85, 86.05], [75.95, 89.45], [69.25, 87.35]],
    },
    {
        "componentKey": "sink-faucet",
        "points": [[63.35, 55.65], [71.05, 53.45], [82.55, 57.25], [82.55, 61.15], [70.65, 64.35], [63.35, 59.65]],
        "preserveManualSize": True,
    },
    {
        "componentKey": "sink-faucet",
        "points": [[73.15, 49.75], [77.35, 49.75], [77.35, 58.35], [76.15, 58.35], [76.15, 52.65], [73.15, 52.65]],
        "preserveManualSize": True,
    },
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(boxes, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    import subprocess
    import sys

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "docs/detect-plan-hotspots.py"),
            str(ROOT / "frontend/public/jpg/AB 105837_page-0001.jpg"),
            "--overlay",
            str(OUT),
            str(ROOT / "frontend/public/hotspot-overlays/105837-hotspots.png"),
        ],
        check=True,
    )
    print(json.dumps(boxes, indent=2))

"""Build SVG-aligned hotspot boxes for AB 105842 (dual elevation)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105842-boxes.json"

boxes = [
    {
        "componentKey": "refrigerator",
        "left": 0.67,
        "top": 31.79,
        "width": 12.04,
        "height": 46.93,
        "preserveManualSize": True,
    },
    {
        "componentKey": "worktop",
        "left": 14.62,
        "top": 55.55,
        "width": 0.27,
        "height": 22.99,
        "preserveManualSize": True,
    },
    {"componentKey": "wall-cabinet-1", "left": 14.89, "top": 24.29, "width": 10.62, "height": 18.11},
    {"componentKey": "wall-cabinet-2", "left": 25.51, "top": 24.25, "width": 10.62, "height": 18.11},
    {"componentKey": "extractor-hood", "left": 25.51, "top": 42.36, "width": 10.62, "height": 7.05},
    {"componentKey": "wall-cabinet-3", "left": 36.13, "top": 24.25, "width": 11.5, "height": 18.11},
    {"componentKey": "worktop", "left": 14.89, "top": 55.55, "width": 32.74, "height": 1.01},
    {"componentKey": "base-module-1", "left": 14.89, "top": 56.56, "width": 10.62, "height": 21.98, "preserveManualSize": True},
    {"componentKey": "oven-module", "left": 25.51, "top": 56.56, "width": 10.62, "height": 21.98, "preserveManualSize": True},
    {"componentKey": "base-module-2", "left": 36.13, "top": 56.56, "width": 11.5, "height": 21.98, "preserveManualSize": True},
    {"componentKey": "wall-cabinet-4", "left": 65.15, "top": 24.25, "width": 10.17, "height": 18.11},
    {"componentKey": "wall-cabinet-5", "left": 75.32, "top": 24.25, "width": 10.62, "height": 18.11},
    {"componentKey": "wall-cabinet-6", "left": 85.94, "top": 24.25, "width": 11.13, "height": 18.11},
    {"componentKey": "worktop", "left": 65.15, "top": 55.55, "width": 31.92, "height": 1.01},
    {"componentKey": "base-module-3", "left": 65.15, "top": 56.56, "width": 10.17, "height": 21.98, "preserveManualSize": True},
    {"componentKey": "sink-base", "left": 75.32, "top": 56.56, "width": 10.62, "height": 21.98, "preserveManualSize": True},
    {"componentKey": "drawer-module", "left": 85.94, "top": 56.56, "width": 11.13, "height": 21.98, "preserveManualSize": True},
    {"componentKey": "sink-faucet", "left": 80.6, "top": 48.0, "width": 4.85, "height": 8, "preserveManualSize": True},
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(boxes, indent=2) + "\n", encoding="utf-8")
print(json.dumps(boxes, indent=2))

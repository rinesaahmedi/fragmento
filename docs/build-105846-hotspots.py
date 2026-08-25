"""Build vector-aligned hotspot polygons for the AB 105846 L kitchen.

The vertices below come directly from the PDF drawing operators in
frontend/public/pdfs/AB 105846.pdf (842 x 595 pt).  Converting those source
points to percentages keeps the selection overlay aligned with both the SVG
and the 3509 x 2480 verification render.

The H4502/UPK20 and US50/UPEF65 fillers are absorbed into their adjacent
cabinet hotspots.  The sink cabinet includes its visible end face, and the
US30 includes the narrow panel before the refrigerator, so no drawn cabinet
pixel is left as an unselectable strip.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/hotspot-overlays/105846-boxes.json"
JPG = ROOT / "frontend/public/jpg/AB 105846_page-0001.jpg"
PAGE_WIDTH = 842.0
PAGE_HEIGHT = 595.0


def point(x, y):
    return [round(x / PAGE_WIDTH * 100, 6), round(y / PAGE_HEIGHT * 100, 6)]


def polygon(component_key, source_points, **extra):
    return {
        "componentKey": component_key,
        "points": [point(x, y) for x, y in source_points],
        **extra,
    }


boxes = [
    # Refrigerator: top, left side, and front faces.
    polygon("refrigerator", [(572.16, 156.28), (676.80, 145.48), (758.04, 157.36), (653.52, 168.04)]),
    polygon("refrigerator", [(572.16, 156.28), (653.52, 168.04), (653.52, 569.08), (572.16, 557.20)]),
    polygon("refrigerator", [(653.52, 168.04), (758.04, 157.36), (758.04, 558.28), (653.52, 569.08)]),

    # H4502 + UPK20: left filler face, door face, and visible top face.
    polygon("wall-cabinet-1", [(388.32, 22.12), (395.64, 23.20), (395.64, 186.52), (388.32, 185.44)]),
    polygon("wall-cabinet-1", [(395.64, 23.20), (483.48, 35.92), (483.48, 199.24), (395.64, 186.52)]),
    polygon("wall-cabinet-1", [(395.64, 23.20), (454.92, 17.08), (542.76, 29.80), (483.48, 35.92)]),

    # Hood wall cabinet, its top, the pull-out hood strip, and both light marks.
    polygon("wall-cabinet-2", [(483.48, 35.92), (571.20, 48.64), (571.20, 211.96), (483.48, 199.24)]),
    polygon("wall-cabinet-2", [(483.48, 35.92), (542.76, 29.80), (630.48, 42.64), (571.20, 48.64)]),
    polygon("extractor-hood", [(483.48, 199.24), (571.20, 211.96), (571.20, 223.24), (483.48, 210.52)]),
    polygon("extractor-hood", [(498.48, 239.56), (503.28, 221.32), (507.00, 221.92), (515.64, 242.08)]),
    polygon("extractor-hood", [(543.00, 246.04), (547.80, 227.80), (551.52, 228.40), (560.04, 248.56)]),

    # H3002 is partly occluded by the refrigerator; trace only its visible pixels.
    polygon("wall-cabinet-3", [(571.20, 48.64), (630.48, 42.64), (674.40, 49.00), (615.12, 55.00)]),
    polygon("wall-cabinet-3", [(571.20, 48.64), (615.12, 55.00), (615.12, 151.84), (572.16, 156.28), (571.20, 156.18)]),
    polygon("wall-cabinet-3", [(615.12, 55.00), (674.40, 49.00), (674.40, 145.24), (615.12, 151.84)]),

    # One continuous L-shaped worktop outline, including both thin front fascias.
    polygon("worktop", [
        (57.12, 349.24), (447.60, 309.28), (572.16, 327.28),
        (572.16, 362.32), (430.80, 341.68), (144.84, 370.96), (57.12, 358.24),
    ]),

    # The exposed UPEF65 end panel is selectable separately from the fixed sink front.
    polygon("sink-end-blende", [(64.08, 357.52), (151.80, 370.24), (151.80, 568.60), (64.08, 555.88)]),
    polygon("sink-base", [(151.80, 370.24), (230.28, 362.20), (230.28, 560.56), (151.80, 568.60)]),
    polygon("base-module-3", [(230.28, 362.20), (334.92, 351.52), (334.92, 549.88), (230.28, 560.56)]),
    polygon("base-module-1", [(334.92, 351.52), (438.12, 342.76), (438.12, 541.12), (334.92, 549.88)]),
    polygon("oven-module", [(438.12, 342.76), (525.96, 355.60), (525.96, 553.84), (438.12, 541.12)]),
    polygon("base-module-2", [(525.96, 355.60), (572.16, 362.32), (572.16, 560.56), (525.96, 553.84)]),

    # Trace the faucet as three narrow vector silhouettes: the curved spout,
    # vertical stem, and angled nozzle/lever. This keeps the large empty area
    # under the spout from becoming clickable.
    polygon("sink-faucet", [
        (111.72, 305.32), (111.72, 303.76), (111.84, 302.20), (112.08, 300.64),
        (112.44, 299.08), (112.92, 297.52), (113.40, 296.08), (114.12, 294.76),
        (114.84, 293.44), (115.68, 292.36), (116.52, 291.40), (117.48, 290.56),
        (118.44, 289.84), (119.52, 289.36), (120.48, 289.12), (121.56, 288.88),
        (122.52, 288.88), (143.28, 289.60), (142.80, 295.96), (122.88, 295.24),
        (121.56, 295.36), (120.24, 295.84), (118.92, 296.80), (117.84, 298.24),
        (116.88, 299.92), (116.28, 301.84), (115.92, 303.88), (115.80, 305.92),
    ], preserveManualSize=True),
    polygon("sink-faucet", [
        (111.72, 305.32), (115.80, 305.92), (116.64, 349.72), (110.76, 349.48),
    ], preserveManualSize=True),
    polygon("sink-faucet", [
        (142.92, 283.96), (148.68, 285.52), (147.12, 307.84), (141.36, 306.64),
    ], preserveManualSize=True),
]


OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(boxes, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    overlay = ROOT / "frontend/public/hotspot-overlays/105846-hotspots.png"
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

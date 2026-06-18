"""Debug hotspot boxes before/after ink refinement."""
import importlib.util
import json
import sys
from pathlib import Path

module_path = Path(__file__).resolve().parent / "build-hotspots-json.py"
spec = importlib.util.spec_from_file_location("build_hotspots_json", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

build_boxes_from_callouts = module.build_boxes_from_callouts
load_ink = module.load_ink
major_horizontal_lines = module.major_horizontal_lines
refine_hotspot_boxes = module.refine_hotspot_boxes

jpg = sys.argv[1]
keys_path = sys.argv[2]
callouts_path = sys.argv[3] if len(sys.argv) > 3 else None

with open(keys_path, encoding="utf-8") as handle:
    keys = json.load(handle)

callouts = []
if callouts_path:
    with open(callouts_path, encoding="utf-8") as handle:
        callouts = json.load(handle)

ink, w, h = load_ink(jpg)
horizontals = major_horizontal_lines(ink, w, h)
raw = build_boxes_from_callouts(callouts, keys, horizontals)
refined = refine_hotspot_boxes(ink, w, h, raw)

print("RAW:")
print(json.dumps(raw, indent=2))
print("\nREFINED:")
print(json.dumps(refined, indent=2))

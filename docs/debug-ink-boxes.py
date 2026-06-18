"""Print ink-based dividers for a kitchen plan."""
import importlib.util
import json
import sys
from pathlib import Path

module_path = Path(__file__).resolve().parent / "build-hotspots-json.py"
spec = importlib.util.spec_from_file_location("build_hotspots_json", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

jpg = sys.argv[1]
keys_path = sys.argv[2]

with open(keys_path, encoding="utf-8") as handle:
    keys = json.load(handle)

ink, w, h = module.load_ink(jpg)
horizontals = module.major_horizontal_lines(ink, w, h)
boxes = module.build_boxes(ink, w, h, keys)
refined = module.refine_hotspot_boxes(ink, w, h, boxes)
print(json.dumps(refined, indent=2))

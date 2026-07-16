"""
Convert page 1 of a vector kitchen plan PDF to a self-contained SVG for a razor-sharp,
infinitely scalable plan in the configurator.

Part of the "build a kitchen from PDF + Excel" workflow (see kitchen-from-pdf-agent-guide.md).

Usage:
    python docs/render-plan-svg.py "frontend/public/pdfs/<plan>.pdf" "frontend/public/plans/<plan>.svg"

Requires PyMuPDF (`pip install pymupdf`). text_as_path=True bakes glyphs into vector paths so
the SVG renders identically in an <img> tag regardless of available fonts. The output keeps the
PDF page's viewBox, so the %-based hotspot overlay (docs/detect-plan-hotspots.py) still aligns.
Only works when the PDF is genuine vector linework (not a scanned raster).
"""
import re
import sys
import fitz  # PyMuPDF

HAIRLINE_STROKE_WIDTH = 1
MAJOR_STROKE_WIDTH = 6
MINOR_STROKE_WIDTH = 4


def normalize_plan_svg_strokes(svg: str) -> str:
    """Boost hairline PDF strokes so exported plans match the visual weight of thicker CAD exports."""
    # Appliance symbols can intentionally use a pale CAD gray. Keep that source
    # distinction instead of flattening every stroke to black (for example, the
    # integrated-dishwasher basket in AB 105748 is RGB 240/240/240).
    def normalize_stroke_color(match: re.Match[str]) -> str:
        color = match.group(1).lower()
        if color == "#f0f0f0":
            return 'stroke="#f0f0f0"'
        return 'stroke="#000000"'

    svg = re.sub(
        r'stroke="(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})"',
        normalize_stroke_color,
        svg,
    )

    def boost_black_stroke(match: re.Match[str]) -> str:
        path = match.group(0)
        if 'stroke="#000000"' not in path and 'stroke="#000"' not in path:
            return path
        path = path.replace(f'stroke-width="{HAIRLINE_STROKE_WIDTH}"', f'stroke-width="{MAJOR_STROKE_WIDTH}"')
        path = path.replace('stroke-width="2"', f'stroke-width="{MINOR_STROKE_WIDTH}"')
        path = path.replace('stroke-width="3"', f'stroke-width="{MINOR_STROKE_WIDTH}"')
        return path

    return re.sub(r"<path\b[^>]*?/>", boost_black_stroke, svg, flags=re.DOTALL)


if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(1)

src, out = sys.argv[1], sys.argv[2]
doc = fitz.open(src)
page = doc[0]
svg = normalize_plan_svg_strokes(page.get_svg_image(text_as_path=True))
with open(out, "w", encoding="utf-8") as f:
    f.write(svg)
print(f"{out}: {len(svg)} bytes, page {page.rect.width:.0f}x{page.rect.height:.0f}")

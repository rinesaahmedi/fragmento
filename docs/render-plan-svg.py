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
import sys
import fitz  # PyMuPDF

if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(1)

src, out = sys.argv[1], sys.argv[2]
doc = fitz.open(src)
page = doc[0]
svg = page.get_svg_image(text_as_path=True)
with open(out, "w", encoding="utf-8") as f:
    f.write(svg)
print(f"{out}: {len(svg)} bytes, page {page.rect.width:.0f}x{page.rect.height:.0f}")

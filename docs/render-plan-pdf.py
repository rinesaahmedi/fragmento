"""
Render page 1 of a kitchen plan PDF to a JPEG for the configurator's image plan.

Part of the "build a kitchen from PDF + Excel" workflow (see kitchen-from-pdf-agent-guide.md).

Usage:
    python docs/render-plan-pdf.py "frontend/public/pdfs/<plan>.pdf" "frontend/public/jpg/<plan>_page-0001.jpg" [scale]

scale defaults to ~4.1667 (≈300 DPI for an A4 page). Higher scale = sharper/larger image.
The CAD vector PDFs in this repo render to clean black-on-white linework, which the hotspot
detector (docs/detect-plan-hotspots.py) can then edge-detect for pixel-perfect hotspots.
"""
import sys
import pypdfium2 as pdfium

if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(1)

src, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 4.1667

pdf = pdfium.PdfDocument(src)
page = pdf[0]
w_pt, h_pt = page.get_size()
pil = page.render(scale=scale).to_pil().convert("RGB")
pil.save(out, quality=92)
print(f"pages={len(pdf)} page_pt={w_pt:.1f}x{h_pt:.1f} -> {pil.size[0]}x{pil.size[1]} saved {out}")

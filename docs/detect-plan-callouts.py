"""
Extract callout number positions from a kitchen plan PDF.

Callout numbers (e.g. 1–14) are printed as white text on the plan elevation;
they correspond directly to the NR column in the supplier Excel sheet.
This script reads the PDF text layer and returns each callout's centre position
as a percentage of the page width/height.

Usage:
    python docs/detect-plan-callouts.py <plan.pdf>

Prints a JSON array of { nr, xPct, yPct } sorted by nr, one entry per callout.
Returns an empty array [] if no callout numbers are found (e.g. for PDFs that
embed them as vector art rather than a text layer).
"""

import json
import sys

import fitz  # PyMuPDF

# Callout numbers are typically 1–20 in these kitchen plans.
MIN_NR = 1
MAX_NR = 20

# Font size range that distinguishes callout numbers from dimension labels
# (dimension labels are smaller, ~10–11 pt; callouts are ~14–16 pt).
MIN_CALLOUT_SIZE = 11.5
MAX_CALLOUT_SIZE = 22.0

# Callout numbers live inside the plan elevation, not in the title block at the
# very bottom of the page (>90 % vertical).
MAX_Y_PCT = 90.0


def extract_callouts(pdf_path):
    doc = fitz.open(pdf_path)
    page = doc[0]
    pw, ph = page.rect.width, page.rect.height

    callouts = {}

    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "").strip()
                if not text.isdigit():
                    continue
                nr = int(text)
                if not (MIN_NR <= nr <= MAX_NR):
                    continue
                size = span.get("size", 0)
                if not (MIN_CALLOUT_SIZE <= size <= MAX_CALLOUT_SIZE):
                    continue
                x0, y0, x1, y1 = span["bbox"]
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                y_pct = 100 * cy / ph
                if y_pct > MAX_Y_PCT:
                    continue
                # Keep the first occurrence of each nr (spans are ordered top-to-bottom).
                if nr not in callouts:
                    callouts[nr] = {
                        "nr": nr,
                        "xPct": round(100 * cx / pw, 2),
                        "yPct": round(y_pct, 2),
                    }

    doc.close()
    return sorted(callouts.values(), key=lambda c: c["nr"])


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)

    pdf_path = sys.argv[1]
    callouts = extract_callouts(pdf_path)
    json.dump(callouts, sys.stdout)


if __name__ == "__main__":
    main()

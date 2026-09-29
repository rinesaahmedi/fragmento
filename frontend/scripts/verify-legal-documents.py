"""Compare the accepted Word text to published German terms and render PDF QA.

Usage: python scripts/verify-legal-documents.py <source.docx> <qa-output-directory>
Requires PyMuPDF for PDF extraction and rendering.
"""
import difflib
import json
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

import fitz

root = Path(__file__).resolve().parents[1]
result = subprocess.run(
    ["node", "--input-type=module", "-e", "import {getTermsAndConditions} from './lib/terms-and-conditions.js'; console.log(JSON.stringify(getTermsAndConditions('de')));"],
    cwd=root, capture_output=True, text=True, encoding="utf-8", check=True,
)
terms = json.loads(result.stdout)
with zipfile.ZipFile(sys.argv[1]) as archive:
    xml = ET.fromstring(archive.read("word/document.xml"))
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
for parent in xml.iter():
    for child in list(parent):
        if child.tag == f"{{{ns['w']}}}del":
            parent.remove(child)
paragraphs = ["".join(t.text or "" for t in p.findall(".//w:t", ns)) for p in xml.findall(".//w:body/w:p", ns)]
source = " ".join(paragraphs)
source = source.replace("unter [Internetadresse/URL oder anderen geeigneten Hinweis darüber eingeben, wo die Widerrufsfunktion verfügbar ist]", "über die Funktion „Vertrag widerrufen“ im Fußbereich der Fragmento-Website (/widerruf)")
source = source.replace("[BITTE HIER URL EINFÜGEN]", "/legal/muster-widerrufsformular.pdf")
published = [terms["title"], terms["subtitle"], terms["effectiveDate"]]
for section in terms["sections"]:
    published.extend([section["title"], *section["paragraphs"]])
    if section.get("callout"):
        published.extend([section["callout"]["title"], *section["callout"]["paragraphs"]])
    if section.get("note"):
        published.append(section["note"])
def tokens(value):
    return re.sub(r"\s+", " ", value).strip().casefold().split()
source_tokens = tokens(source)
published_tokens = tokens(" ".join(published))
matcher = difflib.SequenceMatcher(None, source_tokens, published_tokens, autojunk=False)
differences = []
for op, a, b, c, d in matcher.get_opcodes():
    if op != "equal":
        differences.append({"operation": op, "source": " ".join(source_tokens[a:b]), "website": " ".join(published_tokens[c:d])})
print("Word comparison (excluding tracked deletions and replacing the two URL placeholders):")
print(json.dumps(differences, ensure_ascii=False, indent=2))
assert len(terms["sections"]) == 17
qa = Path(sys.argv[2])
qa.mkdir(parents=True, exist_ok=True)
for name in ["architecto-agb-2026-08", "muster-widerrufsformular"]:
    pdf = fitz.open(root / "public/legal" / f"{name}.pdf")
    text = " ".join(page.get_text() for page in pdf)
    assert "BITTE HIER" not in text and "Internetadresse/URL" not in text
    for i, page in enumerate(pdf):
        page.get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(qa / f"{name}-{i+1}.png")
        for block in page.get_text("blocks"):
            assert block[0] >= 0 and block[1] >= 0 and block[2] <= page.rect.width + 1 and block[3] <= page.rect.height + 1, (name, i, block)
    if name.startswith("architecto"):
        normalized = tokens(text)
        for section in terms["sections"]:
            assert " ".join(tokens(section["title"])) in " ".join(normalized), section["title"]
    print(f"{name}: {len(pdf)} pages, page bounds and content checks passed.")
assert not differences, "Published terms differ from the supplied accepted Word text."

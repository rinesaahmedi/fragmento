import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";
import { getTermsAndConditions } from "../lib/terms-and-conditions.js";
import { FRAGMENTO_PUBLIC_ORIGIN, WITHDRAWAL_URL, WITHDRAWAL_FORM_PDF_URL } from "../lib/legal-links.js";

const outputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/legal");
// Default to the confirmed public domain so regenerated PDFs retain working links.
const originArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const siteOrigin = new URL(originArgument || FRAGMENTO_PUBLIC_ORIGIN).origin;
const terms = getTermsAndConditions("de");
const doc = new jsPDF({ format: "a4", unit: "mm" });
const margin = 20;
const width = 170;
let y = 23;

function paragraph(value, { size = 10, bold = false, space = 3 } = {}) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(35, 35, 35);
  const content = value.replace(WITHDRAWAL_FORM_PDF_URL, `${siteOrigin}${WITHDRAWAL_FORM_PDF_URL}`).replace(/\(\/widerruf\)/g, `(${siteOrigin}${WITHDRAWAL_URL})`);
  const lines = doc.splitTextToSize(content, width);
  const lineHeight = size * 0.3528 * 1.4;
  // Keep headings with at least two lines of following text.
  if (bold && y + lines.length * lineHeight + 12 > 274) { doc.addPage(); y = 23; }
  for (const line of lines) {
    if (y + lineHeight > 274) { doc.addPage(); y = 23; }
    doc.text(line, margin, y);
    for (const match of line.matchAll(/https:\/\/[^\s)]+/g)) {
      doc.link(margin + doc.getTextWidth(line.slice(0, match.index)), y - size * 0.3528,
        doc.getTextWidth(match[0]), lineHeight, { url: match[0] });
    }
    y += lineHeight;
  }
  y += space;
}

paragraph(terms.title, { size: 19, bold: true });
paragraph(terms.subtitle, { size: 11 });
paragraph(terms.effectiveDate, { size: 9, space: 7 });
for (const [index, section] of terms.sections.entries()) {
  paragraph(`${index + 1}. ${section.title}`, { size: 12, bold: true, space: 4 });
  for (const text of section.paragraphs) paragraph(text);
  if (section.callout) {
    paragraph(section.callout.title, { size: 11, bold: true });
    for (const text of section.callout.paragraphs) paragraph(text);
  }
  if (section.note) paragraph(section.note);
  y += 4;
}
for (let page = 1; page <= doc.getNumberOfPages(); page++) {
  doc.setPage(page);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`architecto | AGB | ${terms.effectiveDate}`, margin, 286);
  doc.text(`${page} / ${doc.getNumberOfPages()}`, 190, 286, { align: "right" });
}
doc.setProperties({ title: `${terms.title} - ${terms.effectiveDate}`, author: "architecto" });
fs.mkdirSync(outputDir, { recursive: true });
const termsBytes = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(path.join(outputDir, "architecto-agb-2026-08.pdf"), termsBytes);
// Keep previously distributed URLs current; the explicitly dated May archive stays intact.
fs.writeFileSync(path.join(outputDir, "architecto-agb-2026.pdf"), termsBytes);
if (process.argv.includes("--terms-only")) {
  console.log(`Generated both AGB copies with clickable links to ${siteOrigin}.`);
  process.exit(0);
}

const form = new jsPDF({ format: "a4", unit: "mm" });
form.setProperties({ title: "Muster-Widerrufsformular", author: "architecto" });
form.setFont("helvetica", "bold");
form.setFontSize(19);
form.text("Muster-Widerrufsformular", 20, 26);
form.setFont("helvetica", "normal");
form.setFontSize(10);
form.text(form.splitTextToSize("Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.", 170), 20, 36);
form.setFont("helvetica", "bold");
form.text("An:", 20, 55);
form.setFont("helvetica", "normal");
form.text(["architecto by KA GmbH", "Senefelderstraße 2b", "38124 Braunschweig", "E-Mail: info@myarchitecto.de"], 20, 62, { lineHeightFactor: 1.45 });
form.text(form.splitTextToSize("Hiermit widerrufe ich / widerrufen wir den abgeschlossenen Vertrag über den Kauf der folgenden Waren / die Erbringung der folgenden Dienstleistung:", 170), 20, 92);
function field(label, top, lines = 1) {
  form.setFont("helvetica", "bold");
  form.text(label, 20, top);
  form.setDrawColor(150, 150, 150);
  form.setLineWidth(0.2);
  for (let i = 0; i < lines; i++) form.line(20, top + 12 + i * 10, 190, top + 12 + i * 10);
}
field("Waren / Dienstleistung", 110, 2);
field("Bestellt am / erhalten am", 144);
field("Name des / der Verbraucher(s)", 169);
field("Anschrift des / der Verbraucher(s)", 194, 2);
field("Grund des Widerrufs (freiwillig)", 229, 2);
field("Datum", 264);
fs.writeFileSync(path.join(outputDir, "muster-widerrufsformular.pdf"), Buffer.from(form.output("arraybuffer")));
console.log(`Generated German AGB (${doc.getNumberOfPages()} pages), compatibility copy, and withdrawal form (1 page).`);

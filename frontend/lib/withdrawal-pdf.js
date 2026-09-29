import { jsPDF } from "jspdf";

// Generate from the persisted API snapshot, including on duplicate submissions.
export function createWithdrawalPdf(request) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 24;
  function write(value, bold = false, size = 10) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(value || "Nicht angegeben"), 170);
    for (const line of lines) {
      if (y > 274) { doc.addPage(); y = 24; }
      doc.text(line, 20, y);
      y += size * 0.5;
    }
    y += 4;
  }
  const date = (value) => value ? new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(new Date(value)) : "Nicht angegeben";
  write("Widerrufsbestätigung", true, 18);
  write("architecto by KA GmbH\nSenefelderstraße 2b\n38124 Braunschweig\nE-Mail: info@myarchitecto.de");
  write("Widerrufserklärung", true, 12);
  write(request.declarationText);
  for (const [label, value] of [
    ["Widerrufsreferenz", request.referenceNumber],
    ["Vertragsnummer", request.submittedContractNumber],
    ["Name des/der Verbraucher(s)", request.consumerName],
    ["Anschrift", request.consumerAddress],
    ["E-Mail-Adresse", request.confirmationEmail],
    ["Bestellt am", date(request.orderedOn)],
    ["Erhalten am", date(request.receivedOn)],
    ["Waren / Dienstleistung", request.productDescription],
    ["Eingang (Datum und Uhrzeit)", new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium", timeStyle: "long", timeZone: "Europe/Berlin",
    }).format(new Date(request.receivedAt))],
  ]) { write(label, true); write(value); }
  doc.setProperties({ title: `Widerruf ${request.referenceNumber}`, author: "Fragmento" });
  return doc;
}

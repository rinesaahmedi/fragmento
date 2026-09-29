import assert from "node:assert/strict";
import { getTermsAndConditions } from "../lib/terms-and-conditions.js";
import { ARCHITECTO_PRIVACY_URL, AGB_PDF_URL, WITHDRAWAL_FORM_PDF_URL } from "../lib/legal-links.js";

const base = process.argv[2] || "http://localhost:3001";
for (const language of ["de", "en", "es", "fr", "ru", "tr"]) {
  const terms = getTermsAndConditions(language);
  assert.equal(terms.sections.length, 17);
  const withdrawal = terms.sections[4].callout.paragraphs.join("\n");
  assert.ok(withdrawal.includes("/widerruf"));
  assert.ok(withdrawal.includes(WITHDRAWAL_FORM_PDF_URL));
  const response = await fetch(`${base}/agb?lang=${language}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`href="${AGB_PDF_URL}"`));
  assert.ok(html.includes(`href="${WITHDRAWAL_FORM_PDF_URL}"`));
  assert.ok(html.includes('href="/widerruf?lang='));
  assert.ok(!html.includes("BITTE HIER URL") && !html.includes("Internetadresse/URL"));
  const privacy = await fetch(`${base}/datenschutz?lang=${language}`);
  assert.equal(privacy.status, 200);
  const privacyHtml = await privacy.text();
  assert.ok(privacyHtml.includes(`href="${ARCHITECTO_PRIVACY_URL}"`));
  console.log(`${language}: AGB, withdrawal links, PDF link and privacy link passed.`);
}
for (const url of [AGB_PDF_URL, WITHDRAWAL_FORM_PDF_URL, "/legal/architecto-agb-2026.pdf"]) {
  const response = await fetch(`${base}${url}`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type").includes("application/pdf"));
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  console.log(`${url}: downloadable PDF passed (${bytes.length} bytes).`);
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrderConfirmationEmailStaticHtml,
  buildOrderSummaryHtml,
} from "../lib/email/order-notifications.js";

test("order confirmation summary renders blende as a separate product row", () => {
  const order = {
    orderNumber: "FRG-TEST-001",
    total: 244,
    kitchen: {
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-100",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "OVEN-B-600-HOB",
        name: "Built-in oven and induction hob",
        price: 0,
        productInfoPdfPath: "legal/architecto-agb-2026.pdf",
      },
      {
        code: "CAB-BASE-1",
        articleNumber: "US50",
        name: "Base cabinet",
        nameDe: "Unterschrank mit Schubkasten",
        iconKey: "drawer_base_two",
        componentKey: "base-module-1",
        price: 244,
        blendeCode: "UPK20",
        blendeLabel: "UPK20 20 cm",
        blendePrice: 25,
      },
      {
        code: "SINK-WORKTOP",
        name: "Worktop",
        price: 0,
        productInfoPdfPath: "legal/architecto-agb-2026.pdf",
      },
      {
        code: "DISH-AB105806-600",
        articleNumber: "A-EGSPV597210 + TGV60",
        name: "Fully integrated dishwasher",
        nameDe: "Vollintegrierter Geschirrspueler",
        iconKey: "dishwasher_base",
        componentKey: "dishwasher-base",
        price: 579,
        productInfoPdfPath: "legal/architecto-agb-2026-05.pdf",
      },
    ],
    accessories: [],
    services: [],
  };

  const html = buildOrderSummaryHtml(order);
  const electricalSectionIndex = html.indexOf("Neu bestaetigte Elektrogeraete");
  const cabinetSectionIndex = html.indexOf("Neu bestaetigte Kuechenmoebel");
  const dishwasherIndex = html.indexOf("Vollintegrierter Geschirrspueler");
  const cabinetIndex = html.indexOf("Unterschrank mit Schubkasten");

  assert.equal(html.includes("Neu bestaetigte Komponenten"), false);
  assert.ok(electricalSectionIndex > -1);
  assert.ok(cabinetSectionIndex > electricalSectionIndex);
  assert.ok(dishwasherIndex > electricalSectionIndex && dishwasherIndex < cabinetSectionIndex);
  assert.ok(cabinetIndex > cabinetSectionIndex);
  assert.ok(cabinetIndex < html.indexOf("Blende UPK20 20 cm"));
  assert.match(html, /<th[^>]*>Nr\.<\/th>/);
  assert.match(html, /<td[^>]*>1<\/td><td[\s\S]*?Vollintegrierter Geschirrspueler/);
  assert.match(html, /<td[^>]*>1<\/td><td[\s\S]*?Unterschrank mit Schubkasten/);
  assert.match(html, /<td[^>]*>2<\/td><td[\s\S]*?Blende UPK20 20 cm/);
  assert.doesNotMatch(html, /Base cabinet/);
  assert.doesNotMatch(html, /Fully integrated dishwasher/);
  assert.match(html, /Vollintegrierter Geschirrspueler/);
  assert.doesNotMatch(html, /Demo Kitchen/);
  assert.doesNotMatch(html, /OVEN-B-600-HOB/);
  assert.doesNotMatch(html, /SINK-WORKTOP/);
  assert.doesNotMatch(html, /Built-in oven and induction hob/);
  assert.doesNotMatch(html, /Worktop/);
  assert.match(html, /Code: US50/);
  assert.match(html, /Code: A-EGSPV597210 \+ TGV60/);
  assert.doesNotMatch(html, /Code: CAB-BASE-1/);
  assert.doesNotMatch(html, /Code: DISH-AB105806-600/);
  assert.match(html, /Auftragsnummer/);
  assert.match(html, /Vertragsnummer/);
  assert.match(html, /Code: UPK20/);
  assert.match(html, /Gewuenschter Liefertermin/);
  assert.match(html, /15\.07\.2026/);
  assert.match(html, /219/);
  assert.match(html, /25/);
  assert.match(html, /244/);
});

test("order confirmation product-info attachments exclude default zero-price items", async () => {
  const order = {
    orderNumber: "FRG-TEST-002",
    total: 579,
    kitchen: {
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-101",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "OVEN-B-600-HOB",
        name: "Built-in oven and induction hob",
        price: 0,
        productInfoPdfPath: "legal/architecto-agb-2026.pdf",
      },
      {
        code: "DISH-AB105806-600",
        name: "Fully integrated dishwasher",
        nameDe: "Vollintegrierter Geschirrspueler",
        price: 579,
        productInfoPdfPath: "legal/architecto-agb-2026-05.pdf",
      },
      {
        code: "REF-AB105806-KGCN388140E",
        name: "Freestanding refrigerator 178cm",
        nameDe: "Standkuehlschrank 178 cm",
        price: 579,
        productInfoPdfPath: "legal/architecto-agb-2026.pdf",
      },
    ],
    accessories: [],
    services: [],
  };

  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);

  assert.deepEqual(staticHtml.attachmentLabels, ["Vollintegrierter Geschirrspueler", "Standkuehlschrank 178 cm"]);
  assert.match(staticHtml.html, /Produktinformationen im Anhang:/);
  assert.match(staticHtml.html, /<ul[^>]*>/);
  assert.match(staticHtml.html, /<li[^>]*>Vollintegrierter Geschirrspueler<\/li>/);
  assert.match(staticHtml.html, /<li[^>]*>Standkuehlschrank 178 cm<\/li>/);
  assert.equal(staticHtml.html.includes("Fully integrated dishwasher"), false);
  assert.equal(staticHtml.html.includes("Freestanding refrigerator 178cm"), false);
  assert.equal(staticHtml.html.includes("Built-in oven and induction hob"), false);
});

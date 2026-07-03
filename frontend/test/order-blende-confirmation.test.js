import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrderConfirmationRecipients,
  buildOrderConfirmationEmailStaticHtml,
  buildOrderSummaryHtml,
} from "../lib/email/order-notifications.js";

test("order confirmation recipients include the sender as a copy", () => {
  assert.deepEqual(
    buildOrderConfirmationRecipients("343@gmail.com", "315@gmail.com"),
    { to: "343@gmail.com", cc: "315@gmail.com" },
  );
  assert.deepEqual(
    buildOrderConfirmationRecipients("315@gmail.com", "315@gmail.com"),
    { to: "315@gmail.com" },
  );
});
import { getPreferredDeliveryDateAfterWeeks } from "../lib/preferred-delivery.js";

test("preferred delivery week dates move weekends to Monday", () => {
  assert.equal(getPreferredDeliveryDateAfterWeeks(4, "2026-07-05"), "2026-08-03");
});

test("order confirmation summary renders blende as a cabinet subtitle", () => {
  const order = {
    orderNumber: "FRG-TEST-001",
    createdAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T10:00:00.000Z",
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
        nameDe: "Vollintegrierter Geschirrspüler",
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
  const electricalSectionIndex = html.indexOf("Neu bestätigte Elektrogeräte");
  const cabinetSectionIndex = html.indexOf("Neu bestätigte Küchenmöbel");
  const dishwasherIndex = html.indexOf("Vollintegrierter Geschirrspüler");
  const cabinetIndex = html.indexOf("Unterschrank mit Schubkasten");

  assert.equal(html.includes("Neu bestätigte Komponenten"), false);
  assert.ok(electricalSectionIndex > -1);
  assert.ok(cabinetSectionIndex > -1);
  assert.ok(cabinetSectionIndex < electricalSectionIndex);
  assert.ok(cabinetIndex > cabinetSectionIndex && cabinetIndex < electricalSectionIndex);
  assert.ok(dishwasherIndex > electricalSectionIndex);
  assert.ok(cabinetIndex < html.indexOf("Blende UPK20 20 cm"));
  assert.match(html, /<th[^>]*>Nr\.<\/th>/);
  assert.match(html, /<td[^>]*>[\s\S]*?1[\s\S]*?<\/td><td[\s\S]*?Vollintegrierter Geschirrspüler/);
  assert.match(html, /<tr><td[^>]*>1<\/td><td[\s\S]*?Unterschrank mit Schubkasten[\s\S]*?<\/td><td[\s\S]*?219/);
  assert.match(html, /<tr><td[^>]*>1\.1<\/td><td[\s\S]*?Blende UPK20 20 cm[\s\S]*?Typen-Nr\.: UPK20[\s\S]*?<\/td><td[\s\S]*?25/);
  assert.doesNotMatch(html, /<div style="margin-top:8px;">Blende UPK20 20 cm/);
  assert.doesNotMatch(html, /margin-top:8px;font-size:12px;color:#777;">Blende/);
  assert.doesNotMatch(html, /margin-top:8px;font-size:12px;color:#777;">25/);
  assert.doesNotMatch(html, /Base cabinet/);
  assert.doesNotMatch(html, /Fully integrated dishwasher/);
  assert.match(html, /Vollintegrierter Geschirrspüler/);
  assert.doesNotMatch(html, /Demo Kitchen/);
  assert.doesNotMatch(html, /OVEN-B-600-HOB/);
  assert.doesNotMatch(html, /SINK-WORKTOP/);
  assert.doesNotMatch(html, /Built-in oven and induction hob/);
  assert.doesNotMatch(html, /Worktop/);
  assert.match(html, /Typen-Nr\.: US50/);
  assert.match(html, /Typen-Nr\.: A-EGSPV597210 \+ TGV60/);
  assert.doesNotMatch(html, /Typen-Nr\.: CAB-BASE-1/);
  assert.doesNotMatch(html, /Typen-Nr\.: DISH-AB105806-600/);
  assert.match(html, /Auftragsnummer/);
  assert.match(html, /Vertragsnummer/);
  assert.match(html, /Typen-Nr\.: UPK20/);
  assert.match(html, /Wunschlieferwoche/);
  assert.match(html, /Nach 2 Wochen \(15\.07\.2026\)/);
  assert.match(html, /219/);
  assert.match(html, /25/);
  assert.match(html, /244/);
});

test("order confirmation groups multiple blendes under their parent cabinet", () => {
  const order = {
    orderNumber: "FRG-TEST-003",
    total: 269,
    kitchen: {
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-102",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "CAB-BASE-2",
        articleNumber: "US60",
        name: "Base cabinet with drawer",
        nameDe: "Unterschrank mit Schublade 60",
        iconKey: "drawer_base_two",
        componentKey: "base-module-2",
        price: 269,
        blendeCode: "UPK20 x2",
        blendeLabel: "UPK20 20 cm x 2",
        blendePrice: 50,
      },
    ],
    accessories: [],
    services: [],
  };

  const html = buildOrderSummaryHtml(order);

  assert.match(html, /<td[^>]*>[\s\S]*?1[\s\S]*?<\/td><td[\s\S]*?Unterschrank mit Schublade 60/);
  assert.match(html, /<tr><td[^>]*>1\.1<\/td><td[\s\S]*?Blende UPK20 20 cm x 2[\s\S]*?Typen-Nr\.: UPK20[\s\S]*?<\/td><td[\s\S]*?50/);
  assert.doesNotMatch(html, /1\.2[\s\S]*?Blende UPK20 20 cm/);
  assert.match(html, /Typen-Nr\.: UPK20/);
  assert.doesNotMatch(html, /UPK20 x2/);
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
        nameDe: "Vollintegrierter Geschirrspüler",
        price: 579,
        productInfoPdfPath: "legal/architecto-agb-2026-05.pdf",
      },
      {
        code: "REF-AB105806-KGCN388140E",
        name: "Freestanding refrigerator 178 cm",
        nameDe: "Standkühlschrank 178 cm",
        price: 579,
        productInfoPdfPath: "legal/architecto-agb-2026.pdf",
      },
    ],
    accessories: [
      {
        code: "ACC-CUTLERY-ZB60SG",
        articleNumber: "ZB60SG",
        name: "Cutlery insert 60 cm",
        nameDe: "Besteckeinsatz 60 cm",
        price: 75,
        quantity: 3,
      },
    ],
    services: [],
  };

  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);

  assert.deepEqual(staticHtml.attachmentLabels, ["Vollintegrierter Geschirrspüler", "Standkühlschrank 178 cm"]);
  assert.match(staticHtml.html, /Produktinformationen im Anhang:/);
  assert.match(staticHtml.html, /<ul[^>]*>/);
  assert.match(staticHtml.html, /<li[^>]*>Vollintegrierter Geschirrspüler<\/li>/);
  assert.match(staticHtml.html, /<li[^>]*>Standkühlschrank 178 cm<\/li>/);
  assert.match(staticHtml.html, /Neu bestätigtes Zubehör/);
  assert.match(staticHtml.html, /Besteckeinsatz 60 cm x 3/);
  assert.match(staticHtml.html, /Typen-Nr\.: ZB60SG/);
  assert.equal(staticHtml.html.includes("Fully integrated dishwasher"), false);
  assert.equal(staticHtml.html.includes("Freestanding refrigerator 178 cm"), false);
  assert.equal(staticHtml.html.includes("Built-in oven and induction hob"), false);
});

test("order confirmation product-info attachments include dishwasher and extractor hood fallbacks", async () => {
  const order = {
    orderNumber: "FRG-TEST-004",
    total: 1178,
    kitchen: {
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-103",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "DISH-AB105806-600",
        name: "Fully integrated dishwasher",
        nameDe: "Vollintegrierter GeschirrspÃ¼ler",
        iconKey: "dishwasher_base",
        price: 579,
      },
      {
        code: "CAB-HOOD-AB105806-600",
        name: "Upper Cabinet with Extractor Hood 60",
        nameDe: "Oberschrank fÃ¼r Flachschirmhaube, 60 cm",
        iconKey: "hood_wall_cabinet",
        componentKey: "extractor-hood",
        price: 599,
      },
    ],
    accessories: [],
    services: [],
  };

  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);

  assert.deepEqual(staticHtml.attachmentLabels, [
    "Vollintegrierter GeschirrspÃ¼ler",
    "Oberschrank fÃ¼r Flachschirmhaube, 60 cm",
  ]);
  assert.match(staticHtml.html, /Produktinformationen im Anhang:/);
  assert.match(staticHtml.html, /Vollintegrierter GeschirrspÃ¼ler/);
  assert.match(staticHtml.html, /Oberschrank fÃ¼r Flachschirmhaube, 60 cm/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildPurchasedKitchenOverlaySvg,
  buildOrderConfirmationRecipients,
  buildOrderConfirmationEmailPreview,
  buildOrderConfirmationEmailStaticHtml,
  buildOrderSummaryHtml,
  generateOrderConfirmationPdf,
  generatePurchasedKitchenPdf,
  loadKitchenPlanPreviewData,
  preparePurchasedKitchenPlanGeometry,
} from "../lib/email/order-notifications.js";
import {
  getPlanDisplayCrop,
  prepareKitchenPlanGeometry,
} from "../lib/kitchen-plan-geometry.js";
import { PLAN_HOTSPOTS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";

async function extractPdfText(base64) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(base64, "base64") });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

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

test("test order confirmation recipients do not include the sender copy", () => {
  assert.deepEqual(
    buildOrderConfirmationRecipients("343@gmail.com", "315@gmail.com", { suppressSenderCopy: true }),
    { to: "343@gmail.com" },
  );
});

test("test order confirmation preview does not include the sender copy", async () => {
  const preview = await buildOrderConfirmationEmailPreview(
    {
      orderNumber: "111123456-1",
      total: 0,
      createdAt: "2026-07-01T10:00:00.000Z",
      kitchen: {
        name: "PX Test Kitchen",
      },
      customer: {
        contractNumber: "111123456",
        firstName: "Test",
        lastName: "Customer",
        email: "customer@example.com",
        preferredDeliveryDate: "2026-07-15",
      },
      components: [],
      accessories: [],
      services: [],
    },
    { senderEmail: "sender@example.com" },
  );

  assert.equal(preview.to, "customer@example.com");
  assert.equal(preview.cc, undefined);
});
import { getPreferredDeliveryDateAfterWeeks } from "../lib/preferred-delivery.js";

test("preferred delivery week dates move weekends to Monday", () => {
  assert.equal(getPreferredDeliveryDateAfterWeeks(4, "2026-07-05"), "2026-08-03");
});

test("order confirmation can generate purchased kitchen sketch attachment", async () => {
  const pdf = await generatePurchasedKitchenPdf({
    orderNumber: "FRG-TEST-005",
    createdAt: "2026-07-01T10:00:00.000Z",
    kitchen: {
      slug: "ab-105806",
      name: "AB 105806 Kitchen",
    },
    customer: {
      contractNumber: "670105806",
    },
  });

  assert.ok(pdf);
  assert.equal(pdf.filename, "Gekaufte-Kueche-FRG-TEST-005.pdf");
  const bytes = Buffer.from(pdf.base64, "base64");
  assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
  assert.ok(bytes.length > 10000);

  const text = await extractPdfText(pdf.base64);
  assert.doesNotMatch(text, /AB 105806 Kitchen/);
  assert.match(text, /Bestellnummer/);
});

test("AB 105830 purchased-kitchen selection reaches the same plinth line as the configurator", async () => {
  const previewData = await loadKitchenPlanPreviewData();
  const source = previewData.hotspotsBySlug["ab-105830"] || [];
  const rawOven = source.find((hotspot) => hotspot.componentKey === "oven-module");
  const { hotspots } = preparePurchasedKitchenPlanGeometry(
    { kitchen: { slug: "ab-105830" }, components: [] },
    source,
  );
  const emailOven = hotspots.find((hotspot) => hotspot.componentKey === "oven-module");

  assert.ok(rawOven);
  assert.ok(emailOven);
  assert.ok(emailOven.height > rawOven.height);
  assert.equal(emailOven.top + emailOven.height, 84.73);
});

test("AB 105830 confirmation overlay paints the selected oven through the plinth", async () => {
  const previewData = await loadKitchenPlanPreviewData();
  const source = previewData.hotspotsBySlug["ab-105830"] || [];
  const order = {
    kitchen: { slug: "ab-105830" },
    components: [{ componentKey: "oven-module", isLocked: true }],
  };
  const { hotspots, crop } = preparePurchasedKitchenPlanGeometry(order, source);
  const width = 1000;
  const height = 800;
  const overlay = buildPurchasedKitchenOverlaySvg({ order, hotspots, crop, width, height });
  const markup = overlay.toString("utf8");
  const lockedFill = 'fill="rgba(37,99,235,0.26)"';
  const oven = hotspots.find((hotspot) => hotspot.componentKey === "oven-module");
  const expectedX = ((oven.left - crop.left) / crop.width) * width;
  const expectedY = ((oven.top - crop.top) / crop.height) * height;
  const expectedWidth = (oven.width / crop.width) * width;
  const expectedHeight = (oven.height / crop.height) * height;
  const expectedRect = `<rect x="${expectedX}" y="${expectedY}" width="${expectedWidth}" height="${expectedHeight}" rx="8" ry="8" ${lockedFill}`;

  assert.ok(overlay);
  assert.ok(markup.includes(expectedRect));
  assert.ok(Math.abs(expectedY + expectedHeight - ((84.73 - crop.top) / crop.height) * height) < 0.000001);
});

test("configurator and confirmation renderer stay wired to shared plan geometry", () => {
  const stageSource = fs.readFileSync(
    new URL("../components/kitchen-svg-stage.jsx", import.meta.url),
    "utf8",
  );
  const emailSource = fs.readFileSync(
    new URL("../lib/email/order-notifications.js", import.meta.url),
    "utf8",
  );

  assert.match(stageSource, /const definitions = prepareKitchenPlanGeometry\(/);
  assert.match(stageSource, /getSharedPlanDisplayCrop\(imageHotspots, normalizedKitchenSlug\)/);
  assert.match(emailSource, /const hotspots = prepareKitchenPlanGeometry\(sourceHotspots, slug/);
  assert.match(emailSource, /crop: getPlanDisplayCrop\(hotspots, slug\)/);
  assert.doesNotMatch(emailSource, /function getKitchenPlanDisplayCrop\(/);
});

test("every AB purchased-kitchen preview uses configurator geometry and crop", async () => {
  const previewData = await loadKitchenPlanPreviewData();
  const abSlugs = Object.keys(previewData.hotspotsBySlug)
    .filter((slug) => slug.startsWith("ab-") && previewData.hotspotsBySlug[slug]?.length)
    .sort();

  assert.ok(abSlugs.length > 0);
  assert.deepEqual(
    abSlugs,
    Object.keys(PLAN_HOTSPOTS_BY_SLUG)
      .filter((slug) => slug.startsWith("ab-") && PLAN_HOTSPOTS_BY_SLUG[slug]?.length)
      .sort(),
  );
  for (const slug of abSlugs) {
    const source = previewData.hotspotsBySlug[slug];
    const components = [...new Set(source.map((hotspot) => hotspot.componentKey).filter(Boolean))]
      .map((componentKey) => ({ componentKey }));
    const expectedHotspots = prepareKitchenPlanGeometry(source, slug, components);
    const actual = preparePurchasedKitchenPlanGeometry(
      { kitchen: { slug }, components },
      source,
    );

    assert.deepEqual(actual.hotspots, expectedHotspots, `${slug} hotspot geometry must match`);
    assert.deepEqual(actual.crop, getPlanDisplayCrop(expectedHotspots, slug), `${slug} crop must match`);
  }
});

test("purchased kitchen preview keeps the optional sink-end blende green-selectable", async () => {
  const previewData = await loadKitchenPlanPreviewData();
  const hotspots = previewData.hotspotsBySlug["ab-105738"] || [];
  const sinkHotspots = hotspots.filter((hotspot) => hotspot.componentKey === "sink-base");
  const blendeHotspots = hotspots.filter((hotspot) => hotspot.componentKey === "sink-end-blende");

  assert.ok(sinkHotspots.length > 0);
  assert.equal(blendeHotspots.length, 1);
  assert.equal(blendeHotspots[0].left, 86.394299);
  assert.equal(blendeHotspots[0].width, 1.296912);
  assert.ok(
    sinkHotspots.every((hotspot) => hotspot.left + hotspot.width <= blendeHotspots[0].left),
    "the locked sink overlay must stop before the independently selected blende",
  );
});

test("purchased kitchen preview splits the AB 105823 aliased sink-end blende", async () => {
  const previewData = await loadKitchenPlanPreviewData();
  const hotspots = previewData.hotspotsBySlug["ab-105823"] || [];
  const sinkHotspots = hotspots.filter((hotspot) => hotspot.componentKey === "sink-base");
  const blendeHotspots = hotspots.filter((hotspot) => hotspot.componentKey === "sink-end-blende");

  assert.ok(sinkHotspots.length > 0);
  assert.equal(blendeHotspots.length, 1);
  assert.equal(blendeHotspots[0].left, 92.109264);
  assert.equal(blendeHotspots[0].width, 1.895487);
  assert.ok(
    sinkHotspots.every((hotspot) => hotspot.left + hotspot.width <= blendeHotspots[0].left),
    "AB 105823's locked sink overlay must stop before the independently selected green Blende",
  );
});

test("AB 105846 layout aliases attach their shared purchased-kitchen sketch", async () => {
  for (const kitchenCode of ["105849", "105852", "105855", "105858", "105861"]) {
    const pdf = await generatePurchasedKitchenPdf({
      orderNumber: `111${kitchenCode}-1`,
      createdAt: "2026-08-26T10:00:00.000Z",
      kitchen: {
        slug: `ab-${kitchenCode}`,
        name: kitchenCode,
      },
      customer: {
        contractNumber: `111${kitchenCode}`,
      },
      components: [],
      accessories: [],
      services: [],
    });

    assert.ok(pdf, `AB ${kitchenCode} should generate its sketch attachment`);
    assert.equal(pdf.filename, `Gekaufte-Kueche-111${kitchenCode}-1.pdf`);
    const bytes = Buffer.from(pdf.base64, "base64");
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
    assert.ok(bytes.length > 10000);
  }
});

test("burger 103898 attaches its selected kitchen sketch", async () => {
  const pdf = await generatePurchasedKitchenPdf({
    orderNumber: "111670103898-1",
    createdAt: "2026-08-27T10:00:00.000Z",
    kitchen: {
      slug: "burger-103898",
      name: "670 103898",
    },
    customer: {
      contractNumber: "111670103898",
    },
    components: [
      { componentKey: "dishwasher-base", code: "DISH-670103898", price: 500 },
    ],
    accessories: [],
    services: [],
  });

  assert.ok(pdf);
  assert.equal(pdf.filename, "Gekaufte-Kueche-111670103898-1.pdf");
  const bytes = Buffer.from(pdf.base64, "base64");
  assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
  assert.ok(bytes.length > 10000);
});

test("order confirmation PDF hides type numbers for services", async () => {
  const order = {
    orderNumber: "FRG-TEST-007",
    createdAt: "2026-07-01T10:00:00.000Z",
    total: 438,
    kitchen: {
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-106",
      firstName: "Test",
      lastName: "Customer",
      address1: "Example Street 1",
      postalCode: "38124",
      city: "Braunschweig",
      country: "Deutschland",
      email: "customer@example.com",
      phone: "+49 531 000000",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [],
    accessories: [
      {
        code: "ACC-CUTLERY-ZB60SG",
        articleNumber: "ZB60SG",
        name: "Cutlery insert 60 cm",
        nameDe: "Besteckeinsatz 60 cm",
        price: 89,
      },
    ],
    services: [
      {
        code: "SVC-MONTAGE-001",
        name: "Delivery, Carry-in, Assembly and Installation",
        price: 349,
      },
    ],
  };

  const pdf = await generateOrderConfirmationPdf(order);

  const text = await extractPdfText(pdf.base64);
  assert.match(text, /Besteckeinsatz 60 cm/);
  assert.match(text, /ZB60SG/);
  assert.match(text, /Dienstleistungen/);
  assert.match(text, /Delivery, Carry-in, Assembly and Installation/);
  assert.doesNotMatch(text, /SVC-MONTAGE-001/);

  const html = buildOrderSummaryHtml(order);
  assert.match(html, /Besteckeinsatz 60 cm[\s\S]*?Typen-Nr\.: ZB60SG/);
  assert.match(html, /Neu best.tigte Dienstleistungen/);
  assert.match(html, /Delivery, Carry-in, Assembly and Installation/);
  assert.doesNotMatch(html, /Typen-Nr\.: SVC-MONTAGE-001/);
});

test("AB 109955 order confirmation keeps its linked default oven package hidden", async () => {
  const order = {
    orderNumber: "FRG-AB109955",
    createdAt: "2026-09-10T10:00:00.000Z",
    total: 0,
    kitchen: { slug: "ab-109955", name: "109955" },
    customer: {
      contractNumber: "111109955",
      firstName: "Test",
      lastName: "Customer",
      address1: "Example Street 1",
      postalCode: "38124",
      city: "Braunschweig",
      country: "Deutschland",
      email: "customer@example.com",
      phone: "+49 531 000000",
    },
    components: [{
      code: "OVEN-B-600-HOB",
      articleNumber: "A-EH923640E + 9EC744100C",
      name: "Built-in oven and ceramic cooktop",
      nameDe: "Einbauherd und Glaskeramikkochfeld",
      iconKey: "oven_base",
      componentKey: "oven-module",
      price: 0,
      isLocked: true,
    }],
    accessories: [],
    services: [],
  };

  const pdf = await generateOrderConfirmationPdf(order);
  const text = await extractPdfText(pdf.base64);

  assert.doesNotMatch(text, /Einbauherd und Glaskeramikkochfeld/);
  assert.doesNotMatch(text, /A-EH923640E/);
  assert.doesNotMatch(text, /9EC744100C/);
});

test("order confirmation summary renders blende as a cabinet subtitle", () => {
  const order = {
    orderNumber: "FRG-TEST-001",
    createdAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T10:00:00.000Z",
    total: 244,
    productImageCids: new Map([
      ["product-images/email/a-egspv597210-dishwasher.jpg", "dishwasher-image"],
    ]),
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
        blendeLabel: "Blende Passblende",
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
        productImagePath: "/product-images/email/a-egspv597210-dishwasher.jpg",
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

  assert.doesNotMatch(html, /display:flex/);
  assert.match(html, /table-layout:fixed/);
  assert.match(html, /bgcolor="#ffffff"/);
  assert.match(html, /background-color:#ffffff/);
  assert.match(html, /width:24px/);
  assert.match(html, /width:50px;padding:0 6px 0 0/);
  assert.match(html, /width:46px;max-width:46px/);
  assert.equal(html.includes("Neu bestätigte Komponenten"), false);
  assert.ok(electricalSectionIndex > -1);
  assert.ok(cabinetSectionIndex > -1);
  assert.ok(cabinetSectionIndex < electricalSectionIndex);
  assert.ok(cabinetIndex > cabinetSectionIndex && cabinetIndex < electricalSectionIndex);
  assert.ok(dishwasherIndex > electricalSectionIndex);
  assert.ok(cabinetIndex < html.indexOf("Passblende"));
  assert.match(html, /<th[^>]*>Nr\.<\/th>/);
  assert.match(html, /<td[^>]*>[\s\S]*?1[\s\S]*?<\/td><td[\s\S]*?Vollintegrierter Geschirrspüler/);
  assert.match(html, /<tr><td[^>]*>1<\/td><td[\s\S]*?Unterschrank mit Schubkasten[\s\S]*?<\/td><td[\s\S]*?219/);
  assert.match(html, /<tr><td[^>]*>1\.1<\/td><td[\s\S]*?Passblende[\s\S]*?Typen-Nr\.: UPK20[\s\S]*?<\/td><td[\s\S]*?25/);
  assert.doesNotMatch(html, /Blende Passblende/);
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

test("order confirmation excludes Blenden attached to default locked cabinets", () => {
  const order = {
    orderNumber: "111109873-1",
    createdAt: "2026-09-09T10:00:00.000Z",
    total: 184,
    kitchen: { slug: "ab-109873", name: "109873" },
    customer: { contractNumber: "111109873", preferredDeliveryDate: "2026-10-07" },
    components: [
      {
        code: "SINK-BASE-AB109873-SP120",
        articleNumber: "SP120",
        name: "Sink Base Cabinet 120 cm",
        nameDe: "Spülenschrank 120 cm",
        price: 25,
        isLocked: true,
        blendeCode: "UPK20",
        blendeLabel: "Passblende bis 20 cm",
        blendePrice: 25,
      },
      {
        code: "CAB-BASE-AB109873-US90",
        articleNumber: "US90",
        name: "Lower Cabinet with Drawer 90 cm",
        nameDe: "Unterschrank mit Schublade 90 cm",
        price: 364,
        isLocked: true,
        blendeCode: "UPK20",
        blendeLabel: "Passblende bis 20 cm",
        blendePrice: 25,
      },
      {
        code: "CAB-WALL-AB109873-H6002-HPK2002-L",
        articleNumber: "H6002",
        name: "Upper Cabinet 60 cm",
        nameDe: "Oberschrank 60 cm",
        price: 184,
        blendeCode: "HPK2002",
        blendeLabel: "Passblende bis 20 cm",
        blendePrice: 35,
      },
    ],
    accessories: [],
    services: [],
  };

  const html = buildOrderSummaryHtml(order);

  assert.doesNotMatch(html, /SP120/);
  assert.doesNotMatch(html, /US90/);
  assert.doesNotMatch(html, /UPK20/);
  assert.match(html, /Oberschrank 60 cm/);
  assert.match(html, /Typen-Nr\.: H6002/);
  assert.match(html, /Typen-Nr\.: HPK2002/);
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
  assert.match(html, /<tr><td[^>]*>1\.1<\/td><td[\s\S]*?UPK20 20 cm x 2[\s\S]*?Typen-Nr\.: UPK20[\s\S]*?<\/td><td[\s\S]*?50/);
  assert.doesNotMatch(html, /1\.2[\s\S]*?UPK20 20 cm/);
  assert.doesNotMatch(html, /Blende UPK20 20 cm/);
  assert.match(html, /Typen-Nr\.: UPK20/);
  assert.doesNotMatch(html, /UPK20 x2/);
});

test("order confirmation uses one linked catalog corner blende", () => {
  const order = {
    orderNumber: "FRG-TEST-CATALOG-BLENDE",
    createdAt: "2026-07-20T10:00:00.000Z",
    total: 269,
    kitchen: { slug: "ab-105740", name: "105740" },
    customer: { contractNumber: "KV-105740", preferredDeliveryDate: "2026-08-03" },
    components: [
      {
        code: "CAB-BASE-AB104968-US40-L",
        name: "Base cabinet with drawer",
        nameDe: "Unterschrank mit Schublade 40 cm",
        articleNumber: "US40",
        price: 269,
        quantity: 1,
        blendeCode: "UPEF65",
        blendeLabel: "stale code-based label",
        blendeNameDe: "Eckpassblende Unterschrank",
        catalogBlendeQuantity: 1,
        blendePrice: 68,
      },
    ],
    accessories: [],
    services: [],
  };

  const html = buildOrderSummaryHtml(order);
  assert.match(html, /Eckpassblende Unterschrank/);
  assert.match(html, /Typen-Nr\.: UPEF65/);
  assert.doesNotMatch(html, /x 2/);
  assert.doesNotMatch(html, /UPK20 Passblende/);
  assert.doesNotMatch(html, /stale code-based label/);
});

test("order confirmation keeps a dishwasher corner filler with electrical appliances", () => {
  const order = {
    orderNumber: "FRG-TEST-008",
    total: 647,
    kitchen: { name: "Demo Kitchen" },
    customer: { contractNumber: "KV-108", preferredDeliveryDate: "2026-07-15" },
    components: [
      {
        code: "DISH-AB105758-600",
        articleNumber: "A-EGSPV597210 + TGV60",
        name: "Fully integrated dishwasher incl. furniture front",
        nameDe: "Vollintegrierter Geschirrspuler inkl. Mobelfront",
        iconKey: "dishwasher_base",
        componentKey: "base-module-3",
        price: 647,
        blendeCode: "UPEF65",
        blendeLabel: "UPEF65, Corner filler panel",
        blendePrice: 68,
      },
    ],
    accessories: [],
    services: [],
  };

  const html = buildOrderSummaryHtml(order);
  const electricalSectionIndex = html.indexOf("Neu bestätigte Elektrogeräte");
  const dishwasherIndex = html.indexOf("Vollintegrierter Geschirrspuler");
  const cornerFillerIndex = html.indexOf("UPEF65, Corner filler panel");

  assert.ok(electricalSectionIndex > -1);
  assert.ok(dishwasherIndex > electricalSectionIndex);
  assert.ok(cornerFillerIndex > dishwasherIndex);
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
        productImagePath: "/product-images/email/a-egspv597210-dishwasher.jpg",
        productInfoPdfPath: "legal/architecto-agb-2026-05.pdf",
      },
      {
        code: "REF-AB105806-KGCN388140E",
        name: "Freestanding refrigerator 178 cm",
        nameDe: "Standkühlschrank 178 cm",
        price: 579,
        productImagePath: "/product-images/email/kgc15495s-fridge.jpg",
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
  assert.deepEqual(staticHtml.productImageAttachments, []);
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

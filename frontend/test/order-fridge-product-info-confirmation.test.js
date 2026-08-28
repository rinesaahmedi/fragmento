import assert from "node:assert/strict";
import test from "node:test";
import { getProductInfoDocuments } from "../components/kitchen-selection-utils.js";
import { buildOrderConfirmationEmailStaticHtml } from "../lib/email/order-notifications.js";

const CURRENT_FRIDGE_PRODUCT_INFO_PDF =
  "/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf";
const CURRENT_FLAT_HOOD_PRODUCT_INFO_PDF =
  "/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf";

test("product info button maps unlisted fridge codes to the current PDF", () => {
  const documents = getProductInfoDocuments({
    code: "REF-AB105736-KGCN388140E",
    articleNumber: "OL-KGCN388140E",
    name: "Freestanding refrigerator 181 cm",
    iconKey: "tall_refrigerator",
    componentKey: "refrigerator",
    productInfoPdfPath: "/product-info/kgc-15495-s-product-info-eco21.pdf",
  });

  assert.equal(documents.at(-1)?.href, CURRENT_FRIDGE_PRODUCT_INFO_PDF);
});

test("product info button maps flat hood bundle articles to the current PDF", () => {
  const documents = getProductInfoDocuments({
    code: "CAB-HOOD-AB105736-600",
    articleNumber: "FH664621E + FWK124 + HD6002",
    name: "Flat screen extractor hood + cabinet + filter",
    iconKey: "hood_wall_cabinet",
    componentKey: "wall-cabinet-4",
    productInfoPdfPath: "/product-info/old-hood-product-info.pdf",
  });

  assert.equal(documents.at(-1)?.href, CURRENT_FLAT_HOOD_PRODUCT_INFO_PDF);
});

test("order confirmation fridge fallback uses the current product-info PDF", async () => {
  const order = {
    orderNumber: "FRG-TEST-005",
    total: 579,
    kitchen: { name: "Demo Kitchen" },
    customer: {
      contractNumber: "KV-104",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "REF-AB105806-KGCN388140E",
        articleNumber: "OL-KGCN388140E",
        name: "Freestanding refrigerator 178 cm",
        nameDe: "Standkuehlschrank 178 cm",
        iconKey: "tall_refrigerator",
        componentKey: "refrigerator",
        price: 579,
      },
    ],
    accessories: [],
    services: [],
  };

  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);

  assert.deepEqual(staticHtml.attachmentLabels, ["Standkuehlschrank 178 cm"]);
  assert.deepEqual(staticHtml.attachmentLinks, [
    {
      key: `product-info:${CURRENT_FRIDGE_PRODUCT_INFO_PDF.replace(/^\//, "")}`,
      label: "Standkuehlschrank 178 cm",
      href: CURRENT_FRIDGE_PRODUCT_INFO_PDF,
    },
  ]);
});

test("order confirmation flat hood bundle uses the current product-info PDF", async () => {
  const order = {
    orderNumber: "FRG-TEST-006",
    total: 349,
    kitchen: { name: "Demo Kitchen" },
    customer: {
      contractNumber: "KV-105",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "CAB-HOOD-AB105736-600",
        articleNumber: "FH664621E + FWK124 + HD6002",
        name: "Flat screen extractor hood + cabinet + filter",
        nameDe: "Flachschirmhaube + Schrank + Filter",
        iconKey: "hood_wall_cabinet",
        componentKey: "wall-cabinet-4",
        productInfoPdfPath: "/product-info/old-hood-product-info.pdf",
        price: 349,
      },
    ],
    accessories: [],
    services: [],
  };

  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);

  assert.deepEqual(staticHtml.attachmentLabels, ["Flachschirmhaube + Schrank + Filter"]);
  assert.deepEqual(staticHtml.attachmentLinks, [
    {
      key: `product-info:${CURRENT_FLAT_HOOD_PRODUCT_INFO_PDF.replace(/^\//, "")}`,
      label: "Flachschirmhaube + Schrank + Filter",
      href: CURRENT_FLAT_HOOD_PRODUCT_INFO_PDF,
    },
  ]);
});

test("Burger 103898 confirmation uses only its matching supplier PDFs", async () => {
  const order = {
    orderNumber: "BURGER-103898-TEST",
    total: 1669,
    kitchen: { name: "103898", slug: "burger-103898" },
    customer: {
      contractNumber: "111103898",
      preferredDeliveryDate: "2026-09-24",
    },
    components: [
      { code: "REF-BURGER103898-KGCN388140E", name: "Burger refrigerator", price: 579 },
      { code: "DISH-BURGER103898-600", name: "Burger dishwasher", price: 586 },
      { code: "CAB-HOOD-BURGER103898-HFLH6072", name: "Burger extractor hood", price: 346 },
    ],
    accessories: [
      { code: "ACC-LIGHT-003", name: "Burger LED spots", price: 69 },
      { code: "ACC-WASTE-001", name: "Burger waste collector", price: 89 },
    ],
    services: [],
  };

  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);
  const hrefs = staticHtml.attachmentLinks.map((link) => link.href);

  assert.deepEqual(hrefs, [
    "/product-info/burger-103898/refrigerators/ol-kgcn388140e-product-info.pdf",
    "/product-info/burger-103898/dishwashers/a-egspv597210-product-info.pdf",
    "/product-info/burger-103898/extractor-hoods/fh664621e-product-info.pdf",
    "/product-info/burger-103898/lighting/led-spots-product-info.pdf",
    "/product-info/burger-103898/waste-collectors/blanco-517467-product-info.pdf",
  ]);
  assert.ok(hrefs.every((href) => href.includes("/burger-103898/")));
  assert.ok(hrefs.every((href) => !href.includes("a-egspv594400") && !href.includes("khf664611s")));
});

import assert from "node:assert/strict";
import test from "node:test";
import { ItemType } from "@prisma/client";
import {
  applyArticleVariantSelection,
  applyArticleVariantSelectionForDisplay,
  buildAuszugVariantMetadata,
  findAuszugVariantOption,
  getAuszugVariantArticleNumber,
  resolveAuszugVariantSelection,
} from "../lib/auszug-variants.js";

const us60Article = {
  id: "article-us60",
  articleNumber: "US60",
  name: "Lower cabinet with drawer 60 cm",
  nameDe: "Unterschrank mit Schublade 60 cm",
  price: 219,
  widthMm: 600,
  heightMm: null,
  depthMm: 600,
};

const us2a60Article = {
  id: "article-us2a60",
  articleNumber: "US2A60",
  name: "Lower Cabinet with 3 Drawers 60 cm",
  nameDe: "Unterschrank mit 3 Schubladen 60 cm",
  price: 347,
  widthMm: 600,
  heightMm: null,
  depthMm: 600,
};

const upk20Blende = {
  id: "blende-upk20",
  code: "UPK20",
  name: "UPK20 20 cm",
  nameDe: "UPK20 20 cm",
  price: 25,
};

function kitchenItem(overrides = {}) {
  return {
    id: "item-1",
    itemType: ItemType.COMPONENT,
    code: "CAB-BASE-1",
    articleNumber: "US60",
    name: "Base cabinet with drawer",
    nameDe: "Unterschrank mit Schublade",
    price: 219,
    catalogArticleId: us60Article.id,
    catalogArticle: us60Article,
    catalogBlendeId: null,
    catalogBlende: null,
    catalogBlendeQuantity: null,
    ...overrides,
  };
}

test("Auszug article numbers are derived only from lower cabinet US articles", () => {
  assert.equal(getAuszugVariantArticleNumber("US60"), "US2A60");
  assert.equal(getAuszugVariantArticleNumber("H6002"), "");
  assert.equal(getAuszugVariantArticleNumber("US2A60"), "");
});

test("Auszug metadata is available only when a matching active variant article is supplied", () => {
  assert.equal(buildAuszugVariantMetadata(kitchenItem(), []), null);

  const metadata = buildAuszugVariantMetadata(kitchenItem(), [us2a60Article]);
  assert.equal(metadata.variantArticleNumber, "US2A60");
  assert.deepEqual(
    metadata.options.map((option) => [option.key, option.articleNumber, option.price]),
    [
      ["no", "US60", 219],
      ["yes", "US2A60", 347],
    ],
  );
});

test("Auszug metadata keeps existing blende pricing on top of the selected article", () => {
  const metadata = buildAuszugVariantMetadata(
    kitchenItem({
      price: 244,
      catalogBlendeId: upk20Blende.id,
      catalogBlende: upk20Blende,
      catalogBlendeQuantity: 1,
    }),
    [us2a60Article],
  );

  assert.deepEqual(
    metadata.options.map((option) => [option.key, option.articleNumber, option.price]),
    [
      ["no", "US60", 244],
      ["yes", "US2A60", 372],
    ],
  );
});

test("Auszug metadata uses the supplied program price for drawer variants", () => {
  const burgerVariant = buildAuszugVariantMetadata(kitchenItem(), [{
    ...us2a60Article,
    price: 347,
    programPrices: [{ programmId: "BURGER CINDY", price: 461, isActive: true }],
  }]);
  assert.equal(burgerVariant.options.find((option) => option.key === "yes")?.price, 461);
});

test("composite supplier cabinet numbers select the base drawer option", () => {
  const item = {
    ...kitchenItem({ articleNumber: "US60 + UPE65" }),
    articleVariants: {
      auszug: buildAuszugVariantMetadata(kitchenItem(), [us2a60Article]),
    },
  };

  assert.equal(findAuszugVariantOption(item, "US60 + UPE65")?.key, "no");
});

test("client variant application replaces the displayed article and total price", () => {
  const item = {
    ...kitchenItem(),
    articleVariants: {
      auszug: buildAuszugVariantMetadata(kitchenItem(), [us2a60Article]),
    },
  };

  assert.equal(applyArticleVariantSelection(item, "").articleNumber, "US60");

  const selected = applyArticleVariantSelection(item, "US2A60");
  assert.equal(selected.articleNumber, "US2A60");
  assert.equal(selected.name, "Lower Cabinet with 3 Drawers 60 cm");
  assert.equal(selected.price, 347);
});

test("display variant application keeps the base cabinet title stable", () => {
  const item = {
    ...kitchenItem(),
    articleVariants: {
      auszug: buildAuszugVariantMetadata(kitchenItem(), [us2a60Article]),
    },
  };

  const selected = applyArticleVariantSelectionForDisplay(item, "US2A60");
  assert.equal(selected.articleNumber, "US2A60");
  assert.equal(selected.name, "Base cabinet with drawer");
  assert.equal(selected.nameDe, "Unterschrank mit Schublade");
  assert.equal(selected.price, 347);
});

test("order variant resolution validates and returns the submitted Auszug catalog article", () => {
  const selected = resolveAuszugVariantSelection(kitchenItem(), "US2A60", [us2a60Article]);

  assert.equal(selected.status, "variant");
  assert.equal(selected.article.articleNumber, "US2A60");
  assert.equal(selected.article.name, "Lower Cabinet with 3 Drawers 60 cm");
  assert.equal(selected.article.nameDe, "Unterschrank mit 3 Schubladen 60 cm");
  assert.equal(selected.article.price, 347);
});

test("order variant resolution rejects unmatched submitted component article variants", () => {
  const selected = resolveAuszugVariantSelection(kitchenItem(), "US2A80", [us2a60Article]);
  assert.equal(selected.status, "invalid");
  assert.equal(selected.article, null);
});

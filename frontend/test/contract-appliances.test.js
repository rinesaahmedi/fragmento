import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CONTRACT_APPLIANCE_BRANDS, parseContractAppliances, deriveKitchenAppliances, resolveContractAppliances, validateReferenceAppliances } from "../lib/contract-appliances.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { getSerialNumberHelpImages, SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT, SERIAL_NUMBER_HELP_PRODUCT_BRANDS } from "../lib/serial-number-help.js";
import { loadContractApplianceInventory, saveContractApplianceInventory } from "../lib/contract-appliance-inventory.js";

const item = (componentKey, extra = {}) => ({ id: componentKey, code: componentKey, componentKey, itemType: "COMPONENT", isActive: true, ...extra });
const dishwasher = item("dishwasher-base", { name: "Dishwasher", articleNumber: "DW-1", productInfoExtractedText: "Manufacturer AMICA" });
const oven = item("oven-module", { name: "Oven and hob", articleNumber: "A-EH923640E + 9EC744100C", isLocked: true });
const adminApplianceFieldsSource = fs.readFileSync(
  new URL("../components/admin-contract-appliance-fields.js", import.meta.url),
  "utf8",
);
function derive(items, confirmedItems = [], claimParts = []) {
  const selectable = buildServiceClaimSelectableComponents({ kitchen: { items }, kitchenSlug: "test", confirmedItems, claimParts });
  return deriveKitchenAppliances({ ...selectable, items, confirmedItems });
}

test("admin appliance cards use a corner x and no article-number field", () => {
  assert.doesNotMatch(adminApplianceFieldsSource, /name={`applianceArticleNumber:/);
  assert.match(adminApplianceFieldsSource, /style={removeButtonStyle}[\s\S]*?×/);
  assert.match(adminApplianceFieldsSource, /aria-label={translate\("contractDetailAdmin\.removeAppliance"/);
});

test("only the supported three brands can be saved", () => {
  assert.deepEqual(CONTRACT_APPLIANCE_BRANDS.map((entry) => entry.value), ["amica", "bosch", "aeg"]);
  const form = new FormData();
  form.set("applianceBrand:oven", "siemens");
  assert.throws(() => parseContractAppliances(form), /Amica, BOSCH or AEG/);
});
test("blank brand, removed and untouched are separate states", () => {
  const form = new FormData();
  form.set("appliancePresent:oven", "true");
  form.set("appliancePresent:dishwasher", "false");
  const entries = parseContractAppliances(form);
  assert.equal(entries.length, 2);
  assert.equal(entries.find((entry) => entry.applianceType === "oven").brand, null);
  assert.equal(entries.find((entry) => entry.applianceType === "dishwasher").isPresent, false);
});
test("FRG excludes unpurchased optional appliances and includes confirmed ones", () => {
  assert.deepEqual(derive([dishwasher, oven]).map((entry) => entry.applianceType), ["oven", "hob"]);
  const installed = derive([dishwasher, oven], [{ ...dishwasher, kitchenItemId: dishwasher.id, articleNumberSnapshot: "DW-OLD", sourceOrderId: "order-1" }]);
  assert.equal(installed[0].applianceType, "dishwasher");
  assert.equal(installed[0].articleNumber, "DW-OLD");
  assert.equal(installed[0].brand, "amica");
  assert.equal(installed[0].source, "ORDER");
});
test("unlinked legacy catalog articles leave brand unknown without breaking inventory", () => {
  assert.equal(derive([{ ...oven, catalogArticle: null }])[0].brand, null);
});
test("a dishwasher claim part follows its parent purchase and does not expose a furniture front", () => {
  const claimParts = ["dishwasher", "furniture-front"].map((partKey) => ({ partKey, sourceKitchenItemCode: dishwasher.code, sourceComponentKey: dishwasher.componentKey, articleCode: partKey === "dishwasher" ? "DW-1" : "TGV60" }));
  assert.deepEqual(derive([dishwasher], [], claimParts), []);
  const installed = derive([dishwasher], [{ ...dishwasher, kitchenItemId: dishwasher.id }], claimParts);
  assert.equal(installed.length, 1);
  assert.equal(installed[0].articleNumber, "DW-1");
});
test("oven drawers, hood cabinets, filters and fronts are not electrical appliances", () => {
  assert.deepEqual(deriveKitchenAppliances({ selectableComponents: [
    { componentKey: "oven-module", claimPartKey: "oven-drawer" },
    { componentKey: "wall-cabinet-2", name: "Hood cabinet" },
    { componentKey: "dishwasher-base", claimPartKey: "furniture-front" },
    { componentKey: "extractor-hood", claimPartKey: "filter" },
  ] }), []);
});
test("oven packages produce two devices without duplicate claim parts", () => {
  const parts = ["oven", "cooktop", "oven-drawer"].map((partKey) => ({ partKey, sourceKitchenItemCode: oven.code, sourceComponentKey: oven.componentKey }));
  assert.deepEqual(derive([oven], [], parts).map((entry) => entry.applianceType), ["oven", "hob"]);
});
test("unknown ARC inventories preserve legacy choices and explicit empty inventories stay empty", () => {
  assert.equal(resolveContractAppliances({ manual: true }).appliances.length, 5);
  assert.equal(resolveContractAppliances({ manual: true }).configured, false);
  const empty = resolveContractAppliances({ manual: true, configured: true });
  assert.deepEqual(empty.appliances, []);
  assert.equal(empty.configured, true);
});
test("ARC removal survives reload, restoration and another contract", () => {
  const removed = { applianceType: "dishwasher", isPresent: false, brand: "bosch" };
  assert.equal(resolveContractAppliances({ manual: true, saved: [removed] }).appliances.some((entry) => entry.applianceType === "dishwasher"), false);
  assert.equal(resolveContractAppliances({ manual: true }).appliances.length, 5);
  assert.equal(resolveContractAppliances({ manual: true, configured: true, saved: [{ ...removed, isPresent: true }] }).appliances.length, 1);
});
test("FRG manual settings cannot add a missing appliance or remove an included one", () => {
  const result = resolveContractAppliances({ automatic: [{ applianceType: "oven", isPresent: true, brand: "amica", articleNumber: "old" }], saved: [
    { applianceType: "oven", isPresent: false, brand: "bosch" }, { applianceType: "dishwasher", isPresent: true },
  ] });
  assert.equal(result.appliances.length, 1);
  assert.equal(result.appliances[0].brand, "bosch");
  assert.equal(result.appliances[0].articleNumber, null);
  assert.equal(result.appliances[0].conflictingBrand, true);
});
test("serial help uses the installed brand and never an old product's photo", () => {
  SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT.OLD = [{ src: "wrong-amica-photo" }];
  SERIAL_NUMBER_HELP_PRODUCT_BRANDS.OLD = "amica";
  try {
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven", articleCode: "OLD", name: "Amica oven" }, [{ applianceType: "oven", brand: "bosch" }])[0].src, /bosch\/oven/);
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven", name: "BOSCH oven" })[0].src, /bosch\/oven/);
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven" }, [{ applianceType: "oven", articleNumber: "OLD", brand: "bosch" }])[0].src, /bosch\/oven/);
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven", name: "Amica oven" }, [{ applianceType: "oven", brand: null }])[0].src, /amica\/oven/);
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven" }, [{ applianceType: "oven", brand: "aeg" }])[0].src, /aeg\/oven/);
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven" }, [{ applianceType: "oven", brand: null }])[0].src, /amica\/oven/);
    assert.match(getSerialNumberHelpImages({ claimPartKey: "oven" }, [{ applianceType: "oven", brand: "amica" }])[0].src, /Amica%20oven/);
  } finally { delete SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT.OLD; delete SERIAL_NUMBER_HELP_PRODUCT_BRANDS.OLD; }
});
test("hob prefers its dedicated Amica cooktop photo", () => {
  assert.match(getSerialNumberHelpImages({ claimPartKey: "hob" }, [{ applianceType: "hob", brand: "amica" }])[0].src, /amica\/cooktop/);
  assert.match(getSerialNumberHelpImages({ claimPartKey: "hob" }, [{ applianceType: "hob", brand: "amica", sharesOvenSerial: true }])[0].src, /amica\/cooktop/);
});
test("server rejects stale or forged reference appliances and resolves accepted article codes", () => {
  const issue = { componentId: "reference-electrical-1", applianceType: "dishwasher", name: "forged", articleCode: "forged" };
  assert.throws(() => validateReferenceAppliances([issue], { appliances: [] }), /no longer available/);
  assert.throws(() => validateReferenceAppliances([{ ...issue, applianceType: "microwave" }], { appliances: [] }), /no longer available/);
  assert.equal(validateReferenceAppliances([issue], { appliances: [{ applianceType: "dishwasher", articleNumber: "correct" }] })[0].articleCode, "correct");
});
test("unrelated admin forms do not write or delete appliance data", async () => {
  await saveContractApplianceInventory({}, { id: "untouched" }, new FormData());
});
test("FRG saves reject added appliances, missing rows and stale kitchen selection", async () => {
  const client = {
    kitchen: { findUnique: async () => ({ slug: "test", items: [oven], claimParts: [] }) },
    order: { findMany: async () => [] },
  };
  const contract = { id: "frg", kitchenId: "actual", contractNumber: "670000000", contractType: "FRG" };
  const form = new FormData();
  form.set("applianceInventorySubmitted", "true");
  form.set("applianceInventoryKitchenId", "old");
  await assert.rejects(saveContractApplianceInventory(client, contract, form), /kitchen changed/);
  form.set("applianceInventoryKitchenId", "actual");
  await assert.rejects(saveContractApplianceInventory(client, contract, form), /list changed/);
  form.set("appliancePresent:oven", "true");
  form.set("appliancePresent:hob", "true");
  form.set("appliancePresent:dishwasher", "true");
  await assert.rejects(saveContractApplianceInventory(client, contract, form), /Only installed/);
  form.delete("appliancePresent:dishwasher");
  form.set("appliancePresent:oven", "false");
  await assert.rejects(saveContractApplianceInventory(client, contract, form), /Only installed/);
});
test("manual inventory loading uses contract settings even when all ARC contracts share a kitchen", async () => {
  const client = { kitchen: { findUnique: async () => ({ slug: "pdf-only-kitchen", items: [], claimParts: [] }) } };
  const one = await loadContractApplianceInventory({ kitchenId: "shared", contractType: "ARC", appliancesConfigured: true, appliances: [{ applianceType: "oven", isPresent: true, brand: "aeg" }] }, client);
  const two = await loadContractApplianceInventory({ kitchenId: "shared", contractType: "ARC", appliancesConfigured: true, appliances: [] }, client);
  assert.equal(one.appliances[0].brand, "aeg");
  assert.deepEqual(two.appliances, []);
});

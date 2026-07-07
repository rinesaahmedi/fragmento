import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configuratorPath = path.join(__dirname, "..", "components", "kitchen-configurator.js");
const source = fs.readFileSync(configuratorPath, "utf8");

test("configurator drafts preserve confirmed baseline selections", () => {
  assert.match(source, /selectedComponentIds:\s*\[[\s\S]*?\.{3}fixedComponentIds,[\s\S]*?\.{3}baseComponentIds,[\s\S]*?\.{3}draft\.selectedComponentIds/);
  assert.match(source, /selectedAccessoryCodes:\s*\[[\s\S]*?\.{3}fixedAccessoryCodes,[\s\S]*?\.{3}baseAccessoryCodes,[\s\S]*?\.{3}filterRegularAccessoryCodes\(draft\.selectedAccessoryCodes/);
  assert.match(source, /selectedServiceCodes:\s*\[[\s\S]*?\.{3}baseServiceCodes,[\s\S]*?\.{3}draft\.selectedServiceCodes/);
});

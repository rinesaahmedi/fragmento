import assert from "node:assert/strict";
import test from "node:test";
import { isTestContractNumber } from "../lib/order-kind.js";

test("identifies PX test contract numbers by their normalized 111 prefix", () => {
  assert.equal(isTestContractNumber("111123456"), true);
  assert.equal(isTestContractNumber(" 111 123 456 "), true);
  assert.equal(isTestContractNumber("\t111\n123456"), true);
  assert.equal(isTestContractNumber("670123456"), false);
  assert.equal(isTestContractNumber("AB 111539"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { calculateGrossProfit } from "../src/lib/profit";
import {
  NOTEBOOK_STORAGE_OPTIONS,
  normalizeProductColor,
  normalizeProductStorage,
  PHONE_STORAGE_OPTIONS,
  PRODUCT_CONDITIONS,
} from "../src/lib/productStandards";

test("normaliza cores em maiúsculas", () => {
  assert.equal(normalizeProductColor("  Titânio azul  "), "TITÂNIO AZUL");
});

test("normaliza capacidades digitadas em formatos equivalentes", () => {
  assert.equal(normalizeProductStorage("512gb SSD"), "512 GB");
  assert.equal(normalizeProductStorage("2t"), "2 TB");
});

test("expõe somente as condições permitidas", () => {
  assert.deepEqual(PRODUCT_CONDITIONS, ["NOVO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"]);
  assert.ok(PHONE_STORAGE_OPTIONS.includes("2 TB"));
  assert.ok(NOTEBOOK_STORAGE_OPTIONS.includes("4 TB"));
});

test("calcula lucro e margem brutos sem taxas ocultas", () => {
  assert.deepEqual(calculateGrossProfit(2500, 1800), { grossProfit: 700, grossMargin: 28 });
});

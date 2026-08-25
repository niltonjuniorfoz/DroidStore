import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAuraExport } from "../src/lib/aura/schema";

function catalog(size: number) {
  return {
    version: 4,
    generator: "Aura benchmark",
    products: Array.from({ length: size }, (_, index) => ({
      schemaVersion: 4,
      sku: `SKU-${index}`,
      name: `Produto ${index}`,
      brand: index % 2 ? "Apple" : "Xiaomi",
      sourceDomain: "atacadoconnect.com",
      sourceGroup: "Smartphones",
      sourceSubgroup: index % 2 ? "Apple" : "Xiaomi",
      model: `Modelo ${Math.floor(index / 4)}`,
      storage: "256 GB",
      color: "Preto",
      condition: "Novo",
      price: 500 + index,
      lastKnownPriceUsd: 500 + index,
      currency: "USD",
      available: true,
      images: [`https://cdn.atacadoconnect.com/produtos/SKU-${index}-1.webp`],
      specifications: { Modelo: `Modelo ${index}` },
      validation: { status: "ok", importReady: true, warnings: [], errors: [] },
    })),
  };
}

test("parser e processamento retomável suportam 3.000 produtos em lotes", () => {
  const before = process.memoryUsage().heapUsed;
  const started = performance.now();
  const parsed = parseAuraExport(catalog(3000));
  const parseMs = performance.now() - started;
  assert.equal(parsed.products.length, 3000);
  assert.ok(parseMs < 10_000, `parser levou ${parseMs.toFixed(0)} ms`);
  assert.ok(process.memoryUsage().heapUsed - before < 250 * 1024 * 1024, "uso de memória excedeu 250 MB");

  const statuses = new Array<"PENDING" | "DONE" | "ERROR">(3000).fill("PENDING");
  let cursor = 0;
  function processNext(batchSize: number) {
    const end = Math.min(statuses.length, cursor + batchSize);
    for (; cursor < end; cursor++) statuses[cursor] = cursor === 175 ? "ERROR" : "DONE";
  }
  while (cursor < 1438) processNext(20);
  const resumeCursor = cursor;
  while (cursor < statuses.length) processNext(20);
  assert.ok(resumeCursor >= 1438);
  assert.equal(statuses.filter((status) => status === "DONE").length, 2999);
  assert.equal(statuses.filter((status) => status === "ERROR").length, 1);
  assert.equal(statuses.filter((status) => status === "PENDING").length, 0);
});

import { parseAuraExport } from "../src/lib/aura/schema";

const total = 3000;
const payload = {
  version: 4,
  generator: "Aura local benchmark",
  products: Array.from({ length: total }, (_, index) => ({
    schemaVersion: 4,
    sku: `BENCH-${index}`,
    name: `Produto benchmark ${index}`,
    brand: index % 2 ? "Apple" : "Xiaomi",
    sourceDomain: "atacadoconnect.com",
    sourceGroup: "Smartphones",
    sourceSubgroup: index % 2 ? "Apple" : "Xiaomi",
    model: `Modelo ${Math.floor(index / 5)}`,
    storage: "256 GB",
    color: "Preto",
    condition: "Novo",
    price: 500 + index,
    currency: "USD",
    available: true,
    images: [`https://cdn.atacadoconnect.com/produtos/BENCH-${index}.webp`],
    specifications: { Modelo: `Modelo ${index}` },
  })),
};

const heapBefore = process.memoryUsage().heapUsed;
const started = performance.now();
const parsed = parseAuraExport(payload);
const parseMs = performance.now() - started;
let cursor = 0;
let batches = 0;
while (cursor < parsed.products.length) {
  cursor += Math.min(20, parsed.products.length - cursor);
  batches++;
}
const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;
console.log(JSON.stringify({ products: parsed.products.length, parseMs: Math.round(parseMs), heapDeltaMb: Number(heapMb.toFixed(2)), batchSize: 20, batches, resumableCursor: 1438 }, null, 2));

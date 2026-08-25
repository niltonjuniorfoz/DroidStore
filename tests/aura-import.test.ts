import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { validateSupplierImageUrl, isPrivateIp } from "../src/lib/aura/images";
import { calculateAuraPrice, chooseAuraPriceBasis, roundAuraPrice } from "../src/lib/aura/pricing";
import { findDuplicateAuraSkus, parseAuraExport } from "../src/lib/aura/schema";
import { findMissingSupplierSkus, parseSupplierWorkbook } from "../src/lib/aura/supplierSync";
import { DEFAULT_EXISTING_POLICIES, EMPTY_SOURCE_CONDITION } from "../src/lib/aura/types";

function sourceProduct(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 4,
    sku: "1231069",
    name: "Smartwatch Garmin Fenix 8 47mm",
    brand: "Garmin",
    sourceName: "Atacado Connect",
    sourceDomain: "atacadoconnect.com",
    sourceUrl: "https://atacadoconnect.com/produto/1231069",
    sourceGroup: "Smartwatch",
    sourceSubgroup: "Garmin",
    categoryPath: ["Smartwatch", "Garmin"],
    model: "Fenix 8",
    storage: "32 GB",
    color: "Preto",
    condition: "Novo",
    normalized: { brand: "Garmin", model: "Fenix 8", storage: "32 GB", color: "Preto", condition: "Novo" },
    price: 1010,
    lastKnownPriceUsd: 1010,
    currency: "USD",
    available: true,
    description: "Relógio premium com GPS e tela AMOLED.",
    images: ["https://cdn.atacadoconnect.com/produtos/1231069-1.webp", "https://cdn.atacadoconnect.com/produtos/1231069-2.webp"],
    specifications: { Modelo: "Fenix 8", Tela: "AMOLED", Cor: "Preto" },
    validation: { status: "ok", importReady: true, warnings: [], errors: [] },
    ...overrides,
  };
}

function auraExport(products: unknown[], version = 4) {
  return { version, generator: "Aura Extrator 0.9", exportedAt: "2026-08-25T12:00:00Z", products };
}

test("aceita JSON Aura v4 com um SKU novo e ignora campos futuros", () => {
  const parsed = parseAuraExport(auraExport([{ ...sourceProduct(), futureField: { anything: true } }], 7));
  assert.equal(parsed.version, 7);
  assert.equal(parsed.products.length, 1);
  assert.equal(parsed.products[0].sku, "1231069");
  assert.equal(parsed.products[0].brand, "Garmin");
});

test("rejeita exportações e produtos anteriores ao schema v4", () => {
  assert.throws(() => parseAuraExport(auraExport([sourceProduct()], 3)), /Estrutura Aura inválida/);
  const parsed = parseAuraExport(auraExport([sourceProduct({ schemaVersion: 3 })]));
  assert.equal(parsed.products.length, 0);
  assert.equal(parsed.rejected.length, 1);
});

test("marca brand genérica e moeda diferente de USD como erro", () => {
  const product = parseAuraExport(auraExport([sourceProduct({ brand: "Produto", normalized: {}, currency: "EUR" })])).products[0];
  assert.equal(product.brand, "");
  assert.equal(product.validationStatus, "error");
  assert.deepEqual(product.messages.map((message) => message.code), ["MISSING_BRAND", "UNSUPPORTED_CURRENCY"]);
});

test("warning do Aura e importReady falso permanecem em revisão", () => {
  const product = parseAuraExport(auraExport([sourceProduct({
    validation: { status: "warning", importReady: false, warnings: ["Confira o modelo"], errors: [] },
  })])).products[0];
  assert.equal(product.validationStatus, "warning");
  assert.equal(product.importReady, false);
  assert.equal(product.messages[0].code, "AURA_WARNING");
});

test("detecta SKU duplicado no mesmo arquivo", () => {
  const duplicates = findDuplicateAuraSkus([{ sku: "A" }, { sku: "B" }, { sku: "A" }]);
  assert.deepEqual([...duplicates], ["A"]);
});

test("preserva disponibilidade, descrição, especificações e ordem das imagens", () => {
  const product = parseAuraExport(auraExport([sourceProduct()])).products[0];
  assert.equal(product.available, true);
  assert.match(product.description, /GPS/);
  assert.deepEqual(product.specifications.map((item) => item.label), ["Modelo", "Tela", "Cor"]);
  assert.deepEqual(product.images, [
    "https://cdn.atacadoconnect.com/produtos/1231069-1.webp",
    "https://cdn.atacadoconnect.com/produtos/1231069-2.webp",
  ]);
});

test("preserva CPO e Swap como condição de origem sem mapear silenciosamente", () => {
  const products = parseAuraExport(auraExport([
    sourceProduct({ sku: "CPO-1", condition: "CPO", normalized: { condition: "CPO" } }),
    sourceProduct({ sku: "SWAP-1", condition: "Swap A", normalized: { condition: "Swap A" } }),
  ])).products;
  assert.equal(products[0].sourceCondition, "CPO");
  assert.equal(products[1].sourceCondition, "Swap A");
  assert.equal(parseAuraExport(auraExport([sourceProduct({ condition: "", normalized: {} })])).products[0].sourceCondition, EMPTY_SOURCE_CONDITION);
});

test("agrupamento conservador separa tamanhos/RAM não representados pela Variant", () => {
  const parsed = parseAuraExport(auraExport([
    sourceProduct({ sku: "43", specifications: { Modelo: "Fenix 8", "Tamanho da caixa": "43 mm" } }),
    sourceProduct({ sku: "51", specifications: { Modelo: "Fenix 8", "Tamanho da caixa": "51 mm" } }),
  ])).products;
  assert.notEqual(parsed[0].groupKey, parsed[1].groupKey);
});

test("calcula USD para BRL, margem por marca e arredondamento", () => {
  const apple = calculateAuraPrice({ supplierPriceUsd: 1010, exchangeRate: 5.32, markupPercent: 20, roundingRule: "CEIL_10" });
  const xiaomi = calculateAuraPrice({ supplierPriceUsd: 100, exchangeRate: 5.32, markupPercent: 30, roundingRule: "CEIL_10" });
  assert.equal(apple.convertedCostBrl, 5373.2);
  assert.equal(apple.priceBeforeRounding, 6447.84);
  assert.equal(apple.salePriceBrl, 6450);
  assert.equal(xiaomi.priceBeforeRounding, 691.6);
  assert.equal(roundAuraPrice(6421.01, "CEIL_10"), 6430);
  assert.equal(roundAuraPrice(6450, "CEIL_10"), 6450);
  assert.equal(roundAuraPrice(6474, "NEAREST_10"), 6470);
  assert.equal(roundAuraPrice(6451, "CEIL_50"), 6500);
  assert.equal(roundAuraPrice(6451, "CEIL_100"), 6500);
});

test("indisponível preserva preço existente e nunca inventa preço zero", () => {
  assert.deepEqual(chooseAuraPriceBasis({ available: true, supplierPriceUsd: 1010, lastKnownPriceUsd: 900 }), { basisUsd: 1010, preserveExistingPrice: false, reason: "current" });
  assert.deepEqual(chooseAuraPriceBasis({ available: false, supplierPriceUsd: null, lastKnownPriceUsd: 1010, existingPrice: 6500 }), { basisUsd: null, preserveExistingPrice: true, reason: "existing" });
  assert.deepEqual(chooseAuraPriceBasis({ available: false, supplierPriceUsd: null, lastKnownPriceUsd: 1010 }), { basisUsd: 1010, preserveExistingPrice: false, reason: "historical" });
  assert.deepEqual(chooseAuraPriceBasis({ available: false, supplierPriceUsd: null, lastKnownPriceUsd: null }), { basisUsd: null, preserveExistingPrice: false, reason: "missing" });
});

test("políticas existentes não sobrescrevem conteúdo manual por padrão", () => {
  assert.deepEqual(DEFAULT_EXISTING_POLICIES, {
    updateName: false,
    updateDescription: false,
    updateImages: false,
    replaceSpecifications: false,
    updateCategories: false,
  });
});

test("rejeita thumbnails, YouTube, semfoto, placeholder e domínio não autorizado", () => {
  const allowed = ["atacadoconnect.com"];
  for (const url of [
    "https://cdn.atacadoconnect.com/thumb/a.webp",
    "https://img.youtube.com/a.jpg",
    "https://atacadoconnect.com/semfoto.png",
    "https://atacadoconnect.com/placeholder.webp",
    "https://evil.example/produto.webp",
  ]) assert.throws(() => validateSupplierImageUrl(url, allowed));
  assert.equal(validateSupplierImageUrl("https://cdn.atacadoconnect.com/produtos/a.webp", allowed).hostname, "cdn.atacadoconnect.com");
});

test("bloqueia endereços privados usados em SSRF", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1"]) {
    assert.equal(isPrivateIp(address), true, address);
  }
  assert.equal(isPrivateIp("8.8.8.8"), false);
});

test("proteção de escopo só indisponibiliza marcas selecionadas", () => {
  const catalog = [
    { sku: "APPLE-1", sourceBrand: "Apple" },
    { sku: "XIAOMI-1", sourceBrand: "Xiaomi" },
    { sku: "SAMSUNG-1", sourceBrand: "Samsung" },
  ];
  const missing = findMissingSupplierSkus({ catalogItems: catalog, fileSkus: ["APPLE-1"], scopeBrands: ["Apple", "Xiaomi"] });
  assert.deepEqual(missing.map((item) => item.sku), ["XIAOMI-1"]);
});

test("detecta automaticamente Código, Preço U$, Produto e Marca no XLSX", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lista");
  sheet.addRow(["Código", "Produto", "Preço U$", "Marca"]);
  sheet.addRow(["A-1", "iPhone", 500, "Apple"]);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const parsed = await parseSupplierWorkbook(buffer);
  assert.equal(parsed.mapping.sku, "Código");
  assert.equal(parsed.mapping.price, "Preço U$");
  assert.equal(parsed.rows[0].sku, "A-1");
  assert.equal(parsed.rows[0].supplierPriceUsd, 500);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  findProduct,
  getBaseModelName,
  getCatalogSection,
  groupCatalogProducts,
  money,
  products,
  type CatalogProduct,
} from "../src/lib/catalog";

test("slugs e identificadores do catálogo são únicos", () => {
  assert.ok(products.length > 0);
  assert.equal(new Set(products.map((product) => product.slug)).size, products.length);
  assert.equal(new Set(products.map((product) => product.id)).size, products.length);
});

test("produto pode ser localizado e preço é formatado em real", () => {
  const product = products[0];
  assert.equal(findProduct(product.slug)?.id, product.id);
  assert.match(money(product.price), /^R\$\s/);
});

test("extrai o nome do modelo sem capacidade, cor ou condição", () => {
  assert.equal(
    getBaseModelName("Apple - iPhone 17 Pro Max - 512 GB - Azul Profundo - Seminovo"),
    "Apple iPhone 17 Pro Max",
  );
});

test("agrupa variações do mesmo modelo sem misturar novos e seminovos", () => {
  const base: CatalogProduct = {
    id: "1",
    slug: "iphone-17-azul",
    name: "Apple - iPhone 17 Pro Max - 512 GB - Azul",
    brand: "Apple",
    condition: "Muito Bom",
    storage: "512 GB",
    color: "Azul",
    price: 8000,
    stock: 2,
    accent: "#123456",
    description: "Teste",
  };
  const grouped = groupCatalogProducts([
    base,
    { ...base, id: "2", slug: "iphone-17-preto", color: "Preto", price: 7800 },
    { ...base, id: "3", slug: "iphone-17-novo", condition: "Novo", price: 9000 },
  ]);

  assert.equal(grouped.length, 2);
  const seminovo = grouped.find((item) => getCatalogSection(item.condition) === "Seminovos");
  assert.equal(seminovo?.variantCount, 2);
  assert.deepEqual(seminovo?.availableColors?.sort(), ["Azul", "Preto"]);
  assert.equal(seminovo?.price, 7800);
});

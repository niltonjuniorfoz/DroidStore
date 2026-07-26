import assert from "node:assert/strict";
import test from "node:test";
import { findProduct, money, products } from "../src/lib/catalog";

test("catálogo contém somente produtos Android e 20 itens", () => {
  assert.equal(products.length, 20);
  assert.equal(products.some((product) => /iphone|ios|apple/i.test(`${product.brand} ${product.name}`)), false);
});

test("slugs e identificadores são únicos", () => {
  assert.equal(new Set(products.map((product) => product.slug)).size, products.length);
  assert.equal(new Set(products.map((product) => product.id)).size, products.length);
});

test("produto pode ser localizado e preço é formatado em real", () => {
  const product = products[0];
  assert.equal(findProduct(product.slug)?.id, product.id);
  assert.match(money(product.price), /^R\$\s/);
});

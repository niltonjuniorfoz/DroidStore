import assert from "node:assert/strict";
import test from "node:test";
import { applyProductVariant, findMatchingProductVariant, selectImagesForColor, type ProductVariantOption } from "../src/lib/productVariantSelection";
import type { CatalogProduct } from "../src/lib/catalog";

const product: CatalogProduct = {
  id: "variant-bege",
  productId: "flip8",
  sku: "SKU-BEGE",
  slug: "galaxy-z-flip8",
  name: "Samsung Galaxy Z Flip8",
  brand: "Samsung",
  condition: "Novo",
  storage: "256 GB",
  color: "Bege",
  price: 8860,
  stock: 20,
  available: true,
  accent: "#ddd",
  description: "Produto de teste",
  featured: false,
};

const variants: ProductVariantOption[] = [
  { id: "variant-bege", productId: "flip8", sku: "SKU-BEGE", slug: "galaxy-z-flip8", color: "Bege", storage: "256 GB", condition: "Novo", price: 8860, stock: 20, available: true, images: ["/bege-1.jpg"] },
  { id: "variant-grafite", productId: "flip8", sku: "SKU-GRAFITE", slug: "galaxy-z-flip8", color: "Grafite", storage: "256 GB", condition: "Novo", price: 8990, stock: 8, available: true, images: ["/grafite-1.jpg", "/grafite-2.jpg"] },
  { id: "variant-rosa", productId: "flip8", sku: "SKU-ROSA", slug: "galaxy-z-flip8", color: "Rosa", storage: "512 GB", condition: "Novo", price: 9490, stock: 3, available: true, images: ["/rosa-1.jpg"] },
];

test("seleciona exatamente outra cor mesmo quando as variações compartilham o slug", () => {
  const selected = findMatchingProductVariant(variants, "GRAFITE", "256 GB", "Novo");
  assert.equal(selected?.id, "variant-grafite");

  const updated = applyProductVariant(product, selected!);
  assert.equal(updated.id, "variant-grafite");
  assert.equal(updated.color, "Grafite");
  assert.equal(updated.price, 8990);
  assert.equal(updated.sku, "SKU-GRAFITE");
  assert.equal(updated.imageUrl, "/grafite-1.jpg");
  assert.deepEqual(updated.images, ["/grafite-1.jpg", "/grafite-2.jpg"]);
  assert.equal(updated.slug, product.slug);
});

test("faz fallback para a cor quando a capacidade atual não existe nela", () => {
  const selected = findMatchingProductVariant(variants, "Rosa", "256 GB", "Novo");
  assert.equal(selected?.id, "variant-rosa");
  assert.equal(selected?.storage, "512 GB");
});

test("seleciona somente as fotos vinculadas à cor da variante", () => {
  const selected = selectImagesForColor([
    { url: "/azul-1.jpg", color: "Azul" },
    { url: "/roxo-1.jpg", color: "Roxo (Violet)" },
    { url: "/roxo-2.jpg", color: "ROXO (VIOLET)" },
    { url: "/preto-1.jpg", color: "Preto" },
  ], "roxo (violet)");

  assert.deepEqual(selected, ["/roxo-1.jpg", "/roxo-2.jpg"]);
});

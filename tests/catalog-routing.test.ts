import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryFamilyTokens,
  matchesCategory,
  readFilterRequest,
  resolveFilterOptionSlug,
} from "../src/lib/catalogRouting";

const options = [
  { label: "Notebook", slug: "notebook" },
  { label: "Tablets", slug: "tablets" },
  { label: "Smartwatch", slug: "smartwatch" },
];

test("aceita cat como alias da categoria cadastrada", () => {
  const params = new URLSearchParams("cat=notebook");
  assert.equal(readFilterRequest(params, "categoria"), "notebook");
  assert.equal(resolveFilterOptionSlug("notebook", options), "notebook");
});

test("resolve diferenças de singular e plural nas rotas", () => {
  assert.equal(resolveFilterOptionSlug("tablet", options), "tablets");
});

test("categorias virtuais agrupam somente os produtos relacionados", () => {
  assert.deepEqual(categoryFamilyTokens("smartphones"), ["smartphone", "smartphones", "celular", "celulares", "iphone"]);
  assert.equal(resolveFilterOptionSlug("smartphones", options), "smartphones");
  assert.equal(resolveFilterOptionSlug("eletronicos", options), "eletronicos");
  assert.equal(matchesCategory(["iphone"], "smartphones"), true);
  assert.equal(matchesCategory(["gps-rastreador-e-localizador"], "eletronicos"), true);
  assert.equal(matchesCategory(["cabos-e-adaptadores"], "acessorios"), true);
  assert.equal(matchesCategory(["iphone"], "acessorios"), false);
  assert.equal(matchesCategory(["notebook"], "notebook"), true);
  assert.equal(matchesCategory(["macbook"], "notebook"), true);
  assert.equal(matchesCategory(["smartphones"], "notebook"), false);
  assert.equal(matchesCategory(["console-portatil"], "games"), true);
});

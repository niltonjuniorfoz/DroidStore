import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HOME_FEATURED_TITLE,
  DEFAULT_HOME_PRODUCT_SECTIONS,
  DEFAULT_HOME_PROMO_BANNERS,
  readHomeFeaturedTitle,
  readHomeProductSections,
  readHomePromoBanners,
} from "../src/lib/homeContent";

test("configuração da Home usa os dois banners e prateleiras padrão", () => {
  assert.equal(readHomeFeaturedTitle(null), DEFAULT_HOME_FEATURED_TITLE);
  assert.deepEqual(readHomePromoBanners(null), DEFAULT_HOME_PROMO_BANNERS);
  assert.deepEqual(readHomeProductSections(null), DEFAULT_HOME_PRODUCT_SECTIONS);
});

test("configuração salva substitui os textos sem perder campos ausentes", () => {
  const value = {
    homeFeaturedTitle: "Escolhas da semana",
    homePromoBanners: [{ title: "iPhones selecionados" }],
    homeProductSections: [{ title: "Xiaomi em oferta", query: "xiaomi, poco" }],
  };

  assert.equal(readHomeFeaturedTitle(value), "Escolhas da semana");
  assert.equal(readHomePromoBanners(value)[0].title, "iPhones selecionados");
  assert.equal(readHomePromoBanners(value)[0].buttonLabel, DEFAULT_HOME_PROMO_BANNERS[0].buttonLabel);
  assert.equal(readHomeProductSections(value)[0].query, "xiaomi, poco");
  assert.equal(readHomeProductSections(value)[1].title, DEFAULT_HOME_PRODUCT_SECTIONS[1].title);
});

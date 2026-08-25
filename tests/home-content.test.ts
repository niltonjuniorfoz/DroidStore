import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_HOME_FEATURED_TITLE,
  DEFAULT_HOME_FOOTER_BANNER,
  DEFAULT_HOME_PRODUCT_SECTIONS,
  DEFAULT_HOME_PROMO_BANNERS,
  readHomeFeaturedTitle,
  readHomeFooterBanner,
  readHomeProductSections,
  readHomePromoBanners,
} from "../src/lib/homeContent";

test("configuração da Home usa os dois banners e prateleiras padrão", () => {
  assert.equal(readHomeFeaturedTitle(null), DEFAULT_HOME_FEATURED_TITLE);
  assert.deepEqual(readHomePromoBanners(null), DEFAULT_HOME_PROMO_BANNERS);
  assert.deepEqual(readHomeFooterBanner(null), DEFAULT_HOME_FOOTER_BANNER);
  assert.deepEqual(readHomeProductSections(null), DEFAULT_HOME_PRODUCT_SECTIONS);
});

test("configuração salva substitui os textos sem perder campos ausentes", () => {
  const value = {
    homeFeaturedTitle: "Escolhas da semana",
    homeFooterBanner: { active: false, linkHref: "/ofertas" },
    homePromoBanners: [{ title: "iPhones selecionados" }],
    homeProductSections: [{ title: "Xiaomi em oferta", query: "xiaomi, poco" }],
  };

  assert.equal(readHomeFeaturedTitle(value), "Escolhas da semana");
  assert.equal(readHomeFooterBanner(value).active, false);
  assert.equal(readHomeFooterBanner(value).linkHref, "/ofertas");
  assert.equal(readHomeFooterBanner(value).imageUrl, DEFAULT_HOME_FOOTER_BANNER.imageUrl);
  assert.equal(readHomePromoBanners(value)[0].title, "iPhones selecionados");
  assert.equal(readHomePromoBanners(value)[0].buttonLabel, DEFAULT_HOME_PROMO_BANNERS[0].buttonLabel);
  assert.equal(readHomeProductSections(value)[0].query, "xiaomi, poco");
  assert.equal(readHomeProductSections(value)[1].title, DEFAULT_HOME_PRODUCT_SECTIONS[1].title);
});

test("upload de imagens da vitrine permanece disponível sem Vercel Blob", () => {
  const root = join(import.meta.dirname, "..");
  const uploadRoute = readFileSync(join(root, "app", "api", "admin", "upload", "route.ts"), "utf8");
  const mediaRoute = readFileSync(join(root, "app", "api", "media", "admin-upload", "[id]", "route.ts"), "utf8");
  const uploadClient = readFileSync(join(root, "src", "lib", "uploadClient.ts"), "utf8");
  assert.match(uploadRoute, /adminMediaAsset\.create/);
  assert.match(uploadRoute, /DATABASE_IMAGE_MAX_BYTES/);
  assert.match(mediaRoute, /adminMediaAsset\.findUnique/);
  assert.match(uploadClient, /return uploadThroughServer\(\)/);
});

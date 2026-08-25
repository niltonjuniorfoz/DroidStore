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
import {
  DEFAULT_STOREFRONT_NAVIGATION,
  isLegacyStorefrontNavigation,
  resolveStorefrontNavigation,
} from "../src/lib/storefrontNavigation";

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

test("prateleiras da home consultam seus próprios produtos sem limite global", () => {
  const root = join(import.meta.dirname, "..");
  const home = readFileSync(join(root, "app", "page.tsx"), "utf8");
  const storefront = readFileSync(join(root, "src", "lib", "storefront.ts"), "utf8");
  assert.match(home, /getProductsForSection\(section\.query, 5\)/);
  assert.match(storefront, /export async function getProductsForSection/);
  assert.match(storefront, /filterSelections/);
});

test("menu legado de marcas migra para departamentos editáveis", () => {
  const legacy = [
    { label: "iPhone", href: "/celulares?brand=Apple" },
    { label: "Samsung", href: "/celulares?brand=Samsung" },
    { label: "Motorola", href: "/celulares?brand=Motorola" },
    { label: "Xiaomi", href: "/celulares?brand=Xiaomi" },
  ];
  assert.equal(isLegacyStorefrontNavigation(legacy), true);
  assert.deepEqual(resolveStorefrontNavigation(legacy), DEFAULT_STOREFRONT_NAVIGATION.map(({ label, href }) => ({ label, href })));
  assert.deepEqual(DEFAULT_STOREFRONT_NAVIGATION.map((item) => item.label), [
    "Smartphones", "Informática", "Eletrônicos", "Smartwatch", "Tablets", "Seminovos", "Outlet",
  ]);
});

test("mega menu público usa a navegação salva no painel", () => {
  const root = join(import.meta.dirname, "..");
  const megaMenu = readFileSync(join(root, "src", "components", "MegaMenu.tsx"), "utf8");
  const admin = readFileSync(join(root, "app", "admin", "conteudo", "page.tsx"), "utf8");
  assert.match(megaMenu, /customNavigation\.length \? customNavigation\.slice/);
  assert.match(megaMenu, /navigation\.map/);
  assert.match(admin, /Categorias do cabeçalho/);
  assert.match(admin, /restoreRecommendedNavigation/);
});

export type HomePromoBanner = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonLabel: string;
  buttonHref: string;
};

export type HomeProductSection = {
  title: string;
  query: string;
  buttonLabel: string;
  buttonHref: string;
};

export type HomeFooterBanner = {
  imageUrl: string;
  linkHref: string;
  active: boolean;
};

export type HomeOutletSection = {
  title: string;
  buttonLabel: string;
  buttonHref: string;
  active: boolean;
};

export type HomeBrandShowcase = {
  title: string;
  query: string;
  buttonLabel: string;
  buttonHref: string;
  bannerImageUrl: string;
  active: boolean;
};

export const DEFAULT_HOME_FEATURED_TITLE = "Mais vendidos";

export const DEFAULT_HOME_PROMO_BANNERS: HomePromoBanner[] = [
  {
    eyebrow: "IPHONES REVISADOS",
    title: "Seminovos premium com garantia",
    description: "iPhones revisados, com procedência e garantia para você comprar com confiança.",
    imageUrl: "/home-banners/seminovos-premium.png",
    buttonLabel: "Ver seminovos",
    buttonHref: "/celulares?condition=Excelente",
  },
  {
    eyebrow: "NOTEBOOKS GAMER",
    title: "Potência para jogar sem limites",
    description: "Notebooks gamer no estilo ASUS ROG Strix, com desempenho e refrigeração de alto nível.",
    imageUrl: "/home-banners/informatica-notebooks.png",
    buttonLabel: "Ver informática",
    buttonHref: "/celulares?categoria=notebook",
  },
];

export const DEFAULT_HOME_FOOTER_BANNER: HomeFooterBanner = {
  imageUrl: "/home-banners/aura-tech-footer-banner.png",
  linkHref: "/celulares",
  active: true,
};

export const DEFAULT_HOME_OUTLET_SECTION: HomeOutletSection = {
  title: "Outlet",
  buttonLabel: "Ver todos",
  buttonHref: "/celulares?condition=Outlet",
  active: true,
};

export const DEFAULT_HOME_GARMIN_SHOWCASE: HomeBrandShowcase = {
  title: "Garmin",
  query: "garmin",
  buttonLabel: "Ver todos",
  buttonHref: "/celulares?brand=Garmin",
  bannerImageUrl: "/home-banners/garmin-line.png",
  active: true,
};

export const DEFAULT_HOME_PRODUCT_SECTIONS: HomeProductSection[] = [
  {
    title: "Xiaomi",
    query: "xiaomi",
    buttonLabel: "Ver todos",
    buttonHref: "/celulares?q=xiaomi",
  },
  {
    title: "Informática",
    query: "informática, notebook, macbook, computador, gamer, rog, strix",
    buttonLabel: "Ver todos",
    buttonHref: "/celulares?categoria=notebook",
  },
];

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function readHomeFeaturedTitle(value: unknown) {
  const source = record(value);
  return text(source?.homeFeaturedTitle, DEFAULT_HOME_FEATURED_TITLE);
}

export function readHomePromoBanners(value: unknown): HomePromoBanner[] {
  const source = record(value);
  const saved = Array.isArray(source?.homePromoBanners) ? source.homePromoBanners : [];
  return DEFAULT_HOME_PROMO_BANNERS.map((fallback, index) => {
    const item = record(saved[index]);
    return {
      eyebrow: text(item?.eyebrow, fallback.eyebrow),
      title: text(item?.title, fallback.title),
      description: text(item?.description, fallback.description),
      imageUrl: text(item?.imageUrl, fallback.imageUrl),
      buttonLabel: text(item?.buttonLabel, fallback.buttonLabel),
      buttonHref: text(item?.buttonHref, fallback.buttonHref),
    };
  });
}

export function readHomeProductSections(value: unknown): HomeProductSection[] {
  const source = record(value);
  const saved = Array.isArray(source?.homeProductSections) ? source.homeProductSections : [];
  return DEFAULT_HOME_PRODUCT_SECTIONS.map((fallback, index) => {
    const item = record(saved[index]);
    return {
      title: text(item?.title, fallback.title),
      query: text(item?.query, fallback.query),
      buttonLabel: text(item?.buttonLabel, fallback.buttonLabel),
      buttonHref: text(item?.buttonHref, fallback.buttonHref),
    };
  });
}

export function readHomeFooterBanner(value: unknown): HomeFooterBanner {
  const source = record(value);
  const saved = record(source?.homeFooterBanner);
  return {
    imageUrl: text(saved?.imageUrl, DEFAULT_HOME_FOOTER_BANNER.imageUrl),
    linkHref: text(saved?.linkHref, DEFAULT_HOME_FOOTER_BANNER.linkHref),
    active: typeof saved?.active === "boolean" ? saved.active : DEFAULT_HOME_FOOTER_BANNER.active,
  };
}

export function readHomeOutletSection(value: unknown): HomeOutletSection {
  const source = record(value);
  const saved = record(source?.homeOutletSection);
  return {
    title: text(saved?.title, DEFAULT_HOME_OUTLET_SECTION.title),
    buttonLabel: text(saved?.buttonLabel, DEFAULT_HOME_OUTLET_SECTION.buttonLabel),
    buttonHref: text(saved?.buttonHref, DEFAULT_HOME_OUTLET_SECTION.buttonHref),
    active: typeof saved?.active === "boolean" ? saved.active : DEFAULT_HOME_OUTLET_SECTION.active,
  };
}

export function readHomeGarminShowcase(value: unknown): HomeBrandShowcase {
  const source = record(value);
  const saved = record(source?.homeGarminShowcase);
  return {
    title: text(saved?.title, DEFAULT_HOME_GARMIN_SHOWCASE.title),
    query: text(saved?.query, DEFAULT_HOME_GARMIN_SHOWCASE.query),
    buttonLabel: text(saved?.buttonLabel, DEFAULT_HOME_GARMIN_SHOWCASE.buttonLabel),
    buttonHref: text(saved?.buttonHref, DEFAULT_HOME_GARMIN_SHOWCASE.buttonHref),
    bannerImageUrl: text(saved?.bannerImageUrl, DEFAULT_HOME_GARMIN_SHOWCASE.bannerImageUrl),
    active: typeof saved?.active === "boolean" ? saved.active : DEFAULT_HOME_GARMIN_SHOWCASE.active,
  };
}

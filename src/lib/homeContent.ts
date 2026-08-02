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

export const DEFAULT_HOME_FEATURED_TITLE = "Mais vendidos";

export const DEFAULT_HOME_PROMO_BANNERS: HomePromoBanner[] = [
  {
    eyebrow: "IPHONES REVISADOS",
    title: "Seminovos premium com garantia",
    description: "iPhones revisados, com procedência e garantia para você comprar com confiança.",
    imageUrl: "/home-banners/seminovos-premium.png",
    buttonLabel: "Ver seminovos",
    buttonHref: "/celulares?condition=Seminovos",
  },
  {
    eyebrow: "NOTEBOOKS GAMER",
    title: "Potência para jogar sem limites",
    description: "Notebooks gamer no estilo ASUS ROG Strix, com desempenho e refrigeração de alto nível.",
    imageUrl: "/home-banners/informatica-notebooks.png",
    buttonLabel: "Ver informática",
    buttonHref: "/celulares?q=notebook",
  },
];

export const DEFAULT_HOME_PRODUCT_SECTIONS: HomeProductSection[] = [
  {
    title: "Xiaomi",
    query: "xiaomi",
    buttonLabel: "Ver todos",
    buttonHref: "/celulares?q=xiaomi",
  },
  {
    title: "Informática",
    query: "informática, notebook, computador, gamer, rog, strix",
    buttonLabel: "Ver todos",
    buttonHref: "/celulares?q=notebook",
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

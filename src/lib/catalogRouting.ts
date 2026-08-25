type SearchParamsReader = { get(name: string): string | null };
type FilterOptionLike = { label: string; slug: string };

const CATEGORY_PARAMS = ["categoria", "tipo-de-produto", "cat", "category"];
const VIRTUAL_CATEGORIES = new Set(["smartphones", "eletronicos", "acessorios", "informatica", "games", "tv-audio", "drones"]);

const CATEGORY_FAMILIES: Record<string, string[]> = {
  smartphones: ["smartphone", "smartphones", "celular", "celulares", "iphone"],
  notebook: ["notebook", "macbook"],
  eletronicos: [
    "smartwatch", "gps-rastreador-e-localizador", "equipamentos-para-pesca", "utensilios",
    "caixas-de-som", "microfone", "fone-de-ouvido-headset", "rede-e-internet",
  ],
  acessorios: [
    "cases-e-peliculas", "cabos-e-adaptadores", "carregadores", "suportes-e-tripes",
    "mochilas-e-cases", "cartao-de-memoria-e-sd", "mouses", "pendrives", "teclado",
    "caixas-de-som", "microfone", "fone-de-ouvido-headset",
  ],
  informatica: [
    "notebook", "macbook", "computador-desktop", "imac", "mac-mini", "impressoras-3d",
    "mouses", "pendrives", "rede-e-internet", "processadores", "teclado",
  ],
  drones: ["drone", "drones", "quadricoptero", "quadricopteros"],
  games: ["joystick-e-gamepads", "consoles", "video-game-retro", "console-portatil", "jogos"],
  "tv-audio": ["caixas-de-som", "microfone", "fone-de-ouvido-headset"],
};

export function normalizeCatalogToken(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function isCategoryFilterSlug(slug: string) {
  return slug === "categoria" || slug === "tipo-de-produto";
}

export function readFilterRequest(params: SearchParamsReader, filterSlug: string) {
  if (isCategoryFilterSlug(filterSlug)) {
    for (const key of CATEGORY_PARAMS) {
      const value = params.get(key);
      if (value) return value;
    }
    return null;
  }
  return params.get(filterSlug) ?? (filterSlug === "marca" ? params.get("brand") : null);
}

export function resolveFilterOptionSlug(requested: string, options: FilterOptionLike[]) {
  const token = normalizeCatalogToken(requested);
  const exact = options.find((option) =>
    normalizeCatalogToken(option.slug) === token || normalizeCatalogToken(option.label) === token,
  );
  if (exact) return exact.slug;

  const singularToken = token.endsWith("s") ? token.slice(0, -1) : token;
  const singular = options.find((option) => {
    const optionToken = normalizeCatalogToken(option.slug);
    return (optionToken.endsWith("s") ? optionToken.slice(0, -1) : optionToken) === singularToken;
  });
  if (singular) return singular.slug;
  return VIRTUAL_CATEGORIES.has(token) ? token : null;
}

export function matchesCategory(productCategorySlugs: string[], selectedCategory: string) {
  const selected = normalizeCatalogToken(selectedCategory);
  const productSlugs = productCategorySlugs.map(normalizeCatalogToken);
  const family = CATEGORY_FAMILIES[selected];
  return family ? productSlugs.some((slug) => family.includes(slug)) : productSlugs.includes(selected);
}

export function categoryFamilyTokens(selectedCategory: string) {
  const selected = normalizeCatalogToken(selectedCategory);
  return CATEGORY_FAMILIES[selected] ?? [selected];
}

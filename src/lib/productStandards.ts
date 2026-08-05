export const PRODUCT_CONDITIONS = ["NOVO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"] as const;

export const IPHONE_COLOR_OPTIONS = [
  "PRETO",
  "BRANCO",
  "PRATEADO",
  "DOURADO",
  "GRAFITE",
  "TITANIO NATURAL",
  "TITANIO BRANCO",
  "TITANIO AZUL",
  "TITANIO PRETO",
  "DESERTO",
  "AZUL",
  "AZUL PROFUNDO",
  "VERDE",
  "VERDE ALPINO",
  "ROSA",
  "ROXO",
  "AMARELO",
  "VERMELHO",
  "LARANJA",
] as const;

export const PHONE_STORAGE_OPTIONS = [
  "32 GB",
  "64 GB",
  "128 GB",
  "256 GB",
  "512 GB",
  "1 TB",
  "2 TB",
] as const;

export const NOTEBOOK_STORAGE_OPTIONS = [
  "4 GB",
  "8 GB",
  "16 GB",
  "32 GB",
  "64 GB",
  "128 GB",
  "256 GB",
  "512 GB",
  "1 TB",
  "2 TB",
  "4 TB",
] as const;

export const ALL_STORAGE_OPTIONS: string[] = Array.from(new Set([
  ...PHONE_STORAGE_OPTIONS,
  ...NOTEBOOK_STORAGE_OPTIONS,
]));

export function normalizeProductColor(value: string) {
  return value.trim().toLocaleUpperCase("pt-BR");
}

export function getProductColorHex(value?: string) {
  if (!value) return "#d1d5db";
  const color = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (color.includes("desert") || color.includes("deserto")) return "#c7a27c";
  if (color.includes("titanio natural") || color.includes("natural titanium")) return "#a9a39a";
  if (color.includes("titanio branco") || color.includes("white titanium")) return "#e7e4dd";
  if (color.includes("titanio azul") || color.includes("blue titanium")) return "#667886";
  if (color.includes("titanio preto") || color.includes("black titanium")) return "#3f4244";
  if (color.includes("rose gold") || color.includes("ouro rosa")) return "#d8a39a";
  if (color.includes("laranja") || color.includes("orange") || color.includes("cosmico")) return "#f26a2e";
  if (color.includes("preto") || color.includes("black") || color.includes("meia-noite") || color.includes("noite")) return "#20242a";
  if (color.includes("branco") || color.includes("white") || color.includes("estelar")) return "#f4f1e8";
  if (color.includes("prata") || color.includes("pratead") || color.includes("silver")) return "#d7d9d8";
  if (color.includes("cinza") || color.includes("gray") || color.includes("grey") || color.includes("grafite") || color.includes("titanio")) return "#777b80";
  if (color.includes("amarelo") || color.includes("yellow")) return "#f4d35e";
  if (color.includes("roxo") || color.includes("purple") || color.includes("lilas")) return "#9b7ed8";
  // Variantes específicas antes do genérico, senão "verde alpino" e "azul
  // profundo" caem na cor base e ficam idênticas ao tom simples na paleta.
  if (color.includes("alpino") || color.includes("alpine")) return "#4d7a63";
  if (color.includes("verde") || color.includes("green")) return "#79a58c";
  if (color.includes("vermelho") || color.includes("red")) return "#d9474f";
  if (color.includes("profundo") || color.includes("meia noite azul") || color.includes("midnight blue")) return "#2f4a68";
  if (color.includes("azul") || color.includes("blue")) return "#5d83a7";
  if (color.includes("rosa") || color.includes("pink") || color.includes("rose")) return "#e5a6b4";
  if (color.includes("dourado") || color.includes("gold")) return "#d6b36a";
  return "#d1d5db";
}

export function normalizeProductStorage(value: string) {
  const normalized = value.trim().toLocaleUpperCase("pt-BR").replace(/\s+SSD$/, "");
  const match = normalized.match(/^(\d+)\s*(GB|TB|G|T)$/);
  if (!match) return normalized;
  const unit = match[2] === "G" ? "GB" : match[2] === "T" ? "TB" : match[2];
  return `${Number(match[1])} ${unit}`;
}

export function isSupportedProductStorage(value: string) {
  return ALL_STORAGE_OPTIONS.includes(normalizeProductStorage(value));
}

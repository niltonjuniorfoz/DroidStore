export const PRODUCT_CONDITIONS = ["NOVO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"] as const;

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

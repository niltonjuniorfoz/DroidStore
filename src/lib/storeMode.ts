export const STORE_MODES = ["INVENTORY", "DROPSHIPPING"] as const;

export type StoreModeValue = (typeof STORE_MODES)[number];

export const DEFAULT_STORE_MODE: StoreModeValue = "INVENTORY";

export function normalizeStoreMode(value: unknown): StoreModeValue {
  return value === "DROPSHIPPING" ? "DROPSHIPPING" : DEFAULT_STORE_MODE;
}

export function isVariantAvailable(input: {
  storeMode: StoreModeValue;
  stock: number;
  dropshipAvailable?: boolean | null;
}): boolean {
  return input.storeMode === "DROPSHIPPING"
    ? input.dropshipAvailable === true
    : input.stock > 0;
}

export function isCatalogProductAvailable(product: {
  available?: boolean;
  stock: number;
}): boolean {
  return product.available ?? product.stock > 0;
}

export function reservesInventory(storeMode: StoreModeValue): boolean {
  return storeMode === "INVENTORY";
}

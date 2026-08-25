export type StorefrontNavigationItem = {
  id?: string;
  label: string;
  href: string;
  active?: boolean;
};

export const DEFAULT_STOREFRONT_NAVIGATION: StorefrontNavigationItem[] = [
  { label: "Smartphones", href: "/celulares?categoria=smartphones", active: true },
  { label: "Informática", href: "/celulares?categoria=notebook", active: true },
  { label: "Eletrônicos", href: "/celulares?categoria=eletronicos", active: true },
  { label: "Smartwatch", href: "/celulares?categoria=smartwatch", active: true },
  { label: "Tablets", href: "/celulares?categoria=tablets", active: true },
  { label: "Seminovos", href: "/celulares?condition=Excelente", active: true },
  { label: "Outlet", href: "/celulares?condition=Outlet", active: true },
];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function isLegacyStorefrontNavigation(items: StorefrontNavigationItem[]) {
  const labels = new Set(items.map((item) => normalized(item.label)));
  const legacyBrands = ["iphone", "samsung", "motorola", "xiaomi"].filter((label) => labels.has(label));
  return legacyBrands.length >= 3 && !labels.has("smartphones") && !labels.has("informatica");
}

export function resolveStorefrontNavigation(items: StorefrontNavigationItem[]) {
  const activeItems = items.filter((item) => item.active !== false && item.label.trim() && item.href.startsWith("/"));
  const resolved = !activeItems.length || isLegacyStorefrontNavigation(activeItems)
    ? DEFAULT_STOREFRONT_NAVIGATION
    : activeItems;
  return resolved.slice(0, 8).map((item) => ({ label: item.label, href: item.href }));
}

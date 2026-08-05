export type CatalogProduct = {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  brand: string;
  condition: "Novo" | "Novo Reembalado" | "Excelente" | "Muito Bom" | "Bom" | "Outlet";
  storage: string;
  color: string;
  price: number;
  stock: number;
  accent: string;
  imageUrl?: string;
  model3dUrl?: string | null;
  /** Desconto PIX próprio do produto (%). Ausente = usa o padrão da loja. */
  pixDiscountPct?: number;
  /** Tabela de parcelas própria: total por número de parcelas. */
  installmentPlan?: Array<{ n: number; price: number }>;
  images?: string[];
  specifications?: Array<{ label: string; value: string }>;
  filters?: Array<{
    groupId: string;
    groupName: string;
    groupSlug: string;
    optionId: string;
    optionLabel: string;
    optionSlug: string;
  }>;
  description: string;
  featured?: boolean;
  variantCount?: number;
  availableColors?: string[];
  availableStorages?: string[];
  catalogSection?: CatalogSection;
};

export type CatalogSection = "Novos" | "Seminovos";

const NEW_CONDITIONS = new Set<CatalogProduct["condition"]>(["Novo"]);

export function getCatalogSection(condition: CatalogProduct["condition"]): CatalogSection {
  return NEW_CONDITIONS.has(condition) ? "Novos" : "Seminovos";
}

export function getBaseModelName(name: string): string {
  return name
    .replace(/\s*-\s*(seminovo|novo reembalado|novo|excelente|muito bom|bom|outlet)\s*$/i, "")
    .replace(/\s*-\s*\d+\s*(GB|TB)(?:\s*SSD)?\b.*$/i, "")
    .replace(/\s+\d+\s*(GB|TB)(?:\s*SSD)?\b.*$/i, "")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function familyKey(product: CatalogProduct): string {
  return `${getCatalogSection(product.condition)}:${getBaseModelName(product.name)}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function groupCatalogProducts(items: CatalogProduct[]): CatalogProduct[] {
  const families = new Map<string, CatalogProduct[]>();

  for (const product of items) {
    const key = familyKey(product);
    const current = families.get(key);
    if (current) current.push(product);
    else families.set(key, [product]);
  }

  return Array.from(families.values()).map((family) => {
    const sorted = [...family].sort((a, b) => {
      if ((a.stock > 0) !== (b.stock > 0)) return a.stock > 0 ? -1 : 1;
      return a.price - b.price;
    });
    const representative = sorted[0];
    const colors = Array.from(new Set(family.map((item) => item.color).filter(Boolean)));
    const storages = Array.from(new Set(family.map((item) => item.storage).filter(Boolean)));

    return {
      ...representative,
      name: getBaseModelName(representative.name),
      price: Math.min(...family.map((item) => item.price)),
      stock: family.reduce((total, item) => total + Math.max(0, item.stock), 0),
      variantCount: family.length,
      availableColors: colors,
      availableStorages: storages,
      catalogSection: getCatalogSection(representative.condition),
    };
  });
}

const names = [
  ["Apple", "iPhone 15 Pro", "256 GB", "Titânio Natural"],
  ["Apple", "iPhone 14", "128 GB", "Estelar"],
  ["Apple", "iPhone 13", "128 GB", "Preto"],
  ["Apple", "iPhone 12", "64 GB", "Azul"],
  ["Apple", "iPhone 11", "64 GB", "Roxo"],
  ["Samsung", "Galaxy S24", "256 GB", "Grafite"],
  ["Samsung", "Galaxy A55", "128 GB", "Azul"],
  ["Samsung", "Galaxy S23 FE", "256 GB", "Verde"],
  ["Motorola", "Edge 50 Fusion", "256 GB", "Azul"],
  ["Motorola", "Moto G85", "256 GB", "Grafite"],
  ["Xiaomi", "Redmi Note 13 Pro", "256 GB", "Preto"],
  ["Xiaomi", "Redmi Note 13", "128 GB", "Verde"],
  ["Acer", "Aspire 5", "512 GB SSD", "Prata"],
  ["Acer", "Nitro 5", "1 TB SSD", "Preto"],
  ["Google", "Pixel 8", "128 GB", "Rosa"],
  ["Poco", "Poco X6 Pro", "512 GB", "Amarelo"],
] as const;

const conditions: CatalogProduct["condition"][] = [
  "Novo", "Excelente", "Novo", "Muito Bom", "Novo",
  "Excelente", "Outlet", "Novo", "Bom", "Novo",
  "Muito Bom", "Excelente", "Novo", "Outlet", "Novo", "Excelente",
];
const prices = [6899, 4499, 3499, 2799, 1999, 3899, 1899, 2799, 2299, 1699, 1899, 1299, 3199, 4299, 3599, 2399];
const accents = ["#0f766e", "#2563eb", "#16a34a", "#7c3aed", "#0369a1", "#334155", "#d97706", "#111827", "#047857", "#eab308", "#7e22ce", "#1d4ed8", "#15803d", "#18181b", "#db2777", "#0284c7"];

export const products: CatalogProduct[] = names.map(([brand, model, storage, color], index) => {
  const isNotebook = brand === "Acer" || model.includes("MacBook") || model.includes("Aspire") || model.includes("Nitro");
  const categorySlug = isNotebook ? "notebooks" : "smartphones";
  const categoryLabel = isNotebook ? "Notebooks" : "Smartphones";

  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    slug: `${brand}-${model}-${storage}-${color}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: `${brand} - ${model} - ${storage} - ${color}`,
    brand,
    condition: conditions[index],
    storage,
    color,
    price: prices[index],
    stock: index === 6 ? 0 : index % 7 === 0 ? 2 : 8 + index,
    accent: accents[index],
    images: [],
    specifications: [
      { label: "Marca", value: brand },
      { label: "Modelo", value: model },
      { label: "Armazenamento", value: storage },
      { label: "Cor", value: color },
      { label: "Sistema operacional", value: brand === "Apple" ? "iOS" : isNotebook ? "Windows 11" : "Android" },
      { label: "Condição", value: conditions[index] },
    ],
    filters: [
      { groupId: "filter-brand", groupName: "Marca", groupSlug: "marca", optionId: `brand-${brand}`, optionLabel: brand, optionSlug: brand.toLowerCase() },
      { groupId: "filter-product-type", groupName: "Tipo de produto", groupSlug: "tipo-de-produto", optionId: `type-${categorySlug}`, optionLabel: categoryLabel, optionSlug: categorySlug },
    ],
    description: `${model} revisado com procedência e garantia.`,
  };
});


export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const findProduct = (slug: string) => products.find((product) => product.slug === slug);

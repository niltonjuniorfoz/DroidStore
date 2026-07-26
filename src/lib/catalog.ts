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
};

const names = [
  ["Samsung", "Galaxy S24", "256 GB", "Grafite"],
  ["Samsung", "Galaxy A55", "128 GB", "Azul"],
  ["Samsung", "Galaxy S23 FE", "256 GB", "Verde"],
  ["Samsung", "Galaxy A35", "128 GB", "Lilás"],
  ["Motorola", "Edge 50 Fusion", "256 GB", "Azul"],
  ["Motorola", "Moto G85", "256 GB", "Grafite"],
  ["Motorola", "Razr 40", "256 GB", "Creme"],
  ["Xiaomi", "Redmi Note 13 Pro", "256 GB", "Preto"],
  ["Xiaomi", "Redmi Note 13", "128 GB", "Verde"],
  ["Poco", "Poco X6 Pro", "512 GB", "Amarelo"],
  ["Poco", "Poco M6 Pro", "256 GB", "Roxo"],
  ["Realme", "Realme 12 Pro", "256 GB", "Azul"],
  ["Realme", "Realme C67", "128 GB", "Verde"],
  ["ASUS", "Zenfone 10", "256 GB", "Preto"],
  ["Google", "Pixel 8", "128 GB", "Rosa"],
  ["Google", "Pixel 7a", "128 GB", "Azul"],
  ["Nothing", "Phone (2a)", "256 GB", "Branco"],
  ["Samsung", "Galaxy S22 Ultra", "256 GB", "Bordô"],
  ["Motorola", "Edge 40 Neo", "256 GB", "Verde"],
  ["Xiaomi", "Xiaomi 13 Lite", "256 GB", "Rosa"],
] as const;

const conditions: CatalogProduct["condition"][] = [
  "Novo", "Excelente", "Novo Reembalado", "Muito Bom", "Novo",
  "Excelente", "Outlet", "Novo", "Bom", "Novo",
  "Muito Bom", "Excelente", "Novo Reembalado", "Outlet", "Novo",
  "Excelente", "Novo", "Muito Bom", "Bom", "Excelente",
];
const prices = [3899, 1899, 2799, 1399, 2299, 1699, 2999, 1899, 1299, 2399, 1399, 2199, 999, 3299, 3599, 2399, 2499, 3199, 1599, 1899];
const accents = ["#0f766e", "#2563eb", "#16a34a", "#7c3aed", "#0369a1", "#334155", "#d97706", "#111827", "#047857", "#eab308", "#7e22ce", "#1d4ed8", "#15803d", "#18181b", "#db2777", "#0284c7", "#d4d4d8", "#9f1239", "#059669", "#e11d48"];

export const products: CatalogProduct[] = names.map(([brand, model, storage, color], index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  slug: `${brand}-${model}-${storage}-${color}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name: `${brand} ${model} ${storage}`,
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
    { label: "Sistema operacional", value: "Android" },
    { label: "Condição", value: conditions[index] },
  ],
  filters: [
    { groupId: "filter-brand", groupName: "Marca", groupSlug: "marca", optionId: `brand-${brand}`, optionLabel: brand, optionSlug: brand.toLowerCase() },
    { groupId: "filter-product-type", groupName: "Tipo de produto", groupSlug: "tipo-de-produto", optionId: "type-smartphones", optionLabel: "Smartphones", optionSlug: "smartphones" },
  ],
  description: `${model} Android revisado, com nota fiscal, procedência verificada e garantia. Dados fictícios para demonstração da loja.`,
}));

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const findProduct = (slug: string) => products.find((product) => product.slug === slug);

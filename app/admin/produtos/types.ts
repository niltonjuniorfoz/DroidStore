// Tipos e helpers compartilhados das telas de produtos do admin.

export type AdminVariant = {
  id: string;
  price: string;
  costPrice?: string;
  stock: number;
  lowStockThreshold: number;
  storage?: string;
  color?: string;
  condition: string;
  sku?: string;
};

export type Specification = { id?: string; label: string; value: string };
export type ProductImage = { id?: string; url: string; color?: string; position?: number };
export type FilterOption = { id: string; label: string; active: boolean };
export type CatalogFilter = { id: string; name: string; slug: string; active: boolean; options: FilterOption[] };

export type AdminProduct = {
  id: string;
  name: string;
  brand: string;
  description?: string;
  active: boolean;
  featured: boolean;
  imageUrl?: string;
  model3dUrl?: string | null;
  images?: ProductImage[];
  specifications?: Specification[];
  filterSelections?: Array<{ option: { id: string; filterId: string; label: string; filter: { id: string; name: string; slug: string } } }>;
  variants: AdminVariant[];
};

export type GroupedModel = {
  modelKey: string;
  modelName: string;
  brand: string;
  items: AdminProduct[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  colors: string[];
  storages: string[];
  conditions: string[];
  featured: boolean;
};

export const emptyImages = () => ["", "", "", ""];

export function getBaseModelName(name: string) {
  return name.replace(/\s*-\s*\d+\s*(GB|TB).*/i, "").replace(/\s*-\s*(Seminovo|Novo|Excelente|Muito Bom|Outlet|Reembalado).*/i, "").trim();
}

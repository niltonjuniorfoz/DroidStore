import type { Condition, Prisma } from "@prisma/client";
import type { CatalogProduct, CatalogSection } from "./catalog";
import { categoryFamilyTokens } from "./catalogRouting";
import prisma from "./prisma";
import { getStoreMode, mapProduct } from "./storefront";

export type CatalogSort = "relevance" | "low" | "high";

export type CatalogPageInput = {
  page?: number;
  pageSize?: number;
  query?: string;
  brand?: string;
  category?: string;
  storage?: string;
  section?: CatalogSection;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
};

export type CatalogFacetOption = {
  id: string;
  label: string;
  slug: string;
};

export type CatalogPageResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  facets: {
    brands: string[];
    categories: CatalogFacetOption[];
    storages: string[];
    price: { min: number; max: number };
  };
};

const SECTION_CONDITIONS: Record<CatalogSection, Condition[]> = {
  Novos: ["NOVO", "NOVO_REEMBALADO"],
  Seminovos: ["EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"],
};

const CONDITION_CODES: Record<string, Condition> = {
  Novo: "NOVO",
  "Novo Reembalado": "NOVO_REEMBALADO",
  Excelente: "EXCELENTE",
  "Muito Bom": "MUITO_BOM",
  Bom: "BOM",
  Outlet: "OUTLET",
};

const VIRTUAL_CATEGORIES: CatalogFacetOption[] = [
  { id: "virtual-smartphones", label: "Smartphones", slug: "smartphones" },
  { id: "virtual-informatica", label: "Informática", slug: "informatica" },
  { id: "virtual-eletronicos", label: "Eletrônicos", slug: "eletronicos" },
  { id: "virtual-drones", label: "Drones", slug: "drones" },
  { id: "virtual-acessorios", label: "Acessórios", slug: "acessorios" },
  { id: "virtual-games", label: "Games", slug: "games" },
  { id: "virtual-tv-audio", label: "TV e Áudio", slug: "tv-audio" },
];

type OmitFilters = {
  brand?: boolean;
  category?: boolean;
  storage?: boolean;
  price?: boolean;
};

function clean(value: string | undefined) {
  const result = value?.trim();
  return result || undefined;
}

function numberOrUndefined(value: number | undefined) {
  return Number.isFinite(value) ? value : undefined;
}

function exactCondition(value: string | undefined): Condition | undefined {
  return value ? CONDITION_CODES[value] : undefined;
}

function variantWhere(input: CatalogPageInput, omit: OmitFilters = {}): Prisma.VariantWhereInput {
  const selectedCondition = exactCondition(input.condition);
  const section = input.section ?? "Novos";
  const priceFilter: { gte?: number; lte?: number } = {};
  const minPrice = numberOrUndefined(input.minPrice);
  const maxPrice = numberOrUndefined(input.maxPrice);

  if (!omit.price && minPrice !== undefined && minPrice >= 0) priceFilter.gte = minPrice;
  if (!omit.price && maxPrice !== undefined && maxPrice > 0) priceFilter.lte = maxPrice;

  return {
    condition: selectedCondition ?? { in: SECTION_CONDITIONS[section] },
    ...(!omit.storage && clean(input.storage)
      ? { storage: { equals: clean(input.storage), mode: "insensitive" as const } }
      : {}),
    ...(Object.keys(priceFilter).length ? { price: priceFilter } : {}),
  };
}

function productWhere(input: CatalogPageInput, omit: OmitFilters = {}): Prisma.ProductWhereInput {
  const brand = clean(input.brand);
  const category = clean(input.category);
  const query = clean(input.query);
  const categories = category && !omit.category ? categoryFamilyTokens(category) : [];

  return {
    active: true,
    ...(!omit.brand && brand
      ? { brand: { equals: brand, mode: "insensitive" as const } }
      : {}),
    ...(categories.length
      ? {
          filterSelections: {
            some: {
              option: {
                slug: { in: categories },
                filter: { slug: { in: ["categoria", "tipo-de-produto"] } },
              },
            },
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { brand: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
            { variants: { some: { sku: { contains: query, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    variants: { some: variantWhere(input, omit) },
  };
}

function productInclude(input: CatalogPageInput) {
  return {
    variants: {
      where: variantWhere(input),
      orderBy: { price: "asc" as const },
    },
    images: {
      orderBy: { position: "asc" as const },
      select: { url: true, color: true },
    },
    filterSelections: {
      include: { option: { include: { filter: true } } },
    },
  };
}

function addVirtualCategories(real: CatalogFacetOption[]) {
  const result = new Map(real.map((option) => [option.slug.toLocaleLowerCase("pt-BR"), option]));
  const realSlugs = new Set(real.map((option) => option.slug.toLocaleLowerCase("pt-BR")));

  for (const virtual of VIRTUAL_CATEGORIES) {
    if (result.has(virtual.slug)) continue;
    const family = new Set(categoryFamilyTokens(virtual.slug).map((slug) => slug.toLocaleLowerCase("pt-BR")));
    if ([...realSlugs].some((slug) => family.has(slug))) result.set(virtual.slug, virtual);
  }

  return [...result.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function storageSortValue(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1].replace(",", "."));
  const unit = match[2].toUpperCase();
  if (unit === "TB") return amount * 1024 * 1024;
  if (unit === "GB") return amount * 1024;
  return amount;
}

async function fetchPageRows(input: CatalogPageInput, page: number, pageSize: number) {
  const where = productWhere(input);
  const include = productInclude(input);
  const sort = input.sort ?? "relevance";

  if (sort === "relevance") {
    return prisma.product.findMany({
      where,
      include,
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  // Ordenação por preço precisa considerar o menor preço da variante que
  // realmente atende aos filtros. Carregamos apenas id + 1 Decimal por produto,
  // nunca imagens/descritivos do catálogo inteiro.
  const candidates = await prisma.product.findMany({
    where,
    select: {
      id: true,
      variants: {
        where: variantWhere(input),
        orderBy: { price: "asc" },
        take: 1,
        select: { price: true },
      },
    },
  });

  candidates.sort((left, right) => {
    const a = Number(left.variants[0]?.price ?? 0);
    const b = Number(right.variants[0]?.price ?? 0);
    return sort === "low" ? a - b : b - a;
  });

  const pageIds = candidates
    .slice((page - 1) * pageSize, page * pageSize)
    .map((item) => item.id);

  if (!pageIds.length) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    include,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return pageIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function getCatalogPage(rawInput: CatalogPageInput = {}): Promise<CatalogPageResult> {
  const input: CatalogPageInput = {
    ...rawInput,
    query: clean(rawInput.query),
    brand: clean(rawInput.brand),
    category: clean(rawInput.category),
    storage: clean(rawInput.storage),
    section: rawInput.section === "Seminovos" ? "Seminovos" : "Novos",
    sort: rawInput.sort === "low" || rawInput.sort === "high" ? rawInput.sort : "relevance",
  };

  const pageSize = Math.min(Math.max(Math.trunc(rawInput.pageSize ?? 30), 12), 60);
  const requestedPage = Math.max(1, Math.trunc(rawInput.page ?? 1));

  const brandWhere = productWhere(input, { brand: true });
  const categoryWhere = productWhere(input, { category: true });
  const storageProductWhere = productWhere(input, { storage: true });
  const priceProductWhere = productWhere(input, { price: true });

  const [storeMode, total, rows, brandGroups, categoryOptions, storageRows, priceAggregate] = await Promise.all([
    getStoreMode(),
    prisma.product.count({ where: productWhere(input) }),
    fetchPageRows(input, requestedPage, pageSize),
    prisma.product.groupBy({
      by: ["brand"],
      where: brandWhere,
      orderBy: { brand: "asc" },
    }),
    prisma.catalogFilterOption.findMany({
      where: {
        active: true,
        filter: {
          active: true,
          slug: { in: ["categoria", "tipo-de-produto"] },
        },
        productSelections: {
          some: { product: categoryWhere },
        },
      },
      select: { id: true, label: true, slug: true },
      orderBy: [{ position: "asc" }, { label: "asc" }],
    }),
    prisma.variant.findMany({
      where: {
        ...variantWhere(input, { storage: true }),
        product: storageProductWhere,
        storage: { not: null },
      },
      distinct: ["storage"],
      select: { storage: true },
    }),
    prisma.variant.aggregate({
      where: {
        ...variantWhere(input, { price: true }),
        product: priceProductWhere,
      },
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  const mapped = rows.map((row) => mapProduct(row, storeMode));
  if ((input.sort ?? "relevance") === "relevance") {
    mapped.sort((left, right) => {
      if (left.available !== right.available) return left.available ? -1 : 1;
      return 0;
    });
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const brands = brandGroups
    .map((item) => item.brand.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const storages = storageRows
    .map((item) => item.storage?.trim())
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => storageSortValue(a) - storageSortValue(b) || a.localeCompare(b, "pt-BR"));

  return {
    products: mapped,
    total,
    page: Math.min(requestedPage, pages),
    pageSize,
    pages,
    facets: {
      brands,
      categories: addVirtualCategories(categoryOptions),
      storages,
      price: {
        min: priceAggregate._min.price ? Math.floor(Number(priceAggregate._min.price)) : 0,
        max: priceAggregate._max.price ? Math.ceil(Number(priceAggregate._max.price)) : 0,
      },
    },
  };
}

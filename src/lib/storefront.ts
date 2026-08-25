import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import {
  getBaseModelName,
  getCatalogSection,
  products,
  type CatalogProduct,
} from "./catalog";
import { readInstagramFromCatalogBanner } from "./contact";
import {
  readHomeFeaturedTitle,
  readHomeFooterBanner,
  readHomeProductSections,
  readHomePromoBanners,
} from "./homeContent";
import { DEFAULT_STORE_MODE, isVariantAvailable, normalizeStoreMode, type StoreModeValue } from "./storeMode";
import { resolveStorefrontNavigation } from "./storefrontNavigation";
import { categoryFamilyTokens, matchesCategory } from "./catalogRouting";
import type { ProductVariantOption } from "./productVariantSelection";

const conditionLabels: Record<string, CatalogProduct["condition"]> = {
  NOVO: "Novo", NOVO_REEMBALADO: "Novo", EXCELENTE: "Excelente",
  MUITO_BOM: "Muito Bom", BOM: "Bom", OUTLET: "Outlet",
};

export function mapProduct(product: {
  id: string; slug: string; name: string; brand: string; description: string | null; featured: boolean;
  imageUrl: string | null; model3dUrl?: string | null; pixDiscountPct?: number | null; installmentPlan?: unknown;
  variants: Array<{ id: string; storage: string | null; color: string | null; condition: string; price: unknown; stock: number; dropshipAvailable?: boolean }>;
  images?: Array<{ url: string }>;
  specifications?: Array<{ label: string; value: string }>;
  filterSelections?: Array<{
    option: {
      id: string; label: string; slug: string; active: boolean;
      filter: { id: string; name: string; slug: string; active: boolean };
    };
  }>;
}, storeMode: StoreModeValue = DEFAULT_STORE_MODE): CatalogProduct {
  const variant = [...product.variants].sort((left, right) => {
    const leftAvailable = isVariantAvailable({ storeMode, stock: left.stock, dropshipAvailable: left.dropshipAvailable });
    const rightAvailable = isVariantAvailable({ storeMode, stock: right.stock, dropshipAvailable: right.dropshipAvailable });
    if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
    return Number(left.price) - Number(right.price);
  })[0];
  return {
    id: variant?.id ?? product.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    condition: conditionLabels[variant?.condition ?? "NOVO"] ?? "Novo",
    storage: variant?.storage ?? "128 GB",
    color: variant?.color ?? "Preto",
    price: Number(variant?.price ?? 0),
    stock: variant?.stock ?? 0,
    available: variant ? isVariantAvailable({ storeMode, stock: variant.stock, dropshipAvailable: variant.dropshipAvailable }) : false,
    accent: "#0f766e",
    imageUrl: product.images?.[0]?.url ?? product.imageUrl ?? undefined,
    model3dUrl: product.model3dUrl ?? undefined,
    pixDiscountPct: product.pixDiscountPct ?? undefined,
    installmentPlan: Array.isArray(product.installmentPlan)
      ? (product.installmentPlan as Array<{ n: number; price: number }>)
      : undefined,
    images: product.images?.map((image) => image.url) ?? (product.imageUrl ? [product.imageUrl] : []),
    specifications: product.specifications ?? [],
    filters: (product.filterSelections ?? [])
      .filter((selection) => selection.option.active && selection.option.filter.active)
      .map((selection) => ({
        groupId: selection.option.filter.id,
        groupName: selection.option.filter.name,
        groupSlug: selection.option.filter.slug,
        optionId: selection.option.id,
        optionLabel: selection.option.label,
        optionSlug: selection.option.slug,
      })),
    description: product.description ?? "Celular Android com garantia e procedência verificada.",
    featured: product.featured,
  };
}

export async function getProducts(
  featuredOnly = false,
  options: { take?: number; excludeSlug?: string; query?: string; brand?: string; category?: string; condition?: string } = {},
) {
  const take = Math.min(Math.max(options.take ?? (featuredOnly ? 10 : 120), 1), 120);
  const query = options.query?.trim();
  const brand = options.brand?.trim();
  const category = options.category?.trim();
  const requestedCondition = options.condition?.trim();
  const conditionCode = ({
    Novo: "NOVO",
    Excelente: "EXCELENTE",
    "Muito Bom": "MUITO_BOM",
    Bom: "BOM",
    Outlet: "OUTLET",
  } as const)[requestedCondition as "Novo" | "Excelente" | "Muito Bom" | "Bom" | "Outlet"];
  const categoryTokens = category ? categoryFamilyTokens(category) : [];
  const fallbackProducts = products
    .filter((product) => product.slug !== options.excludeSlug)
    .filter((product) => !featuredOnly || product.featured)
    .filter((product) => !query || `${product.name} ${product.brand} ${product.storage} ${product.color}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
    .filter((product) => !brand || product.brand.toLocaleLowerCase("pt-BR") === brand.toLocaleLowerCase("pt-BR"))
    .filter((product) => !category || matchesCategory((product.filters ?? []).map((filter) => filter.optionSlug), category))
    .filter((product) => !requestedCondition || product.condition === requestedCondition)
    .slice(0, take);
  try {
    const [storeMode, rows] = await Promise.all([getStoreMode(), prisma.product.findMany({
      where: {
        active: true,
        ...(featuredOnly ? { featured: true } : {}),
        ...(options.excludeSlug ? { slug: { not: options.excludeSlug } } : {}),
        ...(brand ? { brand: { equals: brand, mode: "insensitive" } } : {}),
        ...(conditionCode ? { variants: { some: { condition: conditionCode } } } : {}),
        ...(categoryTokens.length ? {
          filterSelections: { some: { option: { slug: { in: categoryTokens } } } },
        } : {}),
        ...(query ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: { position: "asc" }, take: 2 },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    })]);
    return rows.length
      ? rows.map((row) => mapProduct(row, storeMode))
      : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

export type StorefrontProductDetail = CatalogProduct & {
  familyVariants: ProductVariantOption[];
};

const getProductBySlugCached = unstable_cache(async (slug: string): Promise<StorefrontProductDetail | null> => {
  try {
    const [storeMode, product] = await Promise.all([getStoreMode(), prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: { position: "asc" } },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
    })]);

    if (product) {
      const mapped = mapProduct(product, storeMode);
      return { ...mapped, familyVariants: await getFamilyVariantsForProduct(mapped, storeMode) };
    }
  } catch {
    // The static catalog below keeps the storefront available during database outages.
  }

  const fallback = products.find((item) => item.slug === slug);
  if (!fallback) return null;
  return { ...fallback, familyVariants: await getFamilyVariantsForProduct(fallback) };
}, ["storefront-product-detail-v2"], { revalidate: 45 });

export { getBaseModelName };

export async function getFamilyVariantsForProduct(
  targetProduct: CatalogProduct,
  requestedStoreMode?: StoreModeValue,
): Promise<ProductVariantOption[]> {
  const baseModel = getBaseModelName(targetProduct.name).toLowerCase();
  const targetSection = getCatalogSection(targetProduct.condition);
  const familyPrefix = targetProduct.name
    .replace(/\s*-\s*\d+\s*(GB|TB)(?:\s*SSD)?\b.*$/i, "")
    .replace(/\s+\d+\s*(GB|TB)(?:\s*SSD)?\b.*$/i, "")
    .trim();
  
  try {
    const storeMode = requestedStoreMode ?? await getStoreMode();
    const familyProducts = await prisma.product.findMany({
      where: {
        active: true,
        brand: targetProduct.brand,
        name: { startsWith: familyPrefix, mode: "insensitive" },
      },
      take: 40,
      include: {
        variants: true,
        images: { orderBy: { position: "asc" }, take: 1 },
      },
    });

    const matching = familyProducts.filter(
      (p) => getBaseModelName(p.name).toLowerCase() === baseModel
    );

    const variantOptions: ProductVariantOption[] = [];

    for (const p of matching) {
      for (const v of p.variants) {
        const condition = conditionLabels[v.condition] ?? "Novo";
        if (getCatalogSection(condition) !== targetSection) continue;
        variantOptions.push({
          id: v.id,
          productId: p.id,
          slug: p.slug,
          color: v.color ?? targetProduct.color,
          storage: v.storage ?? targetProduct.storage,
          condition,
          price: Number(v.price),
          stock: v.stock,
          available: isVariantAvailable({ storeMode, stock: v.stock, dropshipAvailable: v.dropshipAvailable }),
          imageUrl: p.images[0]?.url ?? p.imageUrl ?? undefined,
        });
      }
    }

    if (variantOptions.length > 0) {
      return variantOptions;
    }
  } catch {
    // Fallback se houver erro no Prisma
  }

  // Fallback a partir do catálogo estático em memória
  const fallbackMatches = products.filter(
    (p) =>
      getBaseModelName(p.name).toLowerCase() === baseModel &&
      getCatalogSection(p.condition) === targetSection
  );

  return fallbackMatches.map((p) => ({
    id: p.id,
    productId: p.productId ?? p.id,
    slug: p.slug,
    color: p.color,
    storage: p.storage,
    condition: p.condition,
    price: p.price,
    stock: p.stock,
    available: p.available,
    imageUrl: p.imageUrl,
  }));
}

export async function getProductsForSection(query: string, requestedTake = 5) {
  const terms = query
    .split(/[,;]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 10);
  const take = Math.min(Math.max(requestedTake, 1), 12);
  if (!terms.length) return [];

  const fallbackProducts = products.filter((product) => {
    const filterText = product.filters?.flatMap((filter) => [
      filter.groupName,
      filter.groupSlug,
      filter.optionLabel,
      filter.optionSlug,
    ]).join(" ") ?? "";
    const haystack = `${product.name} ${product.brand} ${filterText}`.toLocaleLowerCase("pt-BR");
    return terms.some((term) => haystack.includes(term.toLocaleLowerCase("pt-BR")));
  }).slice(0, take);

  const textConditions = terms.flatMap<Prisma.ProductWhereInput>((term) => [
    { name: { contains: term, mode: "insensitive" } },
    { brand: { contains: term, mode: "insensitive" } },
    { slug: { contains: term, mode: "insensitive" } },
    {
      filterSelections: {
        some: {
          option: {
            OR: [
              { label: { contains: term, mode: "insensitive" } },
              { slug: { contains: term, mode: "insensitive" } },
              { filter: { name: { contains: term, mode: "insensitive" } } },
              { filter: { slug: { contains: term, mode: "insensitive" } } },
            ],
          },
        },
      },
    },
  ]);

  try {
    const [storeMode, rows] = await Promise.all([getStoreMode(), prisma.product.findMany({
      where: { active: true, OR: textConditions },
      include: {
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: { position: "asc" }, take: 2 },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take,
    })]);
    return rows.length ? rows.map((row) => mapProduct(row, storeMode)) : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

export const getStoreMode = cache(async (): Promise<StoreModeValue> => {
  try {
    const content = await prisma.siteContent.findUnique({
      where: { id: "main" },
      select: { storeMode: true },
    });
    return normalizeStoreMode(content?.storeMode);
  } catch {
    return DEFAULT_STORE_MODE;
  }
});

// React cache deduplica metadata/página; o cache do Next evita repetir as duas
// consultas pesadas a cada abertura do mesmo produto.
export const getProductBySlug = cache(getProductBySlugCached);

// Filtros públicos do catálogo (mesma resposta da rota /api/catalog-filters).
export async function getPublicCatalogFilters() {
  try {
    return await prisma.catalogFilter.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        options: {
          where: { active: true },
          orderBy: [{ position: "asc" }, { label: "asc" }],
          select: { id: true, label: true, slug: true },
        },
      },
    });
  } catch {
    return [];
  }
}

export async function getSiteContent() {
  try {
    const [content, navigation] = await Promise.all([
      prisma.siteContent.findUnique({ where: { id: "main" } }),
      prisma.navigationItem.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    ]);
    const rawCatalogBanner = content?.catalogBanner && typeof content.catalogBanner === "object" && !Array.isArray(content.catalogBanner)
      ? content.catalogBanner as Record<string, unknown>
      : {};
    const { homeFooterBannerAsset: _privateFooterBannerAsset, ...publicCatalogBanner } = rawCatalogBanner;
    const normalizedContent = content
      ? {
          storeMode: content.storeMode,
          storeName: ["DroidStore", "Brasil Store"].includes(content.storeName) ? "Aura Tech" : content.storeName,
          heroEyebrow: content.heroEyebrow,
          heroTitle: content.heroTitle,
          heroDescription: content.heroDescription,
          heroImageUrl: content.heroImageUrl,
          heroSlides: content.heroSlides,
          catalogBanner: publicCatalogBanner,
          catalogSlides: content.catalogSlides,
          contactEmail: content.contactEmail,
          whatsapp: content.whatsapp,
          pixDiscount: content.pixDiscount,
          maxInstallments: content.maxInstallments,
          customerLoginEnabled: content.customerLoginEnabled,
          loginTitle: content.loginTitle,
          loginSubtitle: content.loginSubtitle,
          instagramUrl: readInstagramFromCatalogBanner(content.catalogBanner),
          homeFeaturedTitle: readHomeFeaturedTitle(content.catalogBanner),
          homeFooterBanner: readHomeFooterBanner(content.catalogBanner),
          homePromoBanners: readHomePromoBanners(content.catalogBanner),
          homeProductSections: readHomeProductSections(content.catalogBanner),
        }
      : null;
    return { content: normalizedContent, navigation: resolveStorefrontNavigation(navigation) };
  } catch {
    return { content: null, navigation: [] };
  }
}

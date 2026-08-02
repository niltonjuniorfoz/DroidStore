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
  readHomeProductSections,
  readHomePromoBanners,
} from "./homeContent";

const conditionLabels: Record<string, CatalogProduct["condition"]> = {
  NOVO: "Novo", NOVO_REEMBALADO: "Novo Reembalado", EXCELENTE: "Excelente",
  MUITO_BOM: "Muito Bom", BOM: "Bom", OUTLET: "Outlet",
};

export function mapProduct(product: {
  id: string; slug: string; name: string; brand: string; description: string | null; featured: boolean;
  imageUrl: string | null; model3dUrl?: string | null; variants: Array<{ id: string; storage: string | null; color: string | null; condition: string; price: unknown; stock: number }>;
  images?: Array<{ url: string }>;
  specifications?: Array<{ label: string; value: string }>;
  filterSelections?: Array<{
    option: {
      id: string; label: string; slug: string; active: boolean;
      filter: { id: string; name: string; slug: string; active: boolean };
    };
  }>;
}): CatalogProduct {
  const variant = product.variants[0];
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
    accent: "#0f766e",
    imageUrl: product.images?.[0]?.url ?? product.imageUrl ?? undefined,
    model3dUrl: product.model3dUrl ?? undefined,
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
  options: { take?: number; excludeSlug?: string; query?: string } = {},
) {
  const take = Math.min(Math.max(options.take ?? (featuredOnly ? 10 : 120), 1), 120);
  const query = options.query?.trim();
  const fallbackProducts = products
    .filter((product) => product.slug !== options.excludeSlug)
    .filter((product) => !featuredOnly || product.featured)
    .filter((product) => !query || `${product.name} ${product.brand} ${product.storage} ${product.color}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
    .slice(0, take);
  try {
    const rows = await prisma.product.findMany({
      where: {
        active: true,
        ...(featuredOnly ? { featured: true } : {}),
        ...(options.excludeSlug ? { slug: { not: options.excludeSlug } } : {}),
        ...(query ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        variants: { orderBy: { price: "asc" }, take: 1 },
        images: { orderBy: { position: "asc" }, take: 2 },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
    return rows.length
      ? rows.map(mapProduct)
      : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

export type ProductVariantOption = {
  id: string;
  productId: string;
  slug: string;
  color: string;
  storage: string;
  condition: CatalogProduct["condition"];
  price: number;
  stock: number;
  imageUrl?: string;
  model3dUrl?: string | null;
};

export { getBaseModelName };

export async function getFamilyVariantsForProduct(targetProduct: CatalogProduct): Promise<ProductVariantOption[]> {
  const baseModel = getBaseModelName(targetProduct.name).toLowerCase();
  const targetSection = getCatalogSection(targetProduct.condition);
  const familyPrefix = targetProduct.name
    .replace(/\s*-\s*\d+\s*(GB|TB)(?:\s*SSD)?\b.*$/i, "")
    .replace(/\s+\d+\s*(GB|TB)(?:\s*SSD)?\b.*$/i, "")
    .trim();
  
  try {
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
    imageUrl: p.imageUrl,
  }));
}

export async function getSiteContent() {
  try {
    const [content, navigation] = await Promise.all([
      prisma.siteContent.findUnique({ where: { id: "main" } }),
      prisma.navigationItem.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    ]);
    const normalizedContent = content
      ? {
          ...content,
          instagramUrl: readInstagramFromCatalogBanner(content.catalogBanner),
          homeFeaturedTitle: readHomeFeaturedTitle(content.catalogBanner),
          homePromoBanners: readHomePromoBanners(content.catalogBanner),
          homeProductSections: readHomeProductSections(content.catalogBanner),
        }
      : null;
    return { content: normalizedContent, navigation };
  } catch {
    return { content: null, navigation: [] };
  }
}

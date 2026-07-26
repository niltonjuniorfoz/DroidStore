import prisma from "./prisma";
import { products, type CatalogProduct } from "./catalog";

const conditionLabels: Record<string, CatalogProduct["condition"]> = {
  NOVO: "Novo", NOVO_REEMBALADO: "Novo Reembalado", EXCELENTE: "Excelente",
  MUITO_BOM: "Muito Bom", BOM: "Bom", OUTLET: "Outlet",
};

export function mapProduct(product: {
  id: string; slug: string; name: string; brand: string; description: string | null;
  imageUrl: string | null; variants: Array<{ id: string; storage: string | null; color: string | null; condition: string; price: unknown; stock: number }>;
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
  };
}

export async function getProducts(featuredOnly = false) {
  try {
    const rows = await prisma.product.findMany({
      where: { active: true, ...(featuredOnly ? { featured: true } : {}) },
      include: {
        variants: { orderBy: { price: "asc" }, take: 1 },
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: { position: "asc" } },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: featuredOnly ? 8 : 100,
    });
    return rows.length ? rows.map(mapProduct) : products;
  } catch {
    return products;
  }
}

export async function getSiteContent() {
  try {
    const [content, navigation] = await Promise.all([
      prisma.siteContent.findUnique({ where: { id: "main" } }),
      prisma.navigationItem.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    ]);
    return { content, navigation };
  } catch {
    return { content: null, navigation: [] };
  }
}

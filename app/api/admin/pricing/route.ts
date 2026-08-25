import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";
import { audit } from "../../../../src/lib/audit";
import { calculateAuraPrice } from "../../../../src/lib/aura/pricing";

const updateSchema = z.object({
  id: z.string().uuid(),
  markupPercent: z.coerce.number().min(0).max(1000),
});

const conditionLabels: Record<string, string> = {
  NOVO: "Novo",
  NOVO_REEMBALADO: "Novo reembalado",
  EXCELENTE: "Excelente",
  MUITO_BOM: "Muito bom",
  BOM: "Bom",
  OUTLET: "Outlet",
};

function asNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(200, Math.max(10, Number(params.get("pageSize") ?? 50) || 50));
  const q = params.get("q")?.trim();
  const brand = params.get("brand")?.trim();
  const group = params.get("group")?.trim();
  const subgroup = params.get("subgroup")?.trim();
  const category = params.get("category")?.trim();
  const condition = params.get("condition")?.trim();
  const availability = params.get("availability");

  const and: Prisma.SupplierCatalogItemWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { sourceName: { contains: q, mode: "insensitive" } },
        { sourceBrand: { contains: q, mode: "insensitive" } },
        { sourceModel: { contains: q, mode: "insensitive" } },
        { variant: { product: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (brand) and.push({ sourceBrand: { equals: brand, mode: "insensitive" } });
  if (group) and.push({ sourceGroup: { equals: group, mode: "insensitive" } });
  if (subgroup) and.push({ sourceSubgroup: { equals: subgroup, mode: "insensitive" } });
  if (availability === "available") and.push({ available: true });
  if (availability === "unavailable") and.push({ available: false });
  if (condition) and.push({ variant: { condition: condition as never } });
  if (category) {
    and.push({
      variant: {
        product: {
          filterSelections: {
            some: {
              option: {
                slug: category,
                filter: { slug: { in: ["categoria", "tipo-de-produto"] } },
              },
            },
          },
        },
      },
    });
  }

  const where: Prisma.SupplierCatalogItemWhereInput = and.length ? { AND: and } : {};

  const [total, items, facetItems, categoryFilter] = await Promise.all([
    prisma.supplierCatalogItem.count({ where }),
    prisma.supplierCatalogItem.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { sku: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: { orderBy: { position: "asc" }, take: 1 },
                filterSelections: { include: { option: { include: { filter: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.supplierCatalogItem.findMany({
      select: { sourceBrand: true, sourceGroup: true, sourceSubgroup: true },
      take: 5000,
    }),
    prisma.catalogFilter.findFirst({
      where: { slug: { in: ["categoria", "tipo-de-produto"] }, active: true },
      include: { options: { where: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] } },
    }),
  ]);

  const rows = items.map((item) => {
    const basisUsd = item.available
      ? asNumber(item.supplierPriceUsd) ?? asNumber(item.lastKnownPriceUsd)
      : asNumber(item.lastKnownPriceUsd) ?? asNumber(item.supplierPriceUsd);
    const exchangeRate = asNumber(item.exchangeRate);
    const costBrl = basisUsd && exchangeRate ? Number((basisUsd * exchangeRate).toFixed(2)) : asNumber(item.variant.costPrice) ?? 0;
    const finalPrice = asNumber(item.variant.price) ?? asNumber(item.salePriceBrl) ?? 0;
    const savedMarkup = asNumber(item.markupPercent);
    const markupPercent = savedMarkup ?? (costBrl > 0 ? Number((((finalPrice / costBrl) - 1) * 100).toFixed(2)) : 0);
    const categorySelection = item.variant.product.filterSelections.find((selection) =>
      ["categoria", "tipo-de-produto"].includes(selection.option.filter.slug),
    );

    return {
      id: item.id,
      sku: item.sku,
      name: item.variant.product.name || item.sourceName || item.sku,
      brand: item.sourceBrand || item.variant.product.brand,
      imageUrl: item.variant.product.images[0]?.url ?? item.variant.product.imageUrl,
      slug: item.variant.product.slug,
      group: item.sourceGroup ?? "",
      subgroup: item.sourceSubgroup ?? "",
      category: categorySelection?.option.label ?? item.sourceCategory ?? "",
      condition: conditionLabels[item.variant.condition] ?? item.variant.condition,
      conditionCode: item.variant.condition,
      supplierPriceUsd: basisUsd ?? 0,
      exchangeRate: exchangeRate ?? 0,
      costBrl,
      markupPercent,
      profitBrl: Number((finalPrice - costBrl).toFixed(2)),
      finalPrice,
      available: item.available && item.variant.dropshipAvailable,
      updatedAt: item.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({
    rows,
    pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    facets: {
      brands: unique(facetItems.map((item) => item.sourceBrand)),
      groups: unique(facetItems.map((item) => item.sourceGroup)),
      subgroups: unique(facetItems.map((item) => item.sourceSubgroup)),
      categories: (categoryFilter?.options ?? []).map((option) => ({ label: option.label, value: option.slug })),
      conditions: [
        { label: "Novo", value: "NOVO" },
        { label: "Novo reembalado", value: "NOVO_REEMBALADO" },
        { label: "Excelente", value: "EXCELENTE" },
        { label: "Muito bom", value: "MUITO_BOM" },
        { label: "Bom", value: "BOM" },
        { label: "Outlet", value: "OUTLET" },
      ],
    },
  });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe uma margem válida entre 0% e 1000%." }, { status: 400 });
  }

  const item = await prisma.supplierCatalogItem.findUnique({
    where: { id: parsed.data.id },
    include: { variant: { include: { product: { select: { id: true, slug: true, name: true } } } } },
  });
  if (!item) return NextResponse.json({ error: "Produto importado não encontrado." }, { status: 404 });

  const supplierPriceUsd = item.available
    ? asNumber(item.supplierPriceUsd) ?? asNumber(item.lastKnownPriceUsd)
    : asNumber(item.lastKnownPriceUsd) ?? asNumber(item.supplierPriceUsd);
  const exchangeRate = asNumber(item.exchangeRate);

  if (!supplierPriceUsd || supplierPriceUsd <= 0) {
    return NextResponse.json({ error: "Este SKU não possui preço USD de referência." }, { status: 409 });
  }
  if (!exchangeRate || exchangeRate <= 0) {
    return NextResponse.json({ error: "Este SKU não possui cotação USD salva." }, { status: 409 });
  }

  const calculated = calculateAuraPrice({
    supplierPriceUsd,
    exchangeRate,
    markupPercent: parsed.data.markupPercent,
    roundingRule: "CEIL_10",
  });

  await prisma.$transaction([
    prisma.variant.update({
      where: { id: item.variantId },
      data: { price: calculated.salePriceBrl, costPrice: calculated.convertedCostBrl },
    }),
    prisma.supplierCatalogItem.update({
      where: { id: item.id },
      data: { markupPercent: parsed.data.markupPercent, salePriceBrl: calculated.salePriceBrl },
    }),
  ]);

  await audit(session, {
    action: "pricing.margin.update",
    entity: "Variant",
    entityId: item.variantId,
    summary: `Margem do SKU ${item.sku} alterada para ${parsed.data.markupPercent}%`,
    after: {
      sku: item.sku,
      markupPercent: parsed.data.markupPercent,
      salePriceBrl: calculated.salePriceBrl,
      costBrl: calculated.convertedCostBrl,
    },
  });

  revalidatePath("/");
  revalidatePath("/celulares");
  revalidatePath(`/produto/${item.variant.product.slug}`);

  return NextResponse.json({
    ok: true,
    id: item.id,
    markupPercent: parsed.data.markupPercent,
    costBrl: calculated.convertedCostBrl,
    profitBrl: Number((calculated.salePriceBrl - calculated.convertedCostBrl).toFixed(2)),
    finalPrice: calculated.salePriceBrl,
  });
}

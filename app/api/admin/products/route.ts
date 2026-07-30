import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";

const imageUrlSchema = z.string().trim().max(1000).refine((value) => {
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Link de imagem inválido");

const specificationsSchema = z.array(z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
})).max(60);

const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  brand: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(5000),
  storage: z.string().trim().min(2).max(30),
  color: z.string().trim().min(2).max(40),
  condition: z.enum(["NOVO", "NOVO_REEMBALADO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"]),
  price: z.coerce.number().positive().max(100000),
  costPrice: z.coerce.number().min(0).max(100000).default(0),
  stock: z.coerce.number().int().min(0).max(100000),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000).default(5),
  filterOptionIds: z.array(z.string().min(1).max(100)).max(30).default([]),
  imageUrls: z.array(imageUrlSchema).max(4).default([]),
  specifications: specificationsSchema.default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const rows = await prisma.product.findMany({
    include: {
      variants: { include: { deviceUnits: true } },
      images: { orderBy: { position: "asc" } },
      specifications: { orderBy: { position: "asc" } },
      filterSelections: { include: { option: { include: { filter: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (isOwnerAdmin(session)) return NextResponse.json(rows, { headers: { "X-Owner-View": "true" } });
  return NextResponse.json(rows.map((product) => ({
    ...product,
    variants: product.variants.map(({ costPrice: _costPrice, ...variant }) => variant),
  })), { headers: { "X-Owner-View": "false" } });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = productSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do produto." }, { status: 400 });
  const data = parsed.data;
  const filterOptionIds = [...new Set(data.filterOptionIds)];
  const selectedOptions = await prisma.catalogFilterOption.findMany({
    where: { id: { in: filterOptionIds } },
    include: { filter: true },
  });
  if (selectedOptions.length !== filterOptionIds.length) {
    return NextResponse.json({ error: "Um dos filtros selecionados não existe mais." }, { status: 400 });
  }
  if (new Set(selectedOptions.map((option) => option.filterId)).size !== selectedOptions.length) {
    return NextResponse.json({ error: "Escolha somente uma opção por filtro." }, { status: 400 });
  }
  const selectedBrand = selectedOptions.find((option) => option.filter.slug === "marca");
  const baseSlug = slugify(`${selectedBrand?.label ?? data.brand}-${data.name}-${data.storage}-${data.color}`);
  const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
  const product = await prisma.product.create({
    data: {
      slug,
      name: data.name,
      brand: selectedBrand?.label ?? data.brand,
      description: data.description,
      imageUrl: data.imageUrls[0] ?? null,
      active: data.active,
      featured: data.featured,
      variants: {
        create: {
          storage: data.storage,
          color: data.color,
          condition: data.condition,
          price: data.price,
          costPrice: isOwnerAdmin(session) ? data.costPrice : 0,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
        },
      },
      images: { create: data.imageUrls.map((url, position) => ({ url, position })) },
      specifications: { create: data.specifications.map((item, position) => ({ ...item, position })) },
      filterSelections: { create: filterOptionIds.map((optionId) => ({ optionId })) },
    },
    include: {
      variants: { include: { deviceUnits: true } },
      images: { orderBy: { position: "asc" } },
      specifications: { orderBy: { position: "asc" } },
      filterSelections: { include: { option: { include: { filter: true } } } },
    },
  });
  if (isOwnerAdmin(session)) return NextResponse.json(product, { status: 201 });
  return NextResponse.json({
    ...product,
    variants: product.variants.map(({ costPrice: _costPrice, ...variant }) => variant),
  }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";

const imageUrlSchema = z.string().trim().max(1000).refine((value) => {
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Link de imagem inválido");

const patchSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  brand: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  imageUrls: z.array(imageUrlSchema).max(4).optional(),
  specifications: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(500),
  })).max(60).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  storage: z.string().trim().min(2).max(30).optional(),
  color: z.string().trim().min(2).max(40).optional(),
  condition: z.enum(["NOVO", "NOVO_REEMBALADO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"]).optional(),
  price: z.coerce.number().positive().max(100000).optional(),
  costPrice: z.coerce.number().min(0).max(100000).optional(),
  stock: z.coerce.number().int().min(0).max(100000).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000).optional(),
  filterOptionIds: z.array(z.string().min(1).max(100)).max(30).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { include: { deviceUnits: true }, orderBy: { createdAt: "asc" } },
      images: { orderBy: { position: "asc" } },
      specifications: { orderBy: { position: "asc" } },
      filterSelections: { include: { option: { include: { filter: true } } } },
    },
  });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  if (isOwnerAdmin(session)) return NextResponse.json(product, { headers: { "X-Owner-View": "true" } });
  return NextResponse.json({
    ...product,
    variants: product.variants.map(({ costPrice: _costPrice, ...variant }) => variant),
  }, { headers: { "X-Owner-View": "false" } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const actorId = (session.user as { id?: string }).id;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados informados." }, { status: 400 });
  const { id } = await params;
  const {
    storage, color, condition, price, costPrice, stock, lowStockThreshold,
    imageUrls, specifications, filterOptionIds, ...productData
  } = parsed.data;
  const uniqueOptionIds = filterOptionIds === undefined ? undefined : [...new Set(filterOptionIds)];
  const selectedOptions = uniqueOptionIds === undefined ? undefined : await prisma.catalogFilterOption.findMany({
    where: { id: { in: uniqueOptionIds } },
    include: { filter: true },
  });
  if (uniqueOptionIds && selectedOptions?.length !== uniqueOptionIds.length) {
    return NextResponse.json({ error: "Um dos filtros selecionados não existe mais." }, { status: 400 });
  }
  if (selectedOptions && new Set(selectedOptions.map((option) => option.filterId)).size !== selectedOptions.length) {
    return NextResponse.json({ error: "Escolha somente uma opção por filtro." }, { status: 400 });
  }
  const selectedBrand = selectedOptions?.find((option) => option.filter.slug === "marca");
  const variantData = {
    storage,
    color,
    condition,
    price,
    ...(isOwnerAdmin(session) ? { costPrice } : {}),
    stock,
    lowStockThreshold,
  };
  const hasVariantChange = Object.values(variantData).some((value) => value !== undefined);

  const product = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...productData,
        ...(selectedBrand ? { brand: selectedBrand.label } : {}),
        ...(imageUrls !== undefined ? { imageUrl: imageUrls[0] ?? null } : {}),
      },
    });
    if (hasVariantChange) {
      const variant = await tx.variant.findFirst({ where: { productId: id }, orderBy: { createdAt: "asc" } });
      if (!variant) throw new Error("VARIANT_NOT_FOUND");
      const oldStock = variant.stock;
      await tx.variant.update({ where: { id: variant.id }, data: variantData });
      if (stock !== undefined && stock !== oldStock) {
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            type: "ADJUSTMENT",
            quantity: stock - oldStock,
            note: "Ajuste realizado no cadastro do produto",
            createdById: actorId,
          },
        });
      }
    }
    if (imageUrls !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (imageUrls.length) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, position) => ({ productId: id, url, position })),
        });
      }
    }
    if (specifications !== undefined) {
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      if (specifications.length) {
        await tx.productSpecification.createMany({
          data: specifications.map((item, position) => ({ productId: id, ...item, position })),
        });
      }
    }
    if (uniqueOptionIds !== undefined) {
      await tx.productFilterSelection.deleteMany({ where: { productId: id } });
      if (uniqueOptionIds.length) {
        await tx.productFilterSelection.createMany({
          data: uniqueOptionIds.map((optionId) => ({ productId: id, optionId })),
        });
      }
    }
    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        variants: { include: { deviceUnits: true } },
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: { position: "asc" } },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
    });
  });
  if (isOwnerAdmin(session)) return NextResponse.json(product);
  return NextResponse.json({
    ...product,
    variants: product.variants.map(({ costPrice: _costPrice, ...variant }) => variant),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.product.update({ where: { id }, data: { active: false } });
  return new NextResponse(null, { status: 204 });
}

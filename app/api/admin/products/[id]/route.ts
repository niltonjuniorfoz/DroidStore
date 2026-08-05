import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
import { hasFeaturedCapacity, MAX_FEATURED_PRODUCTS } from "../../../../../src/lib/featuredProducts";
import { validateInstallmentPlan } from "../../../../../src/lib/pricing";
import {
  isSupportedProductStorage,
  normalizeProductColor,
  normalizeProductStorage,
  PRODUCT_CONDITIONS,
} from "../../../../../src/lib/productStandards";

const imageUrlSchema = z.string().trim().max(1000).refine((value) => {
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Link de imagem inválido");

const model3dUrlSchema = z.string().trim().max(1000).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Link 3D inválido").nullable().optional();

const patchSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  brand: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  imageUrls: z.array(imageUrlSchema).max(4).optional(),
  model3dUrl: model3dUrlSchema,
  specifications: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(500),
  })).max(60).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  // Desconto PIX próprio (nulo volta ao padrão da loja) e tabela de parcelas.
  pixDiscountPct: z.coerce.number().int().min(0).max(90).nullable().optional(),
  installmentPlan: z.array(z.object({
    n: z.coerce.number().int().min(1).max(25),
    price: z.coerce.number().positive().max(1_000_000),
  })).max(25).nullable().optional(),
  storage: z.string().trim().min(2).max(30).transform(normalizeProductStorage).refine(isSupportedProductStorage).optional(),
  color: z.string().trim().min(2).max(40).transform(normalizeProductColor).optional(),
  condition: z.enum(PRODUCT_CONDITIONS).optional(),
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
      variants: { orderBy: { createdAt: "asc" } },
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
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "dados do produto");
    return NextResponse.json({ error: `Revise o campo ${field}.` }, { status: 400 });
  }
  const { id } = await params;
  const {
    storage, color, condition, price, costPrice, stock, lowStockThreshold,
    imageUrls, specifications, filterOptionIds, installmentPlan, ...rest
  } = parsed.data;
  // Prisma exige JsonNull explícito para limpar um campo JSON.
  const productData = {
    ...rest,
    ...(installmentPlan === undefined
      ? {}
      : { installmentPlan: installmentPlan === null ? Prisma.JsonNull : installmentPlan }),
  };
  // Escada de parcelamento validada no servidor: total nunca cai quando o
  // número de parcelas sobe (regra de negócio, não confia no cliente).
  if (installmentPlan) {
    const planError = validateInstallmentPlan(installmentPlan);
    if (planError) return NextResponse.json({ error: planError }, { status: 400 });
  }
  const currentProduct = await prisma.product.findUnique({ where: { id }, select: { featured: true } });
  if (!currentProduct) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  if (productData.featured && !currentProduct.featured && !await hasFeaturedCapacity(id)) {
    return NextResponse.json({ error: `A capa aceita no máximo ${MAX_FEATURED_PRODUCTS} produtos destacados.` }, { status: 409 });
  }
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
        variants: true,
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: { position: "asc" } },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
    });
  });
  await audit(session, {
    action: "product.update",
    entity: "Product",
    entityId: id,
    summary: `Produto atualizado: ${product.name} (${Object.keys(parsed.data).join(", ")})`,
    after: { price, costPriceChanged: costPrice !== undefined, stock, active: parsed.data.active },
  });
  if (isOwnerAdmin(session)) return NextResponse.json(product);
  return NextResponse.json({
    ...product,
    variants: product.variants.map(({ costPrice: _costPrice, ...variant }) => variant),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      variants: { select: { id: true, _count: { select: { orderItems: true } } } },
    },
  });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const hasOrderHistory = product.variants.some((variant) => variant._count.orderItems > 0);
  if (hasOrderHistory) {
    await prisma.product.update({ where: { id }, data: { active: false, featured: false } });
    await audit(session, {
      action: "product.deactivate",
      entity: "Product",
      entityId: id,
      summary: "Produto desativado (removido da vitrine)",
    });
    return NextResponse.json({
      deleted: false,
      archived: true,
      message: "O produto possui vendas vinculadas e foi arquivado para preservar o histórico dos pedidos.",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.variant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
  return NextResponse.json({ deleted: true, archived: false, message: "Produto excluído com sucesso." });
}

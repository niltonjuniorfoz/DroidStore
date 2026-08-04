import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { audit } from "../../../../src/lib/audit";
import { PURCHASE_CURRENCIES, unitCostBrl, weightedAverageCost } from "../../../../src/lib/purchase";

const createSchema = z.object({
  variantId: z.string().uuid(),
  supplier: z.string().trim().min(2).max(120),
  currency: z.enum(PURCHASE_CURRENCIES),
  unitCostFx: z.coerce.number().positive().max(1_000_000),
  exchangeRate: z.coerce.number().positive().max(1_000),
  quantity: z.coerce.number().int().min(1).max(100_000),
  freightBrl: z.coerce.number().min(0).max(1_000_000).default(0),
  purchasedAt: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
});

// Custos são visíveis apenas para o administrador proprietário.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário acessa as compras." }, { status: 403 });
  }
  const lots = await prisma.purchaseLot.findMany({
    take: 100,
    orderBy: { purchasedAt: "desc" },
    include: {
      variant: {
        select: {
          id: true,
          storage: true,
          color: true,
          stock: true,
          costPrice: true,
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });
  return NextResponse.json(lots);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário registra compras." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revise os dados do lote." }, { status: 400 });
  }
  const data = parsed.data;
  if (data.currency === "BRL" && data.exchangeRate !== 1) {
    return NextResponse.json({ error: "Compra em BRL usa cotação 1." }, { status: 400 });
  }

  const costBrl = unitCostBrl(data.unitCostFx, data.exchangeRate, data.freightBrl, data.quantity);
  const actorId = (session.user as { id?: string }).id;

  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.variant.findUnique({
      where: { id: data.variantId },
      include: { product: { select: { name: true } } },
    });
    if (!variant) throw new Error("VARIANT_NOT_FOUND");

    const lot = await tx.purchaseLot.create({
      data: {
        variantId: variant.id,
        supplier: data.supplier,
        currency: data.currency,
        unitCostFx: data.unitCostFx,
        exchangeRate: data.exchangeRate,
        quantity: data.quantity,
        freightBrl: data.freightBrl,
        unitCostBrl: costBrl,
        purchasedAt: data.purchasedAt,
        notes: data.notes ?? null,
        createdById: actorId,
      },
    });

    // Entrada de estoque + custo médio ponderado congelado em BRL.
    const newCost = weightedAverageCost(variant.stock, Number(variant.costPrice), data.quantity, costBrl);
    await tx.variant.update({
      where: { id: variant.id },
      data: { stock: { increment: data.quantity }, costPrice: newCost },
    });
    await tx.stockMovement.create({
      data: {
        variantId: variant.id,
        type: "ENTRY",
        quantity: data.quantity,
        note: `Lote ${data.supplier} (${data.quantity}x ${data.currency} ${data.unitCostFx.toFixed(2)})`,
        createdById: actorId,
      },
    });
    return { lot, productName: variant.product.name, newCost };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "VARIANT_NOT_FOUND") return null;
    throw error;
  });

  if (!result) return NextResponse.json({ error: "Variação não encontrada." }, { status: 404 });

  await audit(session, {
    action: "purchase.create",
    entity: "PurchaseLot",
    entityId: result.lot.id,
    summary: `Lote: ${data.quantity}x ${result.productName} de ${data.supplier} (${data.currency} ${data.unitCostFx.toFixed(2)} → R$ ${costBrl.toFixed(2)}/un)`,
    after: { currency: data.currency, unitCostFx: data.unitCostFx, exchangeRate: data.exchangeRate, quantity: data.quantity, unitCostBrl: costBrl, newAverageCost: result.newCost },
  });

  return NextResponse.json(result.lot, { status: 201 });
}

import { NextResponse } from "next/server";
import { StockMovementType } from "@prisma/client";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";

const movementSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(-100000).max(100000).refine((value) => value !== 0, {
    message: "A quantidade não pode ser zero.",
  }),
  type: z.nativeEnum(StockMovementType).default("ADJUSTMENT"),
  note: z.string().trim().min(3).max(300),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const owner = isOwnerAdmin(session);
  const variants = await prisma.variant.findMany({
    orderBy: [{ product: { name: "asc" } }, { storage: "asc" }],
    include: {
      product: { select: { id: true, name: true, brand: true, active: true, imageUrl: true } },
      stockMovements: { take: 8, orderBy: { createdAt: "desc" } },
    },
  });
  return NextResponse.json(
    variants.map((variant) =>
      owner ? variant : (({ costPrice: _costPrice, ...safeVariant }) => safeVariant)(variant),
    ),
  );
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = movementSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const actorId = (session.user as { id?: string }).id;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.variant.findUnique({ where: { id: parsed.data.variantId } });
      if (!variant) throw new Error("NOT_FOUND");
      const resultingStock = variant.stock + parsed.data.quantity;
      if (resultingStock < 0) throw new Error("NEGATIVE_STOCK");
      const updated = await tx.variant.update({
        where: { id: variant.id },
        data: { stock: resultingStock },
        include: { product: true },
      });
      await tx.stockMovement.create({
        data: {
          variantId: variant.id,
          type: parsed.data.type,
          quantity: parsed.data.quantity,
          note: parsed.data.note,
          createdById: actorId,
        },
      });
      return updated;
    });
    if (isOwnerAdmin(session)) return NextResponse.json(result);
    const { costPrice: _costPrice, ...safeResult } = result;
    return NextResponse.json(safeResult);
  } catch (error) {
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") {
      return NextResponse.json({ error: "A saída é maior que o estoque disponível." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Variação não encontrada." }, { status: 404 });
    }
    throw error;
  }
}

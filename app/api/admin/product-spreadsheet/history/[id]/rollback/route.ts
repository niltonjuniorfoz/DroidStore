import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../../src/lib/admin";
import prisma from "../../../../../../../src/lib/prisma";
import type { ProductSpreadsheetChange } from "../../../../../../../src/lib/productSpreadsheet";

function decimal(value: unknown) {
  return Number(value).toFixed(2);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  const productImport = await prisma.productImport.findUnique({ where: { id } });
  if (!productImport) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  if (productImport.status !== "APPLIED") return NextResponse.json({ error: "Esta importação já foi desfeita." }, { status: 409 });
  const changes = productImport.changes as unknown as ProductSpreadsheetChange[];
  if (!isOwnerAdmin(session) && changes.some((change) => change.fields.includes("costPrice"))) {
    return NextResponse.json({ error: "Somente o administrador principal pode desfazer uma importação que alterou custos." }, { status: 403 });
  }
  const variants = await prisma.variant.findMany({
    where: { id: { in: changes.map((change) => change.variantId) } },
    include: { product: { select: { active: true } } },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  for (const change of changes) {
    const current = byId.get(change.variantId);
    if (!current) return NextResponse.json({ error: `O produto ${change.productName} não existe mais.` }, { status: 409 });
    const changedAfterImport =
      (change.fields.includes("price") && decimal(current.price) !== change.after.price) ||
      (change.fields.includes("costPrice") && decimal(current.costPrice) !== change.after.costPrice) ||
      (change.fields.includes("stock") && current.stock !== change.after.stock) ||
      (change.fields.includes("active") && current.product.active !== change.after.active);
    if (changedAfterImport) {
      return NextResponse.json({ error: `Não foi possível desfazer porque “${change.productName}” foi alterado depois desta importação.` }, { status: 409 });
    }
  }
  const user = session.user as { id?: string };
  await prisma.$transaction(async (tx) => {
    const restoredProducts = new Set<string>();
    for (const change of changes) {
      await tx.variant.update({
        where: { id: change.variantId },
        data: {
          ...(change.fields.includes("price") ? { price: change.before.price } : {}),
          ...(change.fields.includes("costPrice") ? { costPrice: change.before.costPrice } : {}),
          ...(change.fields.includes("stock") ? { stock: change.before.stock } : {}),
        },
      });
      if (change.fields.includes("stock")) {
        await tx.stockMovement.create({
          data: {
            variantId: change.variantId,
            type: "ADJUSTMENT",
            quantity: change.before.stock - change.after.stock,
            note: `Importação desfeita: ${productImport.fileName}`,
            createdById: user.id,
          },
        });
      }
      if (change.fields.includes("active") && !restoredProducts.has(change.productId)) {
        await tx.product.update({ where: { id: change.productId }, data: { active: change.before.active } });
        restoredProducts.add(change.productId);
      }
    }
    await tx.productImport.update({ where: { id }, data: { status: "ROLLED_BACK", rolledBackAt: new Date(), rollbackById: user.id } });
  });
  return NextResponse.json({ ok: true });
}

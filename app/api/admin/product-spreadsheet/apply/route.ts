import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import prisma from "../../../../../src/lib/prisma";
import { previewProductsWorkbook } from "../../../../../src/lib/productSpreadsheet";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Selecione uma planilha .xlsx válida." }, { status: 400 });
    }
    const preview = await previewProductsWorkbook(Buffer.from(await file.arrayBuffer()), isOwnerAdmin(session));
    if (preview.errors.length) {
      const safePreview = isOwnerAdmin(session) ? preview : {
        ...preview,
        changes: preview.changes.map((change) => ({
          ...change,
          before: { price: change.before.price, stock: change.before.stock, active: change.before.active },
          after: { price: change.after.price, stock: change.after.stock, active: change.after.active },
        })),
      };
      return NextResponse.json({ error: "Corrija os erros da planilha antes de salvar.", preview: safePreview }, { status: 400 });
    }
    if (!preview.changes.length) return NextResponse.json({ error: "A planilha não possui alterações para salvar." }, { status: 400 });
    const user = session.user as { id?: string; name?: string | null; email?: string | null };
    const result = await prisma.$transaction(async (tx) => {
      const updatedProducts = new Set<string>();
      for (const change of preview.changes) {
        await tx.variant.update({
          where: { id: change.variantId },
          data: {
            price: change.after.price,
            ...(isOwnerAdmin(session) ? { costPrice: change.after.costPrice } : {}),
            stock: change.after.stock,
          },
        });
        if (change.fields.includes("stock")) {
          await tx.stockMovement.create({
            data: {
              variantId: change.variantId,
              type: "ADJUSTMENT",
              quantity: change.after.stock - change.before.stock,
              note: `Importação da planilha ${file.name}`,
              createdById: user.id,
            },
          });
        }
        if (!updatedProducts.has(change.productId) && change.fields.includes("active")) {
          await tx.product.update({ where: { id: change.productId }, data: { active: change.after.active } });
          updatedProducts.add(change.productId);
        }
      }
      return tx.productImport.create({
        data: {
          fileName: file.name.slice(0, 255),
          totalRows: preview.totalRows,
          changedRows: preview.changedRows,
          unchangedRows: preview.unchangedRows,
          priceChanges: preview.priceChanges,
          costChanges: preview.costChanges,
          stockChanges: preview.stockChanges,
          statusChanges: preview.statusChanges,
          changes: preview.changes as unknown as Prisma.InputJsonValue,
          createdById: user.id,
          createdByName: user.name ?? user.email ?? "Administrador",
        },
      });
    });
    return NextResponse.json({ importId: result.id, ...preview, changes: undefined, errors: undefined });
  } catch (error) {
    console.error("product spreadsheet apply", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as alterações." }, { status: 400 });
  }
}

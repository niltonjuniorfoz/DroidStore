import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
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
          before: { price: change.before.price, stock: change.before.stock, active: change.before.active, condition: change.before.condition },
          after: { price: change.after.price, stock: change.after.stock, active: change.after.active, condition: change.after.condition },
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
            ...(change.fields.includes("price") ? { price: change.after.price } : {}),
            ...(isOwnerAdmin(session) && change.fields.includes("costPrice") ? { costPrice: change.after.costPrice } : {}),
            ...(change.fields.includes("stock") ? { stock: change.after.stock } : {}),
            ...(change.fields.includes("condition") ? { condition: change.after.condition } : {}),
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
    await audit(session, {
      action: "spreadsheet.apply",
      entity: "ProductImport",
      entityId: result.id,
      summary: `Planilha ${file.name}: ${preview.changedRows} produto(s) alterado(s)`,
    });
    return NextResponse.json({ importId: result.id, ...preview, changes: undefined, errors: undefined });
  } catch (error) {
    console.error("product spreadsheet apply", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as alterações." }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { previewProductsWorkbook } from "../../../../../src/lib/productSpreadsheet";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma planilha .xlsx." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "O arquivo precisa estar no formato .xlsx." }, { status: 400 });
    const owner = isOwnerAdmin(session);
    const preview = await previewProductsWorkbook(Buffer.from(await file.arrayBuffer()), owner);
    if (owner) return NextResponse.json(preview);
    return NextResponse.json({
      ...preview,
      changes: preview.changes.map((change) => ({
        ...change,
        before: { price: change.before.price, stock: change.before.stock, active: change.before.active, condition: change.before.condition },
        after: { price: change.after.price, stock: change.after.stock, active: change.after.active, condition: change.after.condition },
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível analisar a planilha." }, { status: 400 });
  }
}

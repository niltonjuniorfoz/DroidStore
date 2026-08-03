import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { createProductsWorkbook } from "../../../../../src/lib/productSpreadsheet";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const buffer = await createProductsWorkbook(isOwnerAdmin(session));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Aura-Tech-produtos-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

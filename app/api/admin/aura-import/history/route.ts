import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../src/lib/admin";
import prisma from "../../../../../src/lib/prisma";

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const rows = await prisma.auraImportJob.findMany({
    where: kind === "SUPPLIER_XLSX" ? { kind: "SUPPLIER_XLSX" } : kind === "AURA_JSON" ? { kind: "AURA_JSON" } : undefined,
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(rows);
}

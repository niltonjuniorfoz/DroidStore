import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../src/lib/admin";
import prisma from "../../../../../src/lib/prisma";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const history = await prisma.productImport.findMany({
    select: {
      id: true, fileName: true, status: true, totalRows: true, changedRows: true, unchangedRows: true,
      priceChanges: true, costChanges: true, stockChanges: true, statusChanges: true,
      createdByName: true, createdAt: true, rolledBackAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(history);
}

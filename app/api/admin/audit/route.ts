import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário pode ver a auditoria." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const logs = await prisma.adminAuditLog.findMany({
    where: entity ? { entity } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}

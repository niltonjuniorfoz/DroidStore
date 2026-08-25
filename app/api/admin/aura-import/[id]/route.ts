import { NextResponse } from "next/server";
import type { AuraImportItemStatus } from "@prisma/client";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
import prisma from "../../../../../src/lib/prisma";

const activeStatuses = new Set(["PROCESSING", "PAUSED"]);
const appliedItemStatuses: AuraImportItemStatus[] = ["CREATED", "UPDATED", "UNCHANGED"];

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal exclui importações." }, { status: 403 });
  const { id } = await params;
  const job = await prisma.auraImportJob.findUnique({
    where: { id },
    select: { id: true, fileName: true, status: true },
  });
  if (!job) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  if (activeStatuses.has(job.status)) {
    return NextResponse.json({ error: "Pause ou cancele o processamento antes de excluir esta importação." }, { status: 409 });
  }
  const appliedItems = await prisma.auraImportItem.count({
    where: { jobId: id, status: { in: appliedItemStatuses } },
  });
  if (appliedItems > 0) {
    return NextResponse.json({ error: `Ainda existem ${appliedItems} item(ns) aplicados por esta importação. Desfaça a importação antes de excluir o histórico.` }, { status: 409 });
  }
  await prisma.auraImportJob.delete({ where: { id } });
  await audit(session, {
    action: "aura.import.delete",
    entity: "AuraImportJob",
    entityId: id,
    summary: `Importação excluída do histórico: ${job.fileName}`,
  });
  return NextResponse.json({ deleted: true });
}

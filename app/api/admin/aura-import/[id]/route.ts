import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
import prisma from "../../../../../src/lib/prisma";

const deletableStatuses = new Set(["UPLOADED", "PREVIEW", "READY", "FAILED", "CANCELLED", "ROLLED_BACK"]);

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal exclui importações." }, { status: 403 });
  const { id } = await params;
  const job = await prisma.auraImportJob.findUnique({
    where: { id },
    select: { id: true, fileName: true, status: true, createdItems: true, updatedItems: true },
  });
  if (!job) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  const completedWithoutChanges = job.status === "COMPLETED" && job.createdItems === 0 && job.updatedItems === 0;
  if (!deletableStatuses.has(job.status) && !completedWithoutChanges) {
    return NextResponse.json({ error: "Desfaça ou cancele a importação antes de excluí-la do histórico." }, { status: 409 });
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

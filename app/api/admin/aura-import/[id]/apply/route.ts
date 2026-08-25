import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { audit } from "../../../../../../src/lib/audit";
import { startAuraImport } from "../../../../../../src/lib/aura/processService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal pode aplicar a importação." }, { status: 403 });
  const { id } = await params;
  try {
    const job = await startAuraImport(id);
    await audit(session, { action: "aura.import.apply", entity: "AuraImportJob", entityId: id, summary: `Importação iniciada: ${job.fileName}` });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar a importação." }, { status: 400 });
  }
}

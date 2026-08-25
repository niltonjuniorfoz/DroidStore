import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { audit } from "../../../../../../src/lib/audit";
import { pauseAuraImport } from "../../../../../../src/lib/aura/processService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal pode pausar." }, { status: 403 });
  const { id } = await params;
  try {
    const job = await pauseAuraImport(id);
    await audit(session, { action: "aura.import.pause", entity: "AuraImportJob", entityId: id, summary: "Importação pausada" });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível pausar." }, { status: 400 });
  }
}

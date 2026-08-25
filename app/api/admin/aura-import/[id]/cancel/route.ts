import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { audit } from "../../../../../../src/lib/audit";
import { cancelAuraImport } from "../../../../../../src/lib/aura/processService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal pode cancelar." }, { status: 403 });
  const { id } = await params;
  try {
    const job = await cancelAuraImport(id);
    await audit(session, { action: "aura.import.cancel", entity: "AuraImportJob", entityId: id, summary: "Importação cancelada; novos lotes foram bloqueados" });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível cancelar." }, { status: 400 });
  }
}

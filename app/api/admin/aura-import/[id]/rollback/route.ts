import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { audit } from "../../../../../../src/lib/audit";
import { rollbackAuraImport } from "../../../../../../src/lib/aura/rollbackService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal pode desfazer uma importação." }, { status: 403 });
  const { id } = await params;
  const user = session.user as { id?: string };
  try {
    const result = await rollbackAuraImport(id, user.id);
    await audit(session, {
      action: "aura.import.rollback",
      entity: "AuraImportJob",
      entityId: id,
      summary: result.partial.length ? `Rollback parcial: ${result.restored} restaurados, ${result.partial.length} pendentes` : `Rollback concluído: ${result.restored} item(ns)`,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível desfazer a importação." }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { prepareAuraImportBatch } from "../../../../../../src/lib/aura/jobService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal prepara a importação." }, { status: 403 });
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({})) as { batchSize?: number };
    return NextResponse.json(await prepareAuraImportBatch(id, body.batchSize));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao preparar a prévia." }, { status: 400 });
  }
}

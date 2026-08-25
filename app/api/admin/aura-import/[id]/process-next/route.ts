import { NextResponse } from "next/server";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { audit } from "../../../../../../src/lib/audit";
import { getAuraJob } from "../../../../../../src/lib/aura/jobService";
import { processAuraImportBatch } from "../../../../../../src/lib/aura/processService";
import { processSupplierSyncBatch } from "../../../../../../src/lib/aura/supplierSync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal processa o catálogo." }, { status: 403 });
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({})) as { batchSize?: number };
    const job = await getAuraJob(id);
    if (!job) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
    const result = job.kind === "SUPPLIER_XLSX"
      ? await processSupplierSyncBatch(id, body.batchSize)
      : await processAuraImportBatch(id, body.batchSize);
    await Promise.all(result.events.map((event) => audit(session, {
      action: event.action,
      entity: "Product",
      entityId: event.entityId,
      summary: `${event.sku}: ${event.name}`,
    })));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao processar o próximo lote." }, { status: 400 });
  }
}

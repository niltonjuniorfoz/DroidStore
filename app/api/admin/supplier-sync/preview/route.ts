import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
import { createSupplierSyncJob } from "../../../../../src/lib/aura/supplierSync";
import { deleteTemporaryAdminUpload, readTemporaryAdminUpload } from "../../../../../src/lib/aura/uploadSource";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  url: z.string().min(1).max(2000),
  fileName: z.string().trim().min(1).max(255).refine((value) => value.toLowerCase().endsWith(".xlsx"), "Envie um arquivo .xlsx"),
  mapping: z.object({ sku: z.string().optional(), price: z.string().optional(), brand: z.string().optional(), name: z.string().optional() }).optional(),
});

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Arquivo inválido." }, { status: 400 });
  try {
    const buffer = await readTemporaryAdminUpload(body.data.url, 15 * 1024 * 1024);
    const user = session.user as { id?: string; name?: string | null; email?: string | null };
    const result = await createSupplierSyncJob({ buffer, fileName: body.data.fileName, mapping: body.data.mapping, actor: user });
    await deleteTemporaryAdminUpload(body.data.url);
    await audit(session, { action: "supplier.sync.preview", entity: "AuraImportJob", entityId: result.job.id, summary: `Planilha do fornecedor validada: ${result.summary.originalRows} SKU(s)` });
    return NextResponse.json({ jobId: result.job.id, summary: result.summary, supplier: result.supplier }, { status: 201 });
  } catch (error) {
    const details = error as Error & { headers?: string[] };
    return NextResponse.json({ error: details.message || "Não foi possível ler a planilha.", headers: details.headers }, { status: 400 });
  }
}

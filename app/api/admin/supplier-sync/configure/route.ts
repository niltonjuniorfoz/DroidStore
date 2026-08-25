import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
import { configureSupplierSync } from "../../../../../src/lib/aura/supplierSync";

const schema = z.object({
  jobId: z.string().uuid(),
  exchangeRate: z.coerce.number().positive().max(100),
  roundingRule: z.enum(["CEIL_10", "NEAREST_10", "CEIL_50", "CEIL_100"]),
  scopeBrands: z.array(z.string().trim().min(1).max(120)).min(1).max(500),
  markups: z.array(z.object({ brand: z.string().trim().min(1).max(120), markupPercent: z.coerce.number().min(0).max(1000), persist: z.boolean().optional() })).min(1).max(500),
});

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal configura preço e escopo." }, { status: 403 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Configuração inválida." }, { status: 400 });
  try {
    const job = await configureSupplierSync(body.data);
    await audit(session, { action: "supplier.sync.configure", entity: "AuraImportJob", entityId: job.id, summary: `Escopo confirmado: ${body.data.scopeBrands.join(", ")}` });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível configurar a sincronização." }, { status: 400 });
  }
}

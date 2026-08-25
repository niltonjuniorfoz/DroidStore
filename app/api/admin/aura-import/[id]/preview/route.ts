import type { AuraImportAction, AuraImportItemStatus, Condition } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../src/lib/admin";
import { getAuraJob, getAuraJobItems } from "../../../../../../src/lib/aura/jobService";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const job = await getAuraJob(id);
  if (!job) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") as AuraImportAction | null;
  const status = searchParams.get("status") as AuraImportItemStatus | null;
  const condition = searchParams.get("condition") as Condition | null;
  const result = await getAuraJobItems({
    jobId: id,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 50),
    action: action && ["CREATE", "UPDATE", "UNCHANGED", "REVIEW", "ERROR"].includes(action) ? action : undefined,
    status: status && ["PENDING", "CREATED", "UPDATED", "UNCHANGED", "REVIEW", "ERROR", "IGNORED", "ROLLED_BACK"].includes(status) ? status : undefined,
    availability: searchParams.get("availability") === "available" ? "available" : searchParams.get("availability") === "unavailable" ? "unavailable" : undefined,
    brand: searchParams.get("brand") ?? undefined,
    sourceGroup: searchParams.get("group") ?? undefined,
    sourceSubgroup: searchParams.get("subgroup") ?? undefined,
    optionId: searchParams.get("optionId") ?? undefined,
    condition: condition && ["NOVO", "NOVO_REEMBALADO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"].includes(condition) ? condition : undefined,
    identity: searchParams.get("identity") === "new" ? "new" : searchParams.get("identity") === "existing" ? "existing" : undefined,
    query: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ job, ...result });
}

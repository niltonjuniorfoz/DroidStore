import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../src/lib/admin";
import { getAuraJob } from "../../../../../../src/lib/aura/jobService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const job = await getAuraJob(id);
  if (!job) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  return NextResponse.json(job);
}

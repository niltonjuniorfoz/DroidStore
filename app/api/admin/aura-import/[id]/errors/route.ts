import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../src/lib/admin";
import prisma from "../../../../../../src/lib/prisma";

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const job = await prisma.auraImportJob.findUnique({ where: { id }, select: { fileName: true } });
  if (!job) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  const items = await prisma.auraImportItem.findMany({ where: { jobId: id, status: { in: ["ERROR", "REVIEW"] } }, orderBy: { rowNumber: "asc" } });
  const lines = ["SKU,Produto,Status,Problemas", ...items.map((item) => {
    const problems = Array.isArray(item.messages) ? item.messages.map((message) => message && typeof message === "object" && "message" in message ? String(message.message) : "").filter(Boolean).join(" | ") : "";
    return [item.sku, item.name, item.status, problems].map(csvCell).join(",");
  })];
  const safeName = job.fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${safeName}-erros.csv"` },
  });
}

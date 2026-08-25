import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";
import { createAuraImportJob } from "../../../../../src/lib/aura/jobService";
import { parseAuraExport } from "../../../../../src/lib/aura/schema";
import { deleteTemporaryAdminUpload, readTemporaryAdminUpload } from "../../../../../src/lib/aura/uploadSource";

export const runtime = "nodejs";
export const maxDuration = 60;

const uploadSchema = z.object({
  url: z.string().min(1).max(2000),
  fileName: z.string().trim().min(1).max(255).refine((value) => value.toLowerCase().endsWith(".json"), "Envie um arquivo .json"),
});

const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024;

async function readUpload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Selecione um arquivo JSON válido.");
    if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Envie um arquivo .json");
    if (file.size > DIRECT_UPLOAD_LIMIT) throw new Error("Para catálogos acima de 4 MB, configure o Vercel Blob.");
    return { buffer: Buffer.from(await file.arrayBuffer()), fileName: file.name, temporaryUrl: "" };
  }

  const parsedBody = uploadSchema.safeParse(await request.json());
  if (!parsedBody.success) throw new Error(parsedBody.error.issues[0]?.message ?? "Upload inválido.");
  return {
    buffer: await readTemporaryAdminUpload(parsedBody.data.url, 75 * 1024 * 1024),
    fileName: parsedBody.data.fileName,
    temporaryUrl: parsedBody.data.url,
  };
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { buffer, fileName, temporaryUrl } = await readUpload(request);
    const parsed = parseAuraExport(buffer);
    const user = session.user as { id?: string; name?: string | null; email?: string | null };
    const result = await createAuraImportJob({ parsed, fileName, actor: user });
    if (temporaryUrl) await deleteTemporaryAdminUpload(temporaryUrl);
    await audit(session, {
      action: "aura.import.create",
      entity: "AuraImportJob",
      entityId: result.job.id,
      summary: `Catálogo Aura validado: ${result.summary.totalJson} SKU(s)`,
    });
    return NextResponse.json({ jobId: result.job.id, summary: result.summary, supplier: result.supplier }, { status: 201 });
  } catch (error) {
    console.error("aura import upload", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar o catálogo Aura." }, { status: 400 });
  }
}

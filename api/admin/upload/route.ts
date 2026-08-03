import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";

export const runtime = "nodejs";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["model/gltf-binary", "glb"],
  ["model/gltf+json", "gltf"],
  ["application/octet-stream", "glb"],
]);

// Mantém o upload abaixo do limite comum de requisições de funções serverless
// e evita guardar arquivos excessivamente grandes no PostgreSQL.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

async function ensureMediaTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SiteMedia" (
      "id" TEXT PRIMARY KEY,
      "mimeType" TEXT NOT NULL,
      "bytes" BYTEA NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecione uma imagem, vídeo ou modelo 3D." },
        { status: 400 },
      );
    }

    let extension = allowed.get(file.type);
    if (!extension) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".glb")) extension = "glb";
      else if (lowerName.endsWith(".gltf")) extension = "gltf";
    }

    if (!extension) {
      return NextResponse.json(
        { error: "Formato não aceito. Use JPG, PNG, WebP, MP4, WebM, MOV, GLB ou GLTF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "O arquivo deve ter no máximo 4 MB. Comprima a imagem ou o vídeo e tente novamente." },
        { status: 400 },
      );
    }

    const key = `${randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await ensureMediaTable();
    await prisma.$executeRaw`
      INSERT INTO "SiteMedia" ("id", "mimeType", "bytes", "createdAt")
      VALUES (${key}, ${file.type || "application/octet-stream"}, ${bytes}, NOW())
    `;

    return NextResponse.json(
      { url: `/api/media/${key}`, message: "Arquivo enviado com sucesso." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Falha ao enviar mídia:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o arquivo. Tente novamente." },
      { status: 500 },
    );
  }
}

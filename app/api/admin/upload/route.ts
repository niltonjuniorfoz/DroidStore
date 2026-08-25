import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../src/lib/admin";
import { audit } from "../../../../src/lib/audit";
import { matchesSignature } from "../../../../src/lib/fileSignature";
import { readHomeFooterBanner } from "../../../../src/lib/homeContent";
import prisma from "../../../../src/lib/prisma";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const DATABASE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

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
  ["application/json", "json"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);

// Tipos de conteúdo aceitos por extensão no upload direto para o Vercel Blob.
const blobContentTypes: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mov: ["video/quicktime"],
  glb: ["model/gltf-binary", "application/octet-stream"],
  gltf: ["model/gltf+json", "application/json", "application/octet-stream"],
  json: ["application/json", "text/json", "application/octet-stream"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"],
};

const footerBannerMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const FOOTER_BANNER_MAX_BYTES = 4 * 1024 * 1024;

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

async function saveFooterBanner(file: File) {
  if (!footerBannerMimeTypes.has(file.type) || file.size > FOOTER_BANNER_MAX_BYTES) {
    return NextResponse.json(
      { error: "Use uma imagem JPG, PNG ou WebP de até 4 MB." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const bannerExtension = allowed.get(file.type);
  if (!bannerExtension || !matchesSignature(bannerExtension, bytes)) {
    return NextResponse.json({ error: "O conteúdo do arquivo não corresponde ao formato informado." }, { status: 400 });
  }
  const version = Date.now().toString();
  const publicUrl = `/api/media/home-footer-banner?v=${version}`;
  const current = await prisma.siteContent.findUnique({ where: { id: "main" } });
  const currentCatalogBanner = jsonRecord(current?.catalogBanner);
  const currentFooterBanner = readHomeFooterBanner(currentCatalogBanner);

  const nextCatalogBanner = {
    ...currentCatalogBanner,
    homeFooterBanner: {
      ...currentFooterBanner,
      imageUrl: publicUrl,
    },
    homeFooterBannerAsset: {
      contentType: file.type,
      data: bytes.toString("base64"),
      filename: file.name,
      size: file.size,
      version,
    },
  } as Prisma.InputJsonObject;

  await prisma.siteContent.upsert({
    where: { id: "main" },
    update: { catalogBanner: nextCatalogBanner },
    create: { id: "main", catalogBanner: nextCatalogBanner },
  });

  return NextResponse.json(
    {
      url: publicUrl,
      message: "Banner trocado e publicado com sucesso.",
    },
    { status: 201 },
  );
}

// Informa ao painel se o upload direto (Vercel Blob) está disponível.
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
}

// Fluxo de upload direto navegador -> Vercel Blob (gera o token com validação).
async function handleBlobUpload(req: Request, session: unknown) {
  const body = (await req.json()) as HandleUploadBody;
  if (body.type === "blob.generate-client-token") {
    await audit(session, {
      action: "upload.blob",
      entity: "Upload",
      summary: `Upload direto autorizado: ${(body.payload as { pathname?: string })?.pathname ?? "arquivo"}`,
    });
  }
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const extension = pathname.slice(pathname.lastIndexOf(".") + 1).toLowerCase();
        const contentTypes = blobContentTypes[extension];
        if (!pathname.startsWith("uploads/") || !contentTypes) {
          throw new Error("Formato de arquivo não permitido no painel.");
        }
        return {
          allowedContentTypes: contentTypes,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // URL volta direto para o navegador; nada a registrar no servidor.
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Falha no upload direto:", error);
    const message = error instanceof Error ? error.message : "Não foi possível enviar o arquivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    return handleBlobUpload(req, session);
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const purpose = form.get("purpose");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecione um arquivo válido." }, { status: 400 });
    }

    if (purpose === "home-footer-banner") return saveFooterBanner(file);

    let extension = allowed.get(file.type);
    if (!extension) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".glb")) extension = "glb";
      else if (lowerName.endsWith(".gltf")) extension = "gltf";
      else if (lowerName.endsWith(".json")) extension = "json";
      else if (lowerName.endsWith(".xlsx")) extension = "xlsx";
    }

    if (!extension || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Use um formato aceito pelo painel com até 100 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(extension, bytes)) {
      return NextResponse.json({ error: "O conteúdo do arquivo não corresponde ao formato informado." }, { status: 400 });
    }

    if (file.type.startsWith("image/")) {
      if (file.size > DATABASE_IMAGE_MAX_BYTES) {
        return NextResponse.json({ error: "Sem o Vercel Blob, use uma imagem de até 4 MB." }, { status: 400 });
      }
      const asset = await prisma.adminMediaAsset.create({
        data: {
          contentType: file.type,
          data: bytes,
          filename: file.name.slice(0, 255),
          size: file.size,
        },
      });
      const url = `/api/media/admin-upload/${asset.id}`;
      await audit(session, {
        action: "upload.database-image",
        entity: "AdminMediaAsset",
        entityId: asset.id,
        summary: `Imagem enviada: ${file.name} (${Math.round(file.size / 1024)} KB)`,
        after: { url, type: file.type, size: file.size },
      });
      return NextResponse.json({ url }, { status: 201 });
    }

    if (process.env.VERCEL) {
      return NextResponse.json({ error: "Configure o Vercel Blob para enviar vídeos e arquivos maiores." }, { status: 503 });
    }

    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
    await audit(session, {
      action: "upload.file",
      entity: "Upload",
      summary: `Arquivo enviado: ${file.name} (${Math.round(file.size / 1024)} KB)`,
      after: { url: `/uploads/${filename}`, type: file.type, size: file.size },
    });
    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Falha ao enviar arquivo:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o arquivo. Tente novamente." },
      { status: 500 },
    );
  }
}

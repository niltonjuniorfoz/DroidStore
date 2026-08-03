import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../src/lib/admin";
import { readHomeFooterBanner } from "../../../../src/lib/homeContent";
import prisma from "../../../../src/lib/prisma";

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

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const purpose = form.get("purpose");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecione uma imagem, vídeo ou modelo 3D (.glb)." }, { status: 400 });
    }

    if (purpose === "home-footer-banner") return saveFooterBanner(file);

    let extension = allowed.get(file.type);
    if (!extension) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".glb")) extension = "glb";
      else if (lowerName.endsWith(".gltf")) extension = "gltf";
    }

    if (!extension || file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Use JPG, PNG, WebP, MP4, WebM ou modelos 3D (.glb / .gltf) de até 100 MB." }, { status: 400 });
    }

    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Falha ao enviar arquivo:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o arquivo. Tente novamente." },
      { status: 500 },
    );
  }
}

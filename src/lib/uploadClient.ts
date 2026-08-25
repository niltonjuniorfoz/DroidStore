"use client";

import { upload } from "@vercel/blob/client";

// Extensão deduzida do nome ou do MIME quando o nome não tem extensão.
const mimeExtensions = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["model/gltf-binary", "glb"],
  ["model/gltf+json", "gltf"],
  ["application/json", "json"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);

let blobEnabled: boolean | null = null;
const SERVER_IMAGE_LIMIT = 4 * 1024 * 1024;

async function isBlobEnabled(): Promise<boolean> {
  if (blobEnabled !== null) return blobEnabled;
  try {
    const response = await fetch("/api/admin/upload", { cache: "no-store" });
    const data = response.ok ? await response.json() : {};
    blobEnabled = Boolean(data.blob);
  } catch {
    blobEnabled = false;
  }
  return blobEnabled;
}

function fileExtension(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  if (dot > 0 && dot < file.name.length - 1) return file.name.slice(dot + 1).toLowerCase();
  return mimeExtensions.get(file.type) ?? null;
}

/**
 * Envia um arquivo do painel admin.
 * Com Vercel Blob configurado, o arquivo vai direto do navegador para o storage
 * (sem passar pelo limite de 4,5 MB do body na Vercel). Sem Blob, cai no envio
 * multipart tradicional (dev local grava em public/uploads).
 */
export async function uploadAdminFile(file: File): Promise<{ url?: string; error?: string }> {
  async function uploadThroughServer() {
    if (file.type.startsWith("image/") && file.size > SERVER_IMAGE_LIMIT) {
      return { error: "Sem o Vercel Blob, use uma imagem de até 4 MB." };
    }
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { error: data.error ?? "Não foi possível enviar o arquivo." };
    return { url: data.url as string };
  }

  try {
    if (await isBlobEnabled()) {
      const extension = fileExtension(file);
      if (!extension) return { error: "Arquivo sem extensão reconhecida." };
      try {
        const result = await upload(`uploads/${crypto.randomUUID()}.${extension}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
        });
        return { url: result.url };
      } catch (error) {
        console.error("Blob upload error", error);
        if (!file.type.startsWith("image/")) throw error;
        return uploadThroughServer();
      }
    }
    return uploadThroughServer();
  } catch (error) {
    console.error("Upload error", error);
    return { error: "Não foi possível enviar o arquivo. Tente novamente." };
  }
}

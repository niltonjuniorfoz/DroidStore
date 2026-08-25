import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";

function trustedBlobUrl(url: URL) {
  return url.protocol === "https:"
    && (url.hostname.endsWith(".public.blob.vercel-storage.com") || url.hostname.endsWith(".blob.vercel-storage.com"));
}

function resolveLocalUpload(value: string) {
  const publicRoot = path.resolve(process.cwd(), "public", "uploads");
  const filePath = path.resolve(process.cwd(), "public", value.replace(/^\//, ""));
  if (!filePath.startsWith(`${publicRoot}${path.sep}`)) throw new Error("Caminho temporário inválido.");
  return filePath;
}

export async function readTemporaryAdminUpload(value: string, maxBytes: number) {
  if (value.startsWith("/uploads/")) {
    const buffer = await readFile(resolveLocalUpload(value));
    if (buffer.byteLength > maxBytes) throw new Error("O arquivo ultrapassa o limite permitido.");
    return buffer;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL temporária inválida.");
  }
  if (!trustedBlobUrl(url)) throw new Error("O arquivo precisa vir do armazenamento temporário autorizado.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { redirect: "error", signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Não foi possível ler o arquivo temporário (${response.status}).`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > maxBytes) throw new Error("O arquivo ultrapassa o limite permitido.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) throw new Error("O arquivo ultrapassa o limite permitido.");
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteTemporaryAdminUpload(value: string) {
  try {
    if (value.startsWith("/uploads/")) {
      await unlink(resolveLocalUpload(value));
      return;
    }
    const url = new URL(value);
    if (trustedBlobUrl(url) && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(value, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }
  } catch {
    // Limpeza temporária não pode invalidar um job já persistido.
  }
}

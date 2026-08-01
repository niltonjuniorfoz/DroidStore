import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../src/lib/admin";

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

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma imagem, vídeo ou modelo 3D (.glb)." }, { status: 400 });
  
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
}

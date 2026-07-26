import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../src/lib/admin";

const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  const extension = allowed.get(file.type);
  if (!extension || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Use JPG, PNG ou WebP de até 5 MB." }, { status: 400 });
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}

import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";

export const runtime = "nodejs";

const validKey = /^[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm|mov|glb|gltf)$/i;

type MediaRow = {
  mimeType: string;
  bytes: Uint8Array;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  if (!validKey.test(key)) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<MediaRow[]>`
      SELECT "mimeType", "bytes"
      FROM "SiteMedia"
      WHERE "id" = ${key}
      LIMIT 1
    `;

    const media = rows[0];
    if (!media) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    const body = new Uint8Array(media.bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Falha ao carregar mídia:", error);
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}

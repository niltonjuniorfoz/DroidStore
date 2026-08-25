import { NextResponse } from "next/server";
import prisma from "../../../../../src/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
    const asset = await prisma.adminMediaAsset.findUnique({
      where: { id },
      select: { contentType: true, data: true, size: true },
    });
    if (!asset || !asset.contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
    }
    const bytes = Uint8Array.from(asset.data);
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.size),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Falha ao carregar mídia administrativa:", error);
    return NextResponse.json({ error: "Mídia indisponível." }, { status: 500 });
  }
}

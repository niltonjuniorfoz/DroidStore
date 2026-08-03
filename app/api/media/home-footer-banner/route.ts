import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function GET() {
  try {
    const content = await prisma.siteContent.findUnique({
      where: { id: "main" },
      select: { catalogBanner: true },
    });
    const catalogBanner = record(content?.catalogBanner);
    const asset = record(catalogBanner?.homeFooterBannerAsset);
    const data = typeof asset?.data === "string" ? asset.data : "";
    const contentType = typeof asset?.contentType === "string" ? asset.contentType : "";

    if (!data || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Banner não encontrado" }, { status: 404 });
    }

    const bytes = Uint8Array.from(Buffer.from(data, "base64"));
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Falha ao carregar banner final:", error);
    return NextResponse.json({ error: "Banner indisponível" }, { status: 500 });
  }
}

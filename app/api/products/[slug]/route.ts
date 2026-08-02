import { NextResponse } from "next/server";
import { getProductBySlug } from "../../../../src/lib/storefront";

const publicCache = {
  headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json(product, publicCache);
}

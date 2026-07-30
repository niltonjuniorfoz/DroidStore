import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { getFamilyVariantsForProduct, mapProduct } from "../../../../src/lib/storefront";
import { products } from "../../../../src/lib/catalog";

const publicCache = {
  headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: { position: "asc" } },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
    });
    if (!product) {
      const fallback = products.find((item) => item.slug === slug);
      if (!fallback) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
      const familyVariants = await getFamilyVariantsForProduct(fallback);
      return NextResponse.json({ ...fallback, familyVariants }, publicCache);
    }
    const mapped = mapProduct(product);
    const familyVariants = await getFamilyVariantsForProduct(mapped);
    return NextResponse.json({ ...mapped, familyVariants }, publicCache);
  } catch {
    const fallback = products.find((item) => item.slug === slug);
    if (!fallback) return NextResponse.json({ error: "Catálogo indisponível" }, { status: 503 });
    const familyVariants = await getFamilyVariantsForProduct(fallback);
    return NextResponse.json({ ...fallback, familyVariants }, publicCache);
  }
}

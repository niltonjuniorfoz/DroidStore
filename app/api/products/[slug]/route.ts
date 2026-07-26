import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { mapProduct } from "../../../../src/lib/storefront";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        variants: { orderBy: { price: "asc" }, take: 1 },
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: { position: "asc" } },
        filterSelections: { include: { option: { include: { filter: true } } } },
      },
    });
    if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    return NextResponse.json(mapProduct(product));
  } catch {
    return NextResponse.json({ error: "Catálogo indisponível" }, { status: 503 });
  }
}

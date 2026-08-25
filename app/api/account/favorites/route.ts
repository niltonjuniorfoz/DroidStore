import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import prisma from "../../../../src/lib/prisma";
import { getStoreMode } from "../../../../src/lib/storefront";

const favoriteSchema = z.object({ productId: z.string().uuid() });

async function userId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const storeMode = await getStoreMode();
  const favorites = await prisma.favorite.findMany({
    where: { userId: id, product: { active: true } },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          variants: {
            where: storeMode === "DROPSHIPPING" ? { dropshipAvailable: true } : { stock: { gt: 0 } },
            orderBy: { price: "asc" },
            take: 1,
            select: { id: true, price: true, stock: true, dropshipAvailable: true, storage: true, color: true, condition: true },
          },
        },
      },
    },
  });
  return NextResponse.json(favorites);
}

export async function POST(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = favoriteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, active: true } });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: id, productId: parsed.data.productId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }
  await prisma.favorite.create({ data: { userId: id, productId: parsed.data.productId } });
  return NextResponse.json({ favorite: true });
}

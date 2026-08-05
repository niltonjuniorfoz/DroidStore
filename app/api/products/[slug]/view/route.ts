import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "../../../../../src/lib/prisma";
import { clientIp, rateLimit } from "../../../../../src/lib/rateLimit";

// Registra a visualização da página de produto.
// Visitante identificado por hash irreversível (IP + user-agent + dia) —
// serve para não contar a mesma pessoa 50 vezes, sem guardar dado pessoal.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const fingerprint = `${clientIp(req)}|${req.headers.get("user-agent") ?? ""}|${new Date().toISOString().slice(0, 10)}`;
  const visitorId = createHash("sha256").update(fingerprint).digest("hex").slice(0, 32);

  // Uma contagem por visitante/produto a cada 30 minutos.
  const limited = await rateLimit(`view:${slug}:${visitorId}`, 1, 30 * 60);
  if (!limited.ok) return new NextResponse(null, { status: 204 });

  try {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (product) {
      await prisma.productView.create({ data: { productId: product.id, visitorId } });
    }
  } catch (error) {
    console.error("Falha ao registrar visualização", error);
  }
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../src/lib/prisma";
import { requireAdmin } from "../../../../../src/lib/admin";
import { slugify } from "../../../../../src/lib/slug";
import { isPrismaError } from "../../../../../src/lib/prismaErrors";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id } = await params;
  try {
    const filter = await prisma.catalogFilter.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.name ? { slug: slugify(parsed.data.name) } : {}),
      },
      include: { options: { include: { _count: { select: { productSelections: true } } } } },
    });
    return NextResponse.json(filter);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json({ error: "Já existe um filtro com este nome." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.catalogFilter.deleteMany({ where: { id } });
  if (!deleted.count) return NextResponse.json({ error: "Filtro não encontrado." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

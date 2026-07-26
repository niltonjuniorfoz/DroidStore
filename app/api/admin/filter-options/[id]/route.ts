import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../src/lib/prisma";
import { requireAdmin } from "../../../../../src/lib/admin";
import { slugify } from "../../../../../src/lib/slug";

const patchSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id } = await params;
  try {
    const option = await prisma.catalogFilterOption.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.label ? { slug: slugify(parsed.data.label) } : {}),
      },
      include: { _count: { select: { productSelections: true } } },
    });
    return NextResponse.json(option);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Esta opção já existe neste filtro." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.catalogFilterOption.deleteMany({ where: { id } });
  if (!deleted.count) return NextResponse.json({ error: "Opção não encontrada." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

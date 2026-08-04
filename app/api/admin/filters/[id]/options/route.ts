import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../../src/lib/prisma";
import { requireAdmin } from "../../../../../../src/lib/admin";
import { slugify } from "../../../../../../src/lib/slug";
import { isPrismaError } from "../../../../../../src/lib/prismaErrors";

const createSchema = z.object({ label: z.string().trim().min(1).max(80) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Informe o nome da opção." }, { status: 400 });
  const { id } = await params;
  const filter = await prisma.catalogFilter.findUnique({ where: { id }, include: { _count: { select: { options: true } } } });
  if (!filter) return NextResponse.json({ error: "Filtro não encontrado." }, { status: 404 });
  const slug = slugify(parsed.data.label);
  try {
    const option = await prisma.catalogFilterOption.create({
      data: { filterId: id, label: parsed.data.label, slug, position: filter._count.options },
      include: { _count: { select: { productSelections: true } } },
    });
    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json({ error: "Esta opção já existe neste filtro." }, { status: 409 });
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";
import { slugify } from "../../../../src/lib/slug";

const createSchema = z.object({ name: z.string().trim().min(2).max(60) });
const reorderSchema = z.object({ ids: z.array(z.string().min(1).max(100)).min(1).max(100) });

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const filters = await prisma.catalogFilter.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      options: {
        orderBy: [{ position: "asc" }, { label: "asc" }],
        include: { _count: { select: { productSelections: true } } },
      },
    },
  });
  return NextResponse.json(filters);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Informe um nome com pelo menos 2 caracteres." }, { status: 400 });
  const slug = slugify(parsed.data.name);
  if (!slug) return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  const existing = await prisma.catalogFilter.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Já existe um filtro com este nome." }, { status: 409 });
  const position = await prisma.catalogFilter.count();
  const filter = await prisma.catalogFilter.create({
    data: { name: parsed.data.name, slug, position },
    include: { options: true },
  });
  return NextResponse.json(filter, { status: 201 });
}

export async function PUT(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = reorderSchema.safeParse(await req.json());
  if (!parsed.success || new Set(parsed.data.ids).size !== parsed.data.ids.length) {
    return NextResponse.json({ error: "Ordem inválida." }, { status: 400 });
  }
  const existing = await prisma.catalogFilter.count({ where: { id: { in: parsed.data.ids } } });
  if (existing !== parsed.data.ids.length) {
    return NextResponse.json({ error: "Um dos filtros não existe mais." }, { status: 400 });
  }
  await prisma.$transaction(
    parsed.data.ids.map((id, position) => prisma.catalogFilter.update({ where: { id }, data: { position } })),
  );
  return NextResponse.json({ ok: true });
}

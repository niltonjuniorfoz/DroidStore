import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import prisma from "../../../../../src/lib/prisma";

const addressSchema = z.object({
  zipCode: z.string().trim().min(8).max(10),
  street: z.string().trim().min(2).max(150),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(100).optional().nullable(),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
});

async function userId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await userId();
  if (!ownerId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.address.findFirst({ where: { id, userId: ownerId } });
  if (!existing) return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
  const parsed = addressSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  return NextResponse.json(
    await prisma.address.update({
      where: { id },
      data: { ...parsed.data, complement: parsed.data.complement || null },
    }),
  );
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await userId();
  if (!ownerId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const result = await prisma.address.deleteMany({ where: { id, userId: ownerId } });
  if (!result.count) return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

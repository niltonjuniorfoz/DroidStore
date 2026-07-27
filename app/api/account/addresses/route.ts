import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import prisma from "../../../../src/lib/prisma";
import { isBrazilState } from "../../../../src/lib/brazil";

const addressSchema = z.object({
  zipCode: z.string().trim().min(8).max(10),
  street: z.string().trim().min(2).max(150),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(100).optional().nullable(),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()).refine(isBrazilState, "Selecione um estado brasileiro válido."),
});

async function userId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return NextResponse.json(
    await prisma.address.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
  );
}

export async function POST(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = addressSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const address = await prisma.address.create({
    data: { ...parsed.data, complement: parsed.data.complement || null, userId: id },
  });
  return NextResponse.json(address, { status: 201 });
}

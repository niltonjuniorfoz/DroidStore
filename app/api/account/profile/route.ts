import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import prisma from "../../../../src/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(25).optional().nullable(),
  cpf: z.string().trim().max(18).optional().nullable(),
  birthDate: z.string().trim().optional().nullable(),
});

async function userId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, cpf: true, birthDate: true, role: true },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = profileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const cpf = parsed.data.cpf?.replace(/\D/g, "") || null;
  const phoneDigits = parsed.data.phone?.replace(/\D/g, "") || null;
  if (cpf && cpf.length !== 11) {
    return NextResponse.json({ error: "Informe um CPF com 11 dígitos." }, { status: 400 });
  }
  if (phoneDigits && ![10, 11].includes(phoneDigits.length)) {
    return NextResponse.json({ error: "Informe um telefone com DDD e 10 ou 11 dígitos." }, { status: 400 });
  }
  const birthDate = parsed.data.birthDate ? new Date(`${parsed.data.birthDate}T12:00:00`) : null;
  if (birthDate && Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });
  }
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        cpf,
        birthDate,
      },
      select: { id: true, name: true, email: true, phone: true, cpf: true, birthDate: true, role: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Este CPF já está cadastrado." }, { status: 409 });
    }
    throw error;
  }
}

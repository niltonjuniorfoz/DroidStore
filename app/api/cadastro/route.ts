import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../src/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(180),
  password: z.string().min(10).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
});

export async function POST(req: Request) {
  const content = await prisma.siteContent.findUnique({ where: { id: "main" }, select: { customerLoginEnabled: true } });
  if (content?.customerLoginEnabled === false) {
    return NextResponse.json({ error: "O cadastro de clientes está temporariamente desativado." }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Use nome, e-mail válido e senha com 10 caracteres, maiúscula, minúscula e número." }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  const password = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, password } });
  return NextResponse.json({ ok: true }, { status: 201 });
}

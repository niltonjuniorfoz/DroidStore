import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { validateAdminPassword } from "../../../../src/lib/adminUsers";
import { audit } from "../../../../src/lib/audit";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(180),
  password: z.string().min(1).max(72),
  role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário pode gerenciar a equipe." }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: userSelect,
  });
  return NextResponse.json({ users, selfId: (session.user as { id?: string }).id ?? null });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário pode gerenciar a equipe." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise nome, e-mail e senha." }, { status: 400 });
  }
  const passwordError = validateAdminPassword(parsed.data.password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    // Cliente existente pode ser promovido; outro admin não pode ser sobrescrito.
    if (existing.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Este e-mail já pertence a um membro da equipe." }, { status: 409 });
    }
    const promoted = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: parsed.data.role,
        active: true,
        name: parsed.data.name,
        password: await bcrypt.hash(parsed.data.password, 12),
      },
      select: userSelect,
    });
    await audit(session, {
      action: "user.promote",
      entity: "User",
      entityId: promoted.id,
      summary: `Cliente ${promoted.email} promovido a ${promoted.role}`,
      before: { role: "CUSTOMER" },
      after: { role: promoted.role, active: true },
    });
    return NextResponse.json(promoted, { status: 201 });
  }

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
    },
    select: userSelect,
  });
  await audit(session, {
    action: "user.create",
    entity: "User",
    entityId: created.id,
    summary: `Acesso criado para ${created.email} (${created.role})`,
    after: { role: created.role, active: true },
  });
  return NextResponse.json(created, { status: 201 });
}

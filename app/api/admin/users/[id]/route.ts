import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { validateAdminPassword, validateAdminPatch } from "../../../../../src/lib/adminUsers";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(1).max(72).optional(),
}).refine((data) => data.role !== undefined || data.active !== undefined || data.password !== undefined, {
  message: "Informe uma alteração.",
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário pode gerenciar a equipe." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  if (parsed.data.password !== undefined) {
    const passwordError = validateAdminPassword(parsed.data.password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const { id } = await params;
  const actorId = (session.user as { id?: string }).id ?? "";

  const updated = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, active: true } });
    if (!target || !["ADMIN", "MANAGER"].includes(target.role)) throw new Error("NOT_FOUND");

    const activeAdminCount = await tx.user.count({ where: { role: "ADMIN", active: true } });
    const error = validateAdminPatch(
      {
        actorId,
        targetId: target.id,
        targetRole: target.role as "ADMIN" | "MANAGER",
        targetActive: target.active,
        activeAdminCount,
      },
      { role: parsed.data.role, active: parsed.data.active },
    );
    if (error) throw new Error(`RULE:${error}`);

    return tx.user.update({
      where: { id },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.password !== undefined
          ? { password: await bcrypt.hash(parsed.data.password, 12) }
          : {}),
      },
      select: userSelect,
    });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "NOT_FOUND") return "NOT_FOUND" as const;
    if (error instanceof Error && error.message.startsWith("RULE:")) return error.message.slice(5);
    throw error;
  });

  if (updated === "NOT_FOUND") {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  if (typeof updated === "string") {
    return NextResponse.json({ error: updated }, { status: 409 });
  }
  return NextResponse.json(updated);
}

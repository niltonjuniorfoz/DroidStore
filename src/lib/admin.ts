import { auth } from "../../auth";
import prisma from "./prisma";

/**
 * Autoriza acesso administrativo. Além do papel no token JWT, confere o estado
 * atual no banco: conta desativada ou rebaixada perde acesso imediatamente,
 * sem esperar o token expirar.
 */
export async function requireAdmin() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(sessionUser?.role ?? "")) return null;

  const userId = sessionUser?.id;
  if (!userId) return null;
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true },
  });
  if (!current || !current.active || !["ADMIN", "MANAGER"].includes(current.role)) return null;

  // Papel fresco do banco vence o papel congelado no token (ex.: rebaixado de ADMIN para MANAGER).
  (session.user as { role?: string }).role = current.role;
  return session;
}

export function isOwnerAdmin(session: unknown) {
  return (session as { user?: { role?: string } } | null)?.user?.role === "ADMIN";
}

import { auth } from "../../auth";

export async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(role ?? "")) return null;
  return session;
}

export function isOwnerAdmin(session: unknown) {
  return (session as { user?: { role?: string } } | null)?.user?.role === "ADMIN";
}

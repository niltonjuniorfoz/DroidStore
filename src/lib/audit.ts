import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

type AuditEntry = {
  action: string; // "entidade.verbo", ex.: "product.update"
  entity: string;
  entityId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
};

function actorFrom(session: unknown) {
  const user = (session as { user?: { id?: string; email?: string | null } } | null)?.user;
  return { actorId: user?.id ?? null, actorEmail: user?.email ?? null };
}

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Passa por JSON para derrubar Decimal/Date em tipos serializáveis.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Registra uma ação administrativa. Nunca lança: auditoria caindo não pode
 * derrubar a operação que está sendo auditada.
 */
export async function audit(session: unknown, entry: AuditEntry): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        ...actorFrom(session),
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary?.slice(0, 300) ?? null,
        before: asJson(entry.before),
        after: asJson(entry.after),
      },
    });
  } catch (error) {
    console.error("Falha ao registrar auditoria", entry.action, error);
  }
}

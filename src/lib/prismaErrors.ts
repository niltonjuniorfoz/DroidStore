import { Prisma } from "@prisma/client";

// Identificação de erros do Prisma por código estável, não por texto de mensagem.
// P2002: violação de unique · P2003: violação de foreign key · P2025: registro não encontrado
export function isPrismaError(error: unknown, code: "P2002" | "P2003" | "P2025"): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

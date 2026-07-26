import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  pixDiscount: z.coerce.number().int().min(0).max(30),
  maxInstallments: z.coerce.number().int().min(1).max(24),
});

function integrations() {
  return {
    ollama: Boolean(process.env.OLLAMA_API_KEY),
    mercadoPago: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
    email: Boolean(process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY),
  };
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const content = await prisma.siteContent.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
  return NextResponse.json({ content, integrations: integrations(), ownerView: isOwnerAdmin(session) });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário pode alterar estas configurações." }, { status: 403 });
  }
  const parsed = settingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const content = await prisma.siteContent.upsert({
    where: { id: "main" },
    update: {
      ...parsed.data,
      contactEmail: parsed.data.contactEmail || null,
      whatsapp: parsed.data.whatsapp || null,
    },
    create: {
      id: "main",
      ...parsed.data,
      contactEmail: parsed.data.contactEmail || null,
      whatsapp: parsed.data.whatsapp || null,
    },
  });
  return NextResponse.json({ content, integrations: integrations(), ownerView: true });
}

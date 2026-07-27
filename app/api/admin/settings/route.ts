import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { readInstagramFromCatalogBanner } from "../../../../src/lib/contact";
import { brazilNationalPhoneDigits, formatBrazilPhone } from "../../../../src/lib/brazil";

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  instagramUrl: z.string().trim().max(220).optional().nullable(),
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

function withInstagram<T extends { catalogBanner: unknown }>(content: T) {
  return { ...content, instagramUrl: readInstagramFromCatalogBanner(content.catalogBanner) };
}

function mergeInstagram(catalogBanner: unknown, instagramUrl: string | null | undefined) {
  const current = catalogBanner && typeof catalogBanner === "object" && !Array.isArray(catalogBanner)
    ? catalogBanner as Prisma.InputJsonObject
    : {};

  return {
    ...current,
    instagramUrl: instagramUrl?.trim() ?? "",
  } as Prisma.InputJsonObject;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const content = await prisma.siteContent.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
  return NextResponse.json({ content: withInstagram(content), integrations: integrations(), ownerView: isOwnerAdmin(session) });
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

  const current = await prisma.siteContent.findUnique({ where: { id: "main" } });
  const { instagramUrl, whatsapp, ...settings } = parsed.data;
  const whatsappDigits = brazilNationalPhoneDigits(whatsapp);
  if (whatsapp && ![10, 11].includes(whatsappDigits.length)) {
    return NextResponse.json({ error: "Informe um WhatsApp brasileiro com DDD e 10 ou 11 dígitos." }, { status: 400 });
  }
  const formattedWhatsapp = whatsapp ? formatBrazilPhone(whatsapp) : null;
  const catalogBanner = mergeInstagram(current?.catalogBanner, instagramUrl);
  const content = await prisma.siteContent.upsert({
    where: { id: "main" },
    update: {
      ...settings,
      contactEmail: settings.contactEmail || null,
      whatsapp: formattedWhatsapp,
      catalogBanner,
    },
    create: {
      id: "main",
      ...settings,
      contactEmail: settings.contactEmail || null,
      whatsapp: formattedWhatsapp,
      catalogBanner,
    },
  });
  return NextResponse.json({ content: withInstagram(content), integrations: integrations(), ownerView: true });
}

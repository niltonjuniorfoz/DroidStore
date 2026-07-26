import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";

const slideSchema = z.object({
  eyebrow: z.string().trim().min(2).max(100),
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(5).max(400),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  buttonLabel: z.string().trim().min(2).max(40),
  buttonHref: z.string().trim().startsWith("/").max(200),
});

const catalogBannerSchema = z.object({
  eyebrow: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(300),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

const schema = z.object({
  storeName: z.string().trim().min(2).max(60),
  heroSlides: z.array(slideSchema).min(1).max(3),
  catalogBanner: catalogBannerSchema,
  navigation: z.array(z.object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1).max(40),
    href: z.string().trim().startsWith("/").max(200),
    active: z.boolean(),
  })).max(12),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const [content, navigation] = await Promise.all([
    prisma.siteContent.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } }),
    prisma.navigationItem.findMany({ orderBy: { position: "asc" } }),
  ]);
  return NextResponse.json({ ...content, navigation });
}

export async function PUT(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os textos, imagens e links informados." }, { status: 400 });

  const { navigation, heroSlides, catalogBanner, storeName } = parsed.data;
  const first = heroSlides[0];
  await prisma.$transaction(async (tx) => {
    await tx.siteContent.upsert({
      where: { id: "main" },
      update: {
        storeName,
        heroSlides,
        catalogBanner,
        heroEyebrow: first.eyebrow,
        heroTitle: first.title,
        heroDescription: first.description,
        heroImageUrl: first.imageUrl || null,
      },
      create: {
        id: "main",
        storeName,
        heroSlides,
        catalogBanner,
        heroEyebrow: first.eyebrow,
        heroTitle: first.title,
        heroDescription: first.description,
        heroImageUrl: first.imageUrl || null,
      },
    });
    await tx.navigationItem.deleteMany();
    if (navigation.length) {
      await tx.navigationItem.createMany({
        data: navigation.map((item, position) => ({ label: item.label, href: item.href, active: item.active, position })),
      });
    }
  });
  return NextResponse.json({ ok: true });
}

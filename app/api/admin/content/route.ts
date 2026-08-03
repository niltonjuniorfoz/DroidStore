import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";
import { readInstagramFromCatalogBanner } from "../../../../src/lib/contact";
import {
  readHomeFeaturedTitle,
  readHomeFooterBanner,
  readHomeProductSections,
  readHomePromoBanners,
} from "../../../../src/lib/homeContent";

const slideSchema = z.object({
  eyebrow: z.string().trim().max(100).optional().or(z.literal("")),
  title: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  buttonLabel: z.string().trim().max(40).optional().or(z.literal("")),
  buttonHref: z.string().trim().max(200).optional().or(z.literal("")),
});

const catalogBannerSchema = z.object({
  eyebrow: z.string().trim().max(100).optional().or(z.literal("")),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

const homePromoBannerSchema = z.object({
  eyebrow: z.string().trim().max(100),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(240),
  imageUrl: z.string().trim().min(1).max(500),
  buttonLabel: z.string().trim().min(1).max(40),
  buttonHref: z.string().trim().startsWith("/").max(200),
});


const homeFooterBannerSchema = z.object({
  imageUrl: z.string().trim().min(1).max(500),
  linkHref: z.string().trim().max(200).refine((value) => value === "" || value.startsWith("/"), {
    message: "O link deve ser vazio ou começar com /.",
  }),
  active: z.boolean(),
});

const homeProductSectionSchema = z.object({
  title: z.string().trim().min(1).max(60),
  query: z.string().trim().min(1).max(160),
  buttonLabel: z.string().trim().min(1).max(40),
  buttonHref: z.string().trim().startsWith("/").max(200),
});

const schema = z.object({
  storeName: z.string().trim().min(2).max(60),
  heroSlides: z.array(slideSchema).min(1).max(5),
  catalogBanner: catalogBannerSchema.optional(),
  catalogSlides: z.array(catalogBannerSchema).min(1).max(5).optional(),
  homeFeaturedTitle: z.string().trim().min(1).max(80),
  homeFooterBanner: homeFooterBannerSchema,
  homePromoBanners: z.array(homePromoBannerSchema).length(2),
  homeProductSections: z.array(homeProductSectionSchema).length(2),
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
  return NextResponse.json({
    ...content,
    storeName: ["DroidStore", "Brasil Store"].includes(content.storeName) ? "Aura Tech" : content.storeName,
    navigation,
    homeFeaturedTitle: readHomeFeaturedTitle(content.catalogBanner),
    homeFooterBanner: readHomeFooterBanner(content.catalogBanner),
    homePromoBanners: readHomePromoBanners(content.catalogBanner),
    homeProductSections: readHomeProductSections(content.catalogBanner),
  });
}

export async function PUT(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os textos, imagens e links informados." }, { status: 400 });

  const {
    navigation,
    heroSlides,
    catalogBanner,
    catalogSlides,
    homeFeaturedTitle,
    homeFooterBanner,
    homePromoBanners,
    homeProductSections,
    storeName,
  } = parsed.data;
  const first = heroSlides[0];
  const currentContent = await prisma.siteContent.findUnique({ where: { id: "main" } });
  const instagramUrl = readInstagramFromCatalogBanner(currentContent?.catalogBanner);
  const catalogBannerWithInstagram = {
    ...(catalogBanner ?? {}),
    ...(instagramUrl ? { instagramUrl } : {}),
    homeFeaturedTitle,
    homeFooterBanner,
    homePromoBanners,
    homeProductSections,
  };
  await prisma.$transaction(async (tx) => {
    await tx.siteContent.upsert({
      where: { id: "main" },
      update: {
        storeName,
        heroSlides,
        catalogBanner: catalogBannerWithInstagram,
        catalogSlides: catalogSlides || (catalogBanner ? [catalogBanner] : []),
        heroEyebrow: first.eyebrow,
        heroTitle: first.title,
        heroDescription: first.description,
        heroImageUrl: first.imageUrl || null,
      },
      create: {
        id: "main",
        storeName,
        heroSlides,
        catalogBanner: catalogBannerWithInstagram,
        catalogSlides: catalogSlides || (catalogBanner ? [catalogBanner] : []),
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

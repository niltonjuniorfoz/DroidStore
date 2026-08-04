import type { MetadataRoute } from "next";
import prisma from "../src/lib/prisma";
import { products } from "../src/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";

  // Slugs reais do banco; catálogo estático só como reserva se o banco cair.
  let slugs: Array<{ slug: string; updatedAt?: Date }> = [];
  try {
    slugs = await prisma.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
  } catch {
    slugs = products.map((product) => ({ slug: product.slug }));
  }

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/celulares`, changeFrequency: "daily", priority: .9 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: .2 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: .2 },
    { url: `${base}/.well-known/srscooby-njr-49912131-fingerprint.txt`, changeFrequency: "yearly", priority: .1 },
    ...slugs.map(({ slug, updatedAt }) => ({
      url: `${base}/produto/${slug}`,
      changeFrequency: "weekly" as const,
      priority: .7,
      ...(updatedAt ? { lastModified: updatedAt } : {}),
    })),
  ];
}

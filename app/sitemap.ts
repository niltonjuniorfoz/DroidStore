import type { MetadataRoute } from "next";
import { products } from "../src/lib/catalog";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/celulares`, changeFrequency: "daily", priority: .9 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: .2 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: .2 },
    ...products.map((product) => ({ url: `${base}/produto/${product.slug}`, changeFrequency: "weekly" as const, priority: .7 })),
  ];
}

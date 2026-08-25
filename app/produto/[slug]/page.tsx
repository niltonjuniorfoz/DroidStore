import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getSiteContent } from "../../../src/lib/storefront";
import ProductPageClient from "./ProductPageClient";

const baseUrl = () => process.env.APP_URL ?? "http://localhost:3000";

function absoluteUrl(pathOrUrl: string | undefined | null): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${baseUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

// Condição da loja -> vocabulário schema.org (habilita rich results de oferta).
const schemaCondition: Record<string, string> = {
  "Novo": "https://schema.org/NewCondition",
  "Novo Reembalado": "https://schema.org/RefurbishedCondition",
  "Outlet": "https://schema.org/RefurbishedCondition",
  "Excelente": "https://schema.org/UsedCondition",
  "Muito Bom": "https://schema.org/UsedCondition",
  "Bom": "https://schema.org/UsedCondition",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const price = product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const title = `${product.name} ${product.storage} ${product.color} — ${product.condition}`;
  const description = `${product.condition} por ${price}. ${product.description}`.slice(0, 160);
  const image = absoluteUrl(product.images?.[0] ?? product.imageUrl);
  const canonical = `${baseUrl()}/produto/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const content = await getSiteContent().catch(() => null);
  const storeName = (content as { storeName?: string } | null)?.storeName ?? "Aura Tech";
  const images = [
    ...(product.images ?? []),
    ...(product.imageUrl && !(product.images ?? []).includes(product.imageUrl) ? [product.imageUrl] : []),
  ].map(absoluteUrl).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${product.storage} ${product.color}`,
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: product.brand },
    ...(images.length ? { image: images } : {}),
    offers: {
      "@type": "Offer",
      url: `${baseUrl()}/produto/${product.slug}`,
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      itemCondition: schemaCondition[product.condition] ?? "https://schema.org/UsedCondition",
      availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: storeName },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify não escapa "<" — troca defensiva contra fechamento precoce da tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }}
      />
      <ProductPageClient slug={slug} initialProduct={product} />
    </>
  );
}

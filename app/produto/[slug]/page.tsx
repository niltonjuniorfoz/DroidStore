import { notFound } from "next/navigation";
import { getProductBySlug } from "../../../src/lib/storefront";
import ProductPageClient from "./ProductPageClient";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return <ProductPageClient slug={slug} initialProduct={product} />;
}

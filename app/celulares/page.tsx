import type { Metadata } from "next";
import { getProducts, getPublicCatalogFilters } from "../../src/lib/storefront";
import CatalogPageClient from "./CatalogPageClient";

// ISR: catálogo renderizado no servidor (Google enxerga os produtos reais)
// e atualizado no máximo a cada 60 segundos. O client continua revalidando
// preço/estoque ao vivo via /api/products depois da primeira pintura.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Catálogo de celulares e produtos",
  description: "Celulares novos e seminovos com garantia, revisão técnica e compra protegida. Filtre por marca, capacidade, cor e condição.",
  alternates: { canonical: `${process.env.APP_URL ?? "http://localhost:3000"}/celulares` },
};

export default async function CatalogPage() {
  const [initialCatalog, initialFilters] = await Promise.all([
    getProducts(false),
    getPublicCatalogFilters(),
  ]);

  return <CatalogPageClient initialCatalog={initialCatalog} initialFilters={initialFilters} />;
}

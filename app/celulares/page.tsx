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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [initialCatalog, initialFilters] = await Promise.all([
    getProducts(false, {
      query: first(params.q),
      brand: first(params.brand),
      category: first(params.categoria) ?? first(params.category) ?? first(params.cat),
      condition: first(params.condition),
    }),
    getPublicCatalogFilters(),
  ]);

  return <CatalogPageClient initialCatalog={initialCatalog} initialFilters={initialFilters} />;
}

import type { Metadata } from "next";
import type { CatalogSection } from "../../src/lib/catalog";
import { getCatalogPage, type CatalogSort } from "../../src/lib/catalogPagination";
import CatalogPageClient from "./CatalogPageClient";

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

function numberParam(value: string | undefined) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sectionFromCondition(value: string | undefined): CatalogSection {
  return value === "Seminovos"
    || value === "Excelente"
    || value === "Muito Bom"
    || value === "Bom"
    || value === "Outlet"
      ? "Seminovos"
      : "Novos";
}

function exactCondition(value: string | undefined) {
  return value === "Novo"
    || value === "Novo Reembalado"
    || value === "Excelente"
    || value === "Muito Bom"
    || value === "Bom"
    || value === "Outlet"
      ? value
      : undefined;
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const condition = first(params.condition);
  const sortValue = first(params.sort);
  const sort: CatalogSort = sortValue === "low" || sortValue === "high" ? sortValue : "relevance";

  const initialPage = await getCatalogPage({
    page: numberParam(first(params.page)),
    pageSize: numberParam(first(params.pageSize)) ?? 30,
    query: first(params.q),
    brand: first(params.brand),
    category: first(params.categoria) ?? first(params.category) ?? first(params.cat),
    storage: first(params.storage),
    section: sectionFromCondition(condition),
    condition: exactCondition(condition),
    minPrice: numberParam(first(params.minPrice)),
    maxPrice: numberParam(first(params.maxPrice)),
    sort,
  });

  return <CatalogPageClient initialPage={initialPage} />;
}

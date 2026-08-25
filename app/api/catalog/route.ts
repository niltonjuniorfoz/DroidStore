import { NextResponse } from "next/server";
import type { CatalogSection } from "../../../src/lib/catalog";
import { getCatalogPage, type CatalogSort } from "../../../src/lib/catalogPagination";

export const revalidate = 30;

function numberParam(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") === "Seminovos" ? "Seminovos" : "Novos";
  const sortValue = url.searchParams.get("sort");
  const sort: CatalogSort = sortValue === "low" || sortValue === "high" ? sortValue : "relevance";

  try {
    const result = await getCatalogPage({
      page: numberParam(url.searchParams.get("page")),
      pageSize: numberParam(url.searchParams.get("pageSize")),
      query: url.searchParams.get("q")?.slice(0, 100) || undefined,
      brand: url.searchParams.get("brand")?.slice(0, 80) || undefined,
      category: (
        url.searchParams.get("categoria")
        || url.searchParams.get("category")
        || url.searchParams.get("cat")
      )?.slice(0, 80) || undefined,
      storage: url.searchParams.get("storage")?.slice(0, 40) || undefined,
      section: section as CatalogSection,
      condition: url.searchParams.get("condition")?.slice(0, 40) || undefined,
      minPrice: numberParam(url.searchParams.get("minPrice")),
      maxPrice: numberParam(url.searchParams.get("maxPrice")),
      sort,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("catalog pagination failed", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o catálogo agora." },
      { status: 500 },
    );
  }
}

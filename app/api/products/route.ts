import { NextResponse } from "next/server";
import { getProducts } from "../../../src/lib/storefront";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 120);
  const take = Number.isFinite(requestedLimit) ? requestedLimit : 120;
  const excludeSlug = url.searchParams.get("exclude") || undefined;
  const query = url.searchParams.get("q")?.trim().slice(0, 80) || undefined;
  const featuredOnly = url.searchParams.get("featured") === "1";
  const products = await getProducts(featuredOnly, { take, excludeSlug, query });

  return NextResponse.json(products, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

import { NextResponse } from "next/server";
import { getProducts } from "../../../src/lib/storefront";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 120);
  const take = Number.isFinite(requestedLimit) ? requestedLimit : 120;
  const excludeSlug = url.searchParams.get("exclude") || undefined;
  const products = await getProducts(false, { take, excludeSlug });

  return NextResponse.json(products, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

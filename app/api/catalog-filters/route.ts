import { NextResponse } from "next/server";
import { getPublicCatalogFilters } from "../../../src/lib/storefront";

export async function GET() {
  return NextResponse.json(await getPublicCatalogFilters());
}

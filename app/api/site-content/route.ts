import { NextResponse } from "next/server";
import { getSiteContent } from "../../../src/lib/storefront";

export const revalidate = 60;

export async function GET() {
  const response = NextResponse.json(await getSiteContent());
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return response;
}

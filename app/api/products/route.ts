import { NextResponse } from "next/server";
import { getProducts } from "../../../src/lib/storefront";

export async function GET() {
  return NextResponse.json(await getProducts());
}

import { NextResponse } from "next/server";
import { getSiteContent } from "../../../src/lib/storefront";

export async function GET() {
  return NextResponse.json(await getSiteContent());
}

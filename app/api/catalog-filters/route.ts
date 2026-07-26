import { NextResponse } from "next/server";
import prisma from "../../../src/lib/prisma";

export async function GET() {
  const filters = await prisma.catalogFilter.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      options: {
        where: { active: true },
        orderBy: [{ position: "asc" }, { label: "asc" }],
        select: { id: true, label: true, slug: true },
      },
    },
  });
  return NextResponse.json(filters);
}

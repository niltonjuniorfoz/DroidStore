import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { audit } from "../../../../src/lib/audit";
import prisma from "../../../../src/lib/prisma";
import { slugify } from "../../../../src/lib/slug";

const supplierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  currency: z.string().trim().min(3).max(8).default("USD"),
  active: z.boolean().default(true),
  allowedDomains: z.array(z.string().trim().min(3).max(255)).min(1).max(30),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const suppliers = await prisma.supplier.findMany({
    include: { pricingRules: { orderBy: { brand: "asc" } }, categoryMappings: true, conditionMappings: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(suppliers);
}
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal altera fornecedores." }, { status: 403 });
  const body = supplierSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Fornecedor inválido." }, { status: 400 });
  const data = body.data;
  const supplier = data.id
    ? await prisma.supplier.update({ where: { id: data.id }, data: { name: data.name, currency: data.currency.toUpperCase(), active: data.active, allowedDomains: data.allowedDomains } })
    : await prisma.supplier.create({ data: { name: data.name, slug: slugify(data.name), currency: data.currency.toUpperCase(), active: data.active, allowedDomains: data.allowedDomains } });
  await audit(session, { action: data.id ? "supplier.update" : "supplier.create", entity: "Supplier", entityId: supplier.id, summary: `Fornecedor ${supplier.name} ${data.id ? "atualizado" : "criado"}` });
  return NextResponse.json(supplier, { status: data.id ? 200 : 201 });
}

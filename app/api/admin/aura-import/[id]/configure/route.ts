import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import { audit } from "../../../../../../src/lib/audit";
import { saveAuraConfiguration } from "../../../../../../src/lib/aura/jobService";

const conditions = ["NOVO", "NOVO_REEMBALADO", "EXCELENTE", "MUITO_BOM", "BOM", "OUTLET"] as const;
const roundingRules = ["CEIL_10", "NEAREST_10", "CEIL_50", "CEIL_100"] as const;
const catalogOptionId = z.string().trim().min(1).max(160);
const schema = z.object({
  exchangeRate: z.coerce.number().positive().max(100),
  roundingRule: z.enum(roundingRules),
  brandMappings: z.array(z.object({ sourceBrand: z.string().trim().min(1).max(120), optionId: catalogOptionId.optional(), createIfMissing: z.boolean().optional() })).max(500),
  categories: z.array(z.object({
    sourceGroup: z.string().trim().min(1).max(160),
    optionIds: z.array(catalogOptionId).max(1),
    createIfMissing: z.boolean().optional(),
    persist: z.boolean().optional(),
  }).refine((value) => value.optionIds.length === 1 || value.createIfMissing, "Selecione ou crie a categoria.")).max(500),
  conditions: z.array(z.object({ sourceCondition: z.string().max(100), condition: z.enum(conditions), persist: z.boolean().optional() })).max(100),
  markups: z.array(z.object({ brand: z.string().min(1).max(120), markupPercent: z.coerce.number().min(0).max(1000), persist: z.boolean().optional() })).max(500),
  existing: z.object({
    updateName: z.boolean().default(false),
    updateDescription: z.boolean().default(false),
    updateImages: z.boolean().default(false),
    replaceSpecifications: z.boolean().default(false),
    updateCategories: z.boolean().default(false),
  }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal configura preço e fornecedor." }, { status: 403 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Configuração inválida." }, { status: 400 });
  const { id } = await params;
  try {
    const job = await saveAuraConfiguration({ jobId: id, exchangeRate: body.data.exchangeRate, roundingRule: body.data.roundingRule, configuration: body.data });
    await audit(session, { action: "aura.import.configure", entity: "AuraImportJob", entityId: id, summary: `Cotação R$ ${body.data.exchangeRate.toFixed(4)} e ${body.data.markups.length} margem(ns) configuradas` });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível configurar a importação." }, { status: 400 });
  }
}

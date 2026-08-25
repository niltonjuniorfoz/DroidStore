import { z } from "zod";
import { slugify } from "../slug";
import { EMPTY_SOURCE_CONDITION, type AuraMessage, type NormalizedAuraProduct } from "./types";

const scalarSpecification = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const auraProductSchema = z.object({
  schemaVersion: z.number().int().min(4),
  sku: z.union([z.string(), z.number()]),
  name: z.string().trim().min(1).max(500),
  brand: z.string().trim().max(120).optional().default(""),
  sourceName: z.string().trim().max(120).optional().default(""),
  sourceDomain: z.string().trim().max(255).optional().default(""),
  sourceUrl: z.string().trim().max(2000).optional().default(""),
  sourceGroup: z.string().trim().max(160).optional().default(""),
  sourceSubgroup: z.string().trim().max(160).optional().default(""),
  category: z.string().trim().max(500).optional().default(""),
  categoryPath: z.array(z.string().trim().max(160)).max(20).optional().default([]),
  model: z.string().trim().max(200).optional().default(""),
  storage: z.string().trim().max(80).optional().default(""),
  color: z.string().trim().max(100).optional().default(""),
  condition: z.string().trim().max(100).optional().default(""),
  normalized: z.object({
    brand: z.string().trim().max(120).optional().default(""),
    model: z.string().trim().max(200).optional().default(""),
    storage: z.string().trim().max(80).optional().default(""),
    color: z.string().trim().max(100).optional().default(""),
    condition: z.string().trim().max(100).optional().default(""),
  }).passthrough().optional(),
  price: z.number().nonnegative().nullable().optional(),
  lastKnownPriceUsd: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().max(12).optional().default("USD"),
  availability: z.string().trim().max(80).optional().default(""),
  available: z.boolean().optional(),
  description: z.string().max(100_000).optional().default(""),
  images: z.array(z.string().trim().max(3000)).max(40).optional().default([]),
  specifications: z.record(z.string(), scalarSpecification).optional().default({}),
  familyKey: z.string().trim().max(500).optional().default(""),
  validation: z.object({
    status: z.enum(["ok", "warning", "error"]).optional().default("ok"),
    importReady: z.boolean().optional().default(true),
    warnings: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).max(100).optional().default([]),
    errors: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).max(100).optional().default([]),
  }).passthrough().optional(),
}).passthrough();

const auraExportSchema = z.object({
  version: z.number().int().min(4),
  generator: z.string().trim().max(200).optional().default("Aura Extrator"),
  exportedAt: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  products: z.array(z.unknown()).min(1).max(20_000),
}).passthrough();

const GENERIC_BRANDS = new Set(["SMARTPHONE", "TABLET", "NOTEBOOK", "PRODUTO", "SMARTWATCH"]);
const DISTINGUISHING_SPEC = /(tamanho|caixa|ram|vers[aã]o|rede|refer[eê]ncia|gera[cç][aã]o|processador|tipo)/i;

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

function messageText(value: string | Record<string, unknown>) {
  return typeof value === "string" ? value : text(value.message ?? value.code ?? value);
}

function pickBrand(normalized: string | undefined, brand: string, sourceBrand: unknown) {
  return [normalized, brand, text(sourceBrand)]
    .map((value) => value?.trim() ?? "")
    .find((value) => value && !GENERIC_BRANDS.has(value.toUpperCase())) ?? "";
}

function buildGroupKey(input: {
  brand: string;
  model: string;
  name: string;
  specifications: Array<{ label: string; value: string }>;
}) {
  const distinguishing = input.specifications
    .filter((item) => DISTINGUISHING_SPEC.test(item.label))
    .map((item) => `${slugify(item.label)}:${slugify(item.value)}`)
    .sort()
    .join("|");
  const model = input.model || input.name;
  return [slugify(input.brand), slugify(model), distinguishing].filter(Boolean).join("::");
}

export type ParsedAuraExport = {
  version: number;
  generator: string;
  exportedAt?: string;
  products: NormalizedAuraProduct[];
  rejected: Array<{ rowNumber: number; sku: string; name: string; messages: AuraMessage[]; rawData: unknown }>;
};

export function findDuplicateAuraSkus(products: Array<{ sku: string }>) {
  const counts = new Map<string, number>();
  products.forEach((product) => counts.set(product.sku, (counts.get(product.sku) ?? 0) + 1));
  return new Set([...counts].filter(([, count]) => count > 1).map(([sku]) => sku));
}

export function parseAuraExport(input: string | Buffer | unknown): ParsedAuraExport {
  let raw: unknown = input;
  if (Buffer.isBuffer(input)) {
    if (input.byteLength > 75 * 1024 * 1024) throw new Error("O catálogo Aura deve ter no máximo 75 MB.");
    raw = input.toString("utf8");
  }
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("O arquivo não contém um JSON válido.");
    }
  }

  const parsedExport = auraExportSchema.safeParse(raw);
  if (!parsedExport.success) {
    const issue = parsedExport.error.issues[0];
    throw new Error(`Estrutura Aura inválida em ${issue?.path.join(".") || "arquivo"}: ${issue?.message ?? "revise o JSON"}.`);
  }

  const products: NormalizedAuraProduct[] = [];
  const rejected: ParsedAuraExport["rejected"] = [];
  parsedExport.data.products.forEach((candidate, index) => {
    const result = auraProductSchema.safeParse(candidate);
    if (!result.success) {
      const rawProduct = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
      rejected.push({
        rowNumber: index + 1,
        sku: text(rawProduct.sku).trim(),
        name: text(rawProduct.name).trim() || "Produto inválido",
        messages: result.error.issues.map((issue) => ({
          code: "INVALID_STRUCTURE",
          message: `${issue.path.join(".") || "produto"}: ${issue.message}`,
          severity: "error" as const,
        })),
        rawData: candidate,
      });
      return;
    }

    const source = result.data;
    const rawData = source as unknown as Record<string, unknown>;
    const normalized = source.normalized;
    const sku = String(source.sku).trim();
    const brand = pickBrand(normalized?.brand, source.brand, rawData.sourceBrand);
    const model = normalized?.model?.trim() || source.model.trim();
    const storage = normalized?.storage?.trim() || source.storage.trim();
    const color = normalized?.color?.trim() || source.color.trim();
    const sourceCondition = normalized?.condition?.trim() || source.condition.trim() || EMPTY_SOURCE_CONDITION;
    const specifications = Object.entries(source.specifications)
      .map(([label, value], position) => ({ label: label.trim(), value: text(value).trim(), position }))
      .filter((item) => item.label && item.value);
    const validation = source.validation;
    const messages: AuraMessage[] = [
      ...(validation?.warnings ?? []).map((warning) => ({ code: "AURA_WARNING", message: messageText(warning), severity: "warning" as const })),
      ...(validation?.errors ?? []).map((error) => ({ code: "AURA_ERROR", message: messageText(error), severity: "error" as const })),
    ];
    if (!sku) messages.push({ code: "MISSING_SKU", message: "SKU ausente.", severity: "error" });
    if (!brand) messages.push({ code: "MISSING_BRAND", message: "Marca ausente ou genérica.", severity: "error" });
    if (source.currency.toUpperCase() !== "USD") messages.push({ code: "UNSUPPORTED_CURRENCY", message: `Moeda ${source.currency} não suportada nesta importação.`, severity: "error" });
    if (!source.price && !source.lastKnownPriceUsd) messages.push({ code: "MISSING_PRICE", message: "Produto sem preço atual e sem último preço conhecido.", severity: "warning" });

    const available = source.available ?? /^(instock|available|dispon[ií]vel)$/i.test(source.availability);
    const validationStatus = messages.some((item) => item.severity === "error")
      ? "error"
      : validation?.status === "warning" || validation?.importReady === false || messages.length
        ? "warning"
        : "ok";

    products.push({
      schemaVersion: source.schemaVersion,
      sku,
      name: source.name.trim(),
      brand,
      model,
      storage,
      color,
      sourceCondition,
      sourceName: source.sourceName,
      sourceDomain: source.sourceDomain.toLowerCase(),
      sourceUrl: source.sourceUrl,
      sourceGroup: source.sourceGroup || source.categoryPath[0] || "",
      sourceSubgroup: source.sourceSubgroup || source.categoryPath[1] || "",
      categoryPath: source.categoryPath,
      supplierPriceUsd: source.price ?? null,
      lastKnownPriceUsd: source.lastKnownPriceUsd ?? source.price ?? null,
      currency: source.currency.toUpperCase(),
      available,
      description: source.description.trim(),
      images: [...new Set(source.images.filter(Boolean))],
      specifications,
      groupKey: buildGroupKey({ brand, model, name: source.name, specifications }),
      validationStatus,
      importReady: validation?.importReady ?? true,
      messages,
      rawData,
    });
  });

  return {
    version: parsedExport.data.version,
    generator: parsedExport.data.generator,
    exportedAt: parsedExport.data.exportedAt,
    products,
    rejected,
  };
}

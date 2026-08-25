import ExcelJS from "exceljs";
import type { AuraImportItemStatus, AuraRoundingRule, Prisma } from "@prisma/client";
import prisma from "../prisma";
import { calculateAuraPrice } from "./pricing";
import { ensureAtacadoConnectSupplier } from "./jobService";
import { refreshAuraJobProgress } from "./processService";
import type { AuraMarkupSelection } from "./types";

const MAX_XLSX_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 20_000;

type SupplierSheetRow = {
  rowNumber: number;
  sku: string;
  name: string;
  brand: string;
  supplierPriceUsd: number | null;
};

export type SupplierColumnMapping = {
  sku: string;
  price: string;
  brand?: string;
  name?: string;
};

export function findMissingSupplierSkus<T extends { sku: string; sourceBrand?: string | null }>(input: {
  catalogItems: T[];
  fileSkus: Iterable<string>;
  scopeBrands: string[];
}) {
  const present = new Set(input.fileSkus);
  const scope = new Set(input.scopeBrands.map(normalize));
  return input.catalogItems.filter((item) => scope.has(normalize(item.sourceBrand ?? "")) && !present.has(item.sku));
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function object(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value && typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return cell.text.trim();
}

function parseUsd(value: string) {
  const cleaned = value.replace(/US\$|USD|U\$/gi, "").replace(/\s/g, "");
  if (!cleaned) return null;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  let normalizedValue = cleaned;
  if (comma >= 0 && dot >= 0) normalizedValue = comma > dot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  else if (comma >= 0) normalizedValue = cleaned.replace(/\./g, "").replace(",", ".");
  const number = Number(normalizedValue);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

function detectColumn(headers: string[], aliases: string[]) {
  return headers.find((header) => aliases.includes(normalize(header)));
}

export async function parseSupplierWorkbook(buffer: Buffer, manual?: Partial<SupplierColumnMapping>) {
  if (buffer.byteLength > MAX_XLSX_BYTES) throw new Error("A planilha do fornecedor deve ter no máximo 15 MB.");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new Error("Não foi possível ler a planilha XLSX do fornecedor.");
  }
  const sheet = workbook.worksheets.find((candidate) => candidate.actualRowCount > 1);
  if (!sheet) throw new Error("A planilha não possui linhas de produtos.");
  const headerCells = new Map<string, number>();
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, column) => {
    const label = cellText(cell);
    if (label) {
      headers.push(label);
      headerCells.set(normalize(label), column);
    }
  });
  const mapping: SupplierColumnMapping = {
    sku: manual?.sku || detectColumn(headers, ["CODIGO", "SKU", "COD", "COD. PRODUTO", "CODIGO PRODUTO"]) || "",
    price: manual?.price || detectColumn(headers, ["PRECO U$", "PRECO US$", "PRECO USD", "PRECO", "VALOR U$", "VALOR USD"]) || "",
    brand: manual?.brand || detectColumn(headers, ["MARCA", "BRAND"]),
    name: manual?.name || detectColumn(headers, ["PRODUTO", "NOME", "DESCRICAO", "DESCRICAO PRODUTO"]),
  };
  if (!mapping.sku || !mapping.price) {
    const error = new Error("Não foi possível identificar as colunas de SKU e preço USD. Faça o mapeamento manual.") as Error & { headers?: string[] };
    error.headers = headers;
    throw error;
  }
  const skuColumn = headerCells.get(normalize(mapping.sku));
  const priceColumn = headerCells.get(normalize(mapping.price));
  const brandColumn = mapping.brand ? headerCells.get(normalize(mapping.brand)) : undefined;
  const nameColumn = mapping.name ? headerCells.get(normalize(mapping.name)) : undefined;
  if (!skuColumn || !priceColumn) throw new Error("As colunas mapeadas não existem na planilha.");
  const rows: SupplierSheetRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const sku = cellText(row.getCell(skuColumn));
    if (!sku) continue;
    rows.push({
      rowNumber,
      sku,
      supplierPriceUsd: parseUsd(cellText(row.getCell(priceColumn))),
      brand: brandColumn ? cellText(row.getCell(brandColumn)) : "",
      name: nameColumn ? cellText(row.getCell(nameColumn)) : sku,
    });
  }
  if (!rows.length) throw new Error("Nenhum SKU foi encontrado na planilha.");
  if (rows.length > MAX_ROWS) throw new Error(`A planilha ultrapassa ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`);
  return { rows, headers, mapping };
}

export async function createSupplierSyncJob(input: {
  buffer: Buffer;
  fileName: string;
  mapping?: Partial<SupplierColumnMapping>;
  actor?: { id?: string; name?: string | null; email?: string | null };
}) {
  const parsed = await parseSupplierWorkbook(input.buffer, input.mapping);
  const supplier = await ensureAtacadoConnectSupplier();
  const skuCounts = new Map<string, number>();
  parsed.rows.forEach((row) => skuCounts.set(row.sku, (skuCounts.get(row.sku) ?? 0) + 1));
  const catalogItems = await prisma.supplierCatalogItem.findMany({
    where: { supplierId: supplier.id, sku: { in: [...skuCounts.keys()] } },
    include: { variant: { include: { product: { select: { id: true, name: true, brand: true } } } } },
  });
  const bySku = new Map(catalogItems.map((item) => [item.sku, item]));
  const inferredBrands = new Set<string>();
  let unknown = 0;
  let errors = 0;
  const job = await prisma.auraImportJob.create({
    data: {
      supplierId: supplier.id,
      kind: "SUPPLIER_XLSX",
      status: "PREVIEW",
      fileName: input.fileName.slice(0, 255),
      totalItems: parsed.rows.length,
      summary: json({ originalRows: parsed.rows.length, headers: parsed.headers, columnMapping: parsed.mapping }),
      configuration: json({ columnMapping: parsed.mapping, scopeBrands: [] }),
      createdById: input.actor?.id,
      createdByName: input.actor?.name ?? input.actor?.email ?? "Administrador",
    },
  });
  const records: Prisma.AuraImportItemCreateManyInput[] = parsed.rows.map((row, index) => {
    const catalog = bySku.get(row.sku);
    const brand = row.brand || catalog?.sourceBrand || catalog?.variant.product.brand || "";
    if (brand) inferredBrands.add(brand);
    const duplicate = (skuCounts.get(row.sku) ?? 0) > 1;
    const noPrice = row.supplierPriceUsd === null;
    if (!catalog) unknown++;
    if (duplicate) errors++;
    const action = duplicate ? "ERROR" : !catalog || noPrice ? "REVIEW" : "UPDATE";
    const status = duplicate ? "ERROR" : !catalog || noPrice ? "REVIEW" : "PENDING";
    const rowMessages = [
      ...(duplicate ? [{ code: "DUPLICATE_SKU", message: "SKU repetido na planilha.", severity: "error" }] : []),
      ...(!catalog ? [{ code: "UNKNOWN_SKU", message: "SKU novo não cadastrado pelo Aura; nenhum produto será criado.", severity: "warning" }] : []),
      ...(noPrice ? [{ code: "MISSING_PRICE", message: "Preço USD ausente ou inválido.", severity: "warning" }] : []),
    ];
    return {
      jobId: job.id,
      rowNumber: index + 1,
      sku: row.sku,
      name: row.name || catalog?.variant.product.name || row.sku,
      brand: brand || null,
      sourceGroup: catalog?.sourceGroup,
      sourceSubgroup: catalog?.sourceSubgroup,
      groupKey: null,
      action,
      status,
      quality: duplicate ? "error" : action === "REVIEW" ? "warning" : "ok",
      messages: json(rowMessages),
      sourceData: json({ ...row, brand, available: true, syncMissing: false }),
      computedData: json({ existingVariantId: catalog?.variantId, existingProductId: catalog?.variant.productId }),
    };
  });
  for (let offset = 0; offset < records.length; offset += 500) {
    await prisma.auraImportItem.createMany({ data: records.slice(offset, offset + 500) });
  }
  const summary = {
    originalRows: parsed.rows.length,
    knownSkus: parsed.rows.length - unknown,
    unknownSkus: unknown,
    errors,
    inferredBrands: [...inferredBrands].sort((a, b) => a.localeCompare(b, "pt-BR")),
    headers: parsed.headers,
    columnMapping: parsed.mapping,
  };
  await prisma.auraImportJob.update({ where: { id: job.id }, data: { summary: json(summary), reviewItems: unknown, errorItems: errors } });
  return { job: { ...job, summary }, summary, supplier };
}

export async function configureSupplierSync(input: {
  jobId: string;
  exchangeRate: number;
  roundingRule: AuraRoundingRule;
  scopeBrands: string[];
  markups: AuraMarkupSelection[];
}) {
  const job = await prisma.auraImportJob.findUnique({ where: { id: input.jobId } });
  if (!job || job.kind !== "SUPPLIER_XLSX") throw new Error("Sincronização do fornecedor não encontrada.");
  if (!input.scopeBrands.length) throw new Error("Confirme pelo menos uma marca no escopo desta lista.");
  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0) throw new Error("Cotação USD inválida.");
  const summary = object(job.summary);
  const originalRows = Number(summary.originalRows ?? job.totalItems);
  await prisma.auraImportItem.deleteMany({ where: { jobId: job.id, rowNumber: { gt: originalRows } } });
  const fileItems = await prisma.auraImportItem.findMany({ where: { jobId: job.id, rowNumber: { lte: originalRows } }, orderBy: { rowNumber: "asc" } });
  const fileSkus = new Set(fileItems.map((item) => item.sku));
  const scopedCatalog = await prisma.supplierCatalogItem.findMany({
    where: {
      supplierId: job.supplierId,
      OR: input.scopeBrands.map((brand) => ({ sourceBrand: { equals: brand, mode: "insensitive" } })),
    },
    include: { variant: { include: { product: { select: { id: true, name: true, brand: true } } } } },
  });
  const catalogBySku = new Map(scopedCatalog.map((item) => [item.sku, item]));
  const allKnown = await prisma.supplierCatalogItem.findMany({
    where: { supplierId: job.supplierId, sku: { in: [...fileSkus] } },
    include: { variant: { include: { product: { select: { id: true, name: true, brand: true } } } } },
  });
  allKnown.forEach((item) => catalogBySku.set(item.sku, item));
  const markupByBrand = new Map(input.markups.map((rule) => [normalize(rule.brand), rule.markupPercent]));
  const normalizedScope = new Set(input.scopeBrands.map(normalize));
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (const item of fileItems) {
    const source = object(item.sourceData);
    const catalog = catalogBySku.get(item.sku);
    if (!catalog) continue;
    const brand = String(source.brand || catalog.sourceBrand || catalog.variant.product.brand);
    if (!normalizedScope.has(normalize(brand))) {
      updates.push(prisma.auraImportItem.update({ where: { id: item.id }, data: { action: "UNCHANGED", status: "IGNORED", brand } }));
      continue;
    }
    const priceUsd = Number(source.supplierPriceUsd);
    const markup = markupByBrand.get(normalize(brand));
    if (!priceUsd || markup === undefined) {
      updates.push(prisma.auraImportItem.update({ where: { id: item.id }, data: { action: "REVIEW", status: "REVIEW" } }));
      continue;
    }
    const price = calculateAuraPrice({ supplierPriceUsd: priceUsd, exchangeRate: input.exchangeRate, markupPercent: markup, roundingRule: input.roundingRule });
    const unchanged = catalog.available && Number(catalog.supplierPriceUsd) === priceUsd && Number(catalog.variant.price) === price.salePriceBrl;
    updates.push(prisma.auraImportItem.update({
      where: { id: item.id },
      data: {
        action: unchanged ? "UNCHANGED" : "UPDATE",
        status: "PENDING",
        brand,
        computedData: json({
          existingVariantId: catalog.variantId,
          existingProductId: catalog.variant.productId,
          exchangeRate: input.exchangeRate,
          markupPercent: markup,
          salePriceBrl: price.salePriceBrl,
          convertedCostBrl: price.convertedCostBrl,
          priceBasisUsd: priceUsd,
        }),
      },
    }));
  }
  for (let offset = 0; offset < updates.length; offset += 300) await prisma.$transaction(updates.slice(offset, offset + 300));
  const missing = findMissingSupplierSkus({ catalogItems: scopedCatalog, fileSkus, scopeBrands: input.scopeBrands });
  if (missing.length) {
    await prisma.auraImportItem.createMany({
      data: missing.map((catalog, index) => ({
        jobId: job.id,
        rowNumber: originalRows + index + 1,
        sku: catalog.sku,
        name: catalog.variant.product.name,
        brand: catalog.sourceBrand || catalog.variant.product.brand,
        sourceGroup: catalog.sourceGroup,
        sourceSubgroup: catalog.sourceSubgroup,
        action: catalog.available ? "UPDATE" : "UNCHANGED",
        status: "PENDING",
        quality: "ok",
        messages: json([]),
        sourceData: json({ sku: catalog.sku, brand: catalog.sourceBrand || catalog.variant.product.brand, available: false, syncMissing: true }),
        computedData: json({
          existingVariantId: catalog.variantId,
          existingProductId: catalog.variant.productId,
          preserveExistingPrice: true,
          salePriceBrl: Number(catalog.variant.price),
        }),
      })),
    });
  }
  const operations = input.markups.map((rule) => prisma.supplierPricingRule.upsert({
    where: { supplierId_brand: { supplierId: job.supplierId, brand: rule.brand } },
    update: { markupPercent: rule.markupPercent, active: true },
    create: { supplierId: job.supplierId, brand: rule.brand, markupPercent: rule.markupPercent },
  }));
  if (operations.length) await prisma.$transaction(operations);
  const configuration = { ...object(job.configuration), scopeBrands: input.scopeBrands, markups: input.markups };
  await prisma.supplier.update({
    where: { id: job.supplierId },
    data: { xlsxColumnMapping: object(job.configuration).columnMapping ? json(object(job.configuration).columnMapping) : undefined },
  });
  const [actionCounts, statusCounts] = await Promise.all([
    prisma.auraImportItem.groupBy({ by: ["action"], where: { jobId: job.id }, _count: { _all: true } }),
    prisma.auraImportItem.groupBy({ by: ["status"], where: { jobId: job.id }, _count: { _all: true } }),
  ]);
  const actions = Object.fromEntries(actionCounts.map((entry) => [entry.action, entry._count._all]));
  const statuses = Object.fromEntries(statusCounts.map((entry) => [entry.status, entry._count._all]));
  return prisma.auraImportJob.update({
    where: { id: job.id },
    data: {
      exchangeRate: input.exchangeRate,
      roundingRule: input.roundingRule,
      configuration: json(configuration),
      totalItems: originalRows + missing.length,
      preparedItems: originalRows + missing.length,
      status: "READY",
      reviewItems: Number(statuses.REVIEW ?? 0),
      errorItems: Number(statuses.ERROR ?? 0),
      summary: json({ ...summary, scopeBrands: input.scopeBrands, missingInScope: missing.length, actions }),
    },
  });
}

export async function processSupplierSyncBatch(jobId: string, batchSize = 20) {
  const job = await prisma.auraImportJob.findUnique({ where: { id: jobId } });
  if (!job || job.kind !== "SUPPLIER_XLSX") throw new Error("Sincronização não encontrada.");
  if (job.status !== "PROCESSING") throw new Error("A sincronização não está em processamento.");
  const items = await prisma.auraImportItem.findMany({
    where: { jobId, status: "PENDING", action: { in: ["UPDATE", "UNCHANGED"] } },
    orderBy: { rowNumber: "asc" },
    take: Math.max(1, Math.min(batchSize, 50)),
  });
  const catalogs = await prisma.supplierCatalogItem.findMany({
    where: { supplierId: job.supplierId, sku: { in: items.map((item) => item.sku) } },
    include: { variant: { include: { product: true } } },
  });
  const catalogBySku = new Map(catalogs.map((catalog) => [catalog.sku, catalog]));
  const events: Array<{ action: "supplier.price.update" | "supplier.availability.update"; entityId: string; sku: string; name: string }> = [];
  for (const item of items) {
    try {
      const source = object(item.sourceData);
      const computed = object(item.computedData);
      const catalog = catalogBySku.get(item.sku);
      if (!catalog) throw new Error("SKU deixou de estar vinculado ao fornecedor.");
      const available = source.available === true;
      const newPrice = available && computed.salePriceBrl ? Number(computed.salePriceBrl) : Number(catalog.variant.price);
      const before = {
        kind: "UPDATED",
        variant: { id: catalog.variantId, price: Number(catalog.variant.price).toFixed(2), dropshipAvailable: catalog.variant.dropshipAvailable },
        product: { id: catalog.variant.productId, name: catalog.variant.product.name, description: catalog.variant.product.description, imageUrl: catalog.variant.product.imageUrl, updatedAt: catalog.variant.product.updatedAt, images: [], specifications: [], filterOptionIds: [] },
        supplierItem: catalog,
      };
      const after = { kind: "UPDATED", variant: { id: catalog.variantId, price: newPrice.toFixed(2), dropshipAvailable: available }, product: { id: catalog.variant.productId, changed: {} } };
      await prisma.$transaction([
        prisma.variant.update({ where: { id: catalog.variantId }, data: { price: newPrice, dropshipAvailable: available } }),
        prisma.supplierCatalogItem.update({
          where: { id: catalog.id },
          data: {
            ...(available && source.supplierPriceUsd ? { supplierPriceUsd: Number(source.supplierPriceUsd), lastKnownPriceUsd: Number(source.supplierPriceUsd) } : {}),
            ...(computed.exchangeRate ? { exchangeRate: Number(computed.exchangeRate) } : {}),
            ...(computed.markupPercent !== undefined ? { markupPercent: Number(computed.markupPercent) } : {}),
            salePriceBrl: newPrice,
            available,
            lastSeenAt: new Date(),
            lastImportedAt: new Date(),
          },
        }),
        prisma.auraImportItem.update({
          where: { id: item.id },
          data: { status: item.action === "UNCHANGED" ? "UNCHANGED" : "UPDATED", variantId: catalog.variantId, productId: catalog.variant.productId, beforeSnapshot: json(before), afterSnapshot: json(after), processedAt: new Date() },
        }),
      ]);
      events.push({
        action: available ? "supplier.price.update" : "supplier.availability.update",
        entityId: catalog.variant.productId,
        sku: item.sku,
        name: item.name,
      });
    } catch (error) {
      await prisma.auraImportItem.update({
        where: { id: item.id },
        data: { action: "ERROR", status: "ERROR", messages: json([{ code: "SYNC_ERROR", message: error instanceof Error ? error.message : "Falha na sincronização.", severity: "error" }]), processedAt: new Date() },
      });
    }
  }
  const updatedJob = await refreshAuraJobProgress(jobId);
  return { job: updatedJob, processed: items.length, complete: updatedJob.status === "COMPLETED", events };
}

export async function supplierSyncStatusCounts(jobId: string) {
  const grouped = await prisma.auraImportItem.groupBy({ by: ["status"], where: { jobId }, _count: { _all: true } });
  return Object.fromEntries(grouped.map((group) => [group.status, group._count._all])) as Partial<Record<AuraImportItemStatus, number>>;
}

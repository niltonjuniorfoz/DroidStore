import type {
  AuraImportAction,
  AuraImportItem,
  AuraImportItemStatus,
  AuraRoundingRule,
  Condition,
  Prisma,
} from "@prisma/client";
import prisma from "../prisma";
import type { ParsedAuraExport } from "./schema";
import { calculateAuraPrice, chooseAuraPriceBasis } from "./pricing";
import { slugify } from "../slug";
import {
  auraCategoryKey,
  findCatalogFilter,
  findCatalogOption,
  normalizeCatalogValue,
  resolveAuraFilterOptionIds,
} from "./catalogMapping";
import {
  DEFAULT_EXISTING_POLICIES,
  type AuraBrandSelection,
  type AuraCategorySelection,
  type AuraComputedItem,
  type AuraJobConfiguration,
  type AuraMessage,
  type NormalizedAuraProduct,
} from "./types";

export const ATACADO_CONNECT_SLUG = "atacado-connect";
export const ATACADO_CONNECT_DOMAINS = ["atacadoconnect.com", "cdn.atacadoconnect.com"];

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readMessages(value: Prisma.JsonValue): AuraMessage[] {
  return Array.isArray(value) ? value.filter((item): item is AuraMessage => Boolean(item && typeof item === "object" && "code" in item)) : [];
}

function decimal(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

export async function ensureAtacadoConnectSupplier() {
  return prisma.supplier.upsert({
    where: { slug: ATACADO_CONNECT_SLUG },
    update: {},
    create: {
      name: "Atacado Connect",
      slug: ATACADO_CONNECT_SLUG,
      currency: "USD",
      allowedDomains: ATACADO_CONNECT_DOMAINS,
    },
  });
}

export async function createAuraImportJob(input: {
  parsed: ParsedAuraExport;
  fileName: string;
  sourceFileUrl?: string;
  actor?: { id?: string; name?: string | null; email?: string | null };
}) {
  const supplier = await ensureAtacadoConnectSupplier();
  const skuCounts = new Map<string, number>();
  input.parsed.products.forEach((product) => skuCounts.set(product.sku, (skuCounts.get(product.sku) ?? 0) + 1));
  const skus = [...skuCounts.keys()].filter(Boolean);
  const existingVariants = await prisma.variant.findMany({
    where: { sku: { in: skus } },
    select: {
      id: true,
      sku: true,
      productId: true,
      supplierItems: { select: { supplierId: true } },
    },
  });
  const existingBySku = new Map(existingVariants.map((variant) => [variant.sku ?? "", variant]));
  const records: Prisma.AuraImportItemCreateManyInput[] = [];
  let ready = 0;
  let review = 0;
  let errors = 0;
  let newSkus = 0;
  let existingSkus = 0;
  let available = 0;
  let unavailable = 0;
  let photoCount = 0;
  const brands = new Set<string>();
  const categories = new Map<string, { sourceGroup: string; sourceSubgroups: Set<string>; count: number }>();
  const conditions = new Set<string>();

  input.parsed.products.forEach((product, index) => {
    const messages = [...product.messages];
    const existing = existingBySku.get(product.sku);
    if ((skuCounts.get(product.sku) ?? 0) > 1) {
      messages.push({ code: "DUPLICATE_SKU", message: "SKU repetido no mesmo arquivo Aura.", severity: "error" });
    }
    if (product.sourceDomain && !ATACADO_CONNECT_DOMAINS.some((domain) => product.sourceDomain === domain || product.sourceDomain.endsWith(`.${domain}`))) {
      messages.push({ code: "UNTRUSTED_SOURCE", message: `Origem não autorizada: ${product.sourceDomain}.`, severity: "error" });
    }
    const linked = existing?.supplierItems.some((item) => item.supplierId === supplier.id) ?? false;
    if (existing && !linked) {
      messages.push({
        code: existing.supplierItems.length ? "SKU_OTHER_SUPPLIER" : "SKU_UNLINKED",
        message: existing.supplierItems.length
          ? "SKU já existe e está vinculado a outro fornecedor. Exige aprovação manual."
          : "SKU já existe, mas ainda não está vinculado ao fornecedor. Exige aprovação manual.",
        severity: "warning",
      });
    }
    const hardError = product.validationStatus === "error" || messages.some((message) => message.severity === "error");
    const needsReview = !hardError && (
      product.validationStatus === "warning"
      || !product.importReady
      || messages.some((message) => message.severity === "warning")
      || Boolean(existing && !linked)
    );
    const action: AuraImportAction = hardError ? "ERROR" : needsReview ? "REVIEW" : existing ? "UPDATE" : "CREATE";
    const status: AuraImportItemStatus = action === "ERROR" ? "ERROR" : action === "REVIEW" ? "REVIEW" : "PENDING";
    if (action === "ERROR") errors++;
    else if (action === "REVIEW") review++;
    else ready++;
    if (existing) existingSkus++; else newSkus++;
    if (product.available) available++; else unavailable++;
    photoCount += product.images.length;
    if (product.brand) brands.add(product.brand);
    const originKey = auraCategoryKey(product.sourceGroup);
    const origin = categories.get(originKey);
    categories.set(originKey, {
      sourceGroup: product.sourceGroup,
      sourceSubgroups: new Set([...(origin?.sourceSubgroups ?? []), product.sourceSubgroup].filter(Boolean)),
      count: (origin?.count ?? 0) + 1,
    });
    conditions.add(product.sourceCondition);
    records.push({
      jobId: "",
      rowNumber: index + 1,
      sku: product.sku || `INVALID-${index + 1}`,
      name: product.name,
      brand: product.brand || null,
      sourceGroup: product.sourceGroup || null,
      sourceSubgroup: product.sourceSubgroup || null,
      groupKey: product.groupKey || null,
      action,
      status,
      quality: product.validationStatus,
      messages: json(messages),
      sourceData: json(product),
      computedData: json({
        existingVariantId: existing?.id,
        existingProductId: existing?.productId,
        linkedToSupplier: linked,
        requiresSupplierLink: Boolean(existing && !linked),
      }),
    });
  });

  input.parsed.rejected.forEach((item, index) => {
    errors++;
    records.push({
      jobId: "",
      rowNumber: input.parsed.products.length + index + 1,
      sku: item.sku || `INVALID-${input.parsed.products.length + index + 1}`,
      name: item.name,
      action: "ERROR",
      status: "ERROR",
      quality: "error",
      messages: json(item.messages),
      sourceData: json({ rawData: item.rawData, messages: item.messages, validationStatus: "error", importReady: false }),
      computedData: json({}),
    });
  });

  const catalogFilters = await prisma.catalogFilter.findMany({
    where: { active: true },
    include: { options: { where: { active: true }, orderBy: { position: "asc" } } },
  });
  const brandFilter = findCatalogFilter(catalogFilters, "Marca");
  const newBrands = [...brands].filter((brand) => !findCatalogOption(brandFilter, brand));
  const summary = {
    totalJson: records.length,
    ready,
    review,
    errors,
    newSkus,
    existingSkus,
    available,
    unavailable,
    photoCount,
    categoryCount: categories.size,
    brandCount: brands.size,
    brands: [...brands].sort((a, b) => a.localeCompare(b, "pt-BR")),
    newBrands: newBrands.sort((a, b) => a.localeCompare(b, "pt-BR")),
    categories: [...categories.values()]
      .map((origin) => ({ ...origin, sourceSubgroups: [...origin.sourceSubgroups].sort((a, b) => a.localeCompare(b, "pt-BR")) }))
      .sort((a, b) => a.sourceGroup.localeCompare(b.sourceGroup, "pt-BR")),
    conditions: [...conditions].sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
  const job = await prisma.auraImportJob.create({
    data: {
      supplierId: supplier.id,
      kind: "AURA_JSON",
      status: "PREVIEW",
      fileName: input.fileName.slice(0, 255),
      sourceFileUrl: input.sourceFileUrl,
      generator: input.parsed.generator,
      schemaVersion: input.parsed.version,
      summary: json(summary),
      totalItems: records.length,
      reviewItems: review,
      errorItems: errors,
      createdById: input.actor?.id,
      createdByName: input.actor?.name ?? input.actor?.email ?? "Administrador",
    },
  });
  for (let offset = 0; offset < records.length; offset += 500) {
    await prisma.auraImportItem.createMany({
      data: records.slice(offset, offset + 500).map((record) => ({ ...record, jobId: job.id })),
    });
  }
  return { job, summary, supplier };
}

export async function saveAuraConfiguration(input: {
  jobId: string;
  exchangeRate: number;
  roundingRule: AuraRoundingRule;
  configuration: AuraJobConfiguration;
}) {
  const job = await prisma.auraImportJob.findUnique({ where: { id: input.jobId } });
  if (!job) throw new Error("Importação não encontrada.");
  if (job.processedItems > 0 || ["PROCESSING", "COMPLETED", "CANCELLED", "ROLLED_BACK"].includes(job.status)) {
    throw new Error("Esta importação já começou e não pode mais ser reconfigurada.");
  }
  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0 || input.exchangeRate > 100) throw new Error("Cotação USD inválida.");

  const catalogFilters = await prisma.catalogFilter.findMany({
    where: { active: true },
    include: { options: { where: { active: true }, orderBy: { position: "asc" } } },
  });
  const brandFilter = findCatalogFilter(catalogFilters, "Marca");
  const categoryFilter = findCatalogFilter(catalogFilters, "Categoria");
  if (!brandFilter) throw new Error("Crie ou ative o filtro Marca antes de configurar a importação.");
  if (!categoryFilter) throw new Error("Crie ou ative o filtro Categoria antes de configurar a importação.");

  const categoryOptionIds = new Set(categoryFilter.options.map((option) => option.id));
  const sourceGroupKeys = input.configuration.categories.map((mapping) => auraCategoryKey(mapping.sourceGroup));
  if (new Set(sourceGroupKeys).size !== sourceGroupKeys.length) throw new Error("Existem grupos de origem duplicados no mapeamento.");
  for (const mapping of input.configuration.categories) {
    if (!mapping.sourceGroup.trim()) throw new Error("Todo mapeamento precisa informar o grupo de origem.");
    if (mapping.optionIds.length > 1 || (mapping.optionIds.length === 1 && !categoryOptionIds.has(mapping.optionIds[0]))
      || (mapping.optionIds.length === 0 && !mapping.createIfMissing)) {
      throw new Error(`Escolha uma única opção do filtro Categoria para ${mapping.sourceGroup}.`);
    }
  }
  for (const markup of input.configuration.markups) {
    if (!markup.brand.trim() || !Number.isFinite(markup.markupPercent) || markup.markupPercent < 0 || markup.markupPercent > 1000) {
      throw new Error(`Margem inválida para ${markup.brand || "marca"}.`);
    }
  }
  const savedCategoryMappings = await prisma.supplierCategoryMapping.findMany({
    where: { supplierId: job.supplierId, sourceSubgroup: "" },
    select: { id: true, sourceGroup: true },
  });

  return prisma.$transaction(async (tx) => {
    const resolvedBrandMappings: AuraBrandSelection[] = [];
    for (const mapping of input.configuration.brandMappings) {
      const sourceBrand = mapping.sourceBrand.trim();
      let option = mapping.optionId
        ? brandFilter.options.find((candidate) => candidate.id === mapping.optionId)
        : findCatalogOption(brandFilter, sourceBrand);
      if (mapping.optionId && !option) throw new Error(`A opção de marca selecionada para ${sourceBrand} não existe mais.`);
      if (!option && mapping.createIfMissing) {
        const label = normalizeCatalogValue(sourceBrand);
        option = await tx.catalogFilterOption.upsert({
          where: { filterId_slug: { filterId: brandFilter.id, slug: slugify(label) } },
          update: { label, active: true },
          create: { filterId: brandFilter.id, label, slug: slugify(label), active: true, position: brandFilter.options.length + resolvedBrandMappings.length },
        });
      }
      resolvedBrandMappings.push({ sourceBrand, optionId: option?.id, createIfMissing: mapping.createIfMissing });
    }

    const resolvedCategoryMappings: AuraCategorySelection[] = [];
    for (const mapping of input.configuration.categories) {
      let option = mapping.optionIds[0]
        ? categoryFilter.options.find((candidate) => candidate.id === mapping.optionIds[0])
        : findCatalogOption(categoryFilter, mapping.sourceGroup);
      if (!option && mapping.createIfMissing) {
        const label = mapping.sourceGroup.trim().replace(/\s+/g, " ");
        option = await tx.catalogFilterOption.upsert({
          where: { filterId_slug: { filterId: categoryFilter.id, slug: slugify(label) } },
          update: { label, active: true },
          create: {
            filterId: categoryFilter.id,
            label,
            slug: slugify(label),
            active: true,
            position: categoryFilter.options.length + resolvedCategoryMappings.length,
          },
        });
      }
      if (!option) throw new Error(`Não foi possível criar ou localizar a categoria ${mapping.sourceGroup}.`);
      resolvedCategoryMappings.push({ ...mapping, optionIds: [option.id], createIfMissing: false, persist: true });
    }

    for (const rule of input.configuration.markups.filter((entry) => entry.persist !== false)) {
      await tx.supplierPricingRule.upsert({
        where: { supplierId_brand: { supplierId: job.supplierId, brand: rule.brand.trim() } },
        update: { markupPercent: rule.markupPercent, active: true },
        create: { supplierId: job.supplierId, brand: rule.brand.trim(), markupPercent: rule.markupPercent },
      });
    }
    for (const mapping of resolvedCategoryMappings) {
      const saved = savedCategoryMappings.find((candidate) => (
        auraCategoryKey(candidate.sourceGroup) === auraCategoryKey(mapping.sourceGroup)
      ));
      if (saved) {
        await tx.supplierCategoryMapping.update({ where: { id: saved.id }, data: { optionIds: json(mapping.optionIds) } });
      } else {
        await tx.supplierCategoryMapping.create({
          data: { supplierId: job.supplierId, sourceGroup: mapping.sourceGroup.trim(), sourceSubgroup: "", optionIds: json(mapping.optionIds) },
        });
      }
    }
    for (const mapping of input.configuration.conditions.filter((entry) => entry.persist !== false)) {
      await tx.supplierConditionMapping.upsert({
        where: { supplierId_sourceCondition: { supplierId: job.supplierId, sourceCondition: mapping.sourceCondition } },
        update: { condition: mapping.condition },
        create: { supplierId: job.supplierId, sourceCondition: mapping.sourceCondition, condition: mapping.condition },
      });
    }

    const configuration: AuraJobConfiguration = {
      ...input.configuration,
      brandMappings: resolvedBrandMappings,
      categories: resolvedCategoryMappings,
      existing: input.configuration.existing ?? DEFAULT_EXISTING_POLICIES,
      managedFilterIds: [brandFilter.id, categoryFilter.id],
    };
    await tx.auraImportItem.updateMany({
      where: { jobId: job.id, processedAt: null },
      data: { computedData: json({}) },
    });
    return tx.auraImportJob.update({
      where: { id: job.id },
      data: {
        exchangeRate: input.exchangeRate,
        roundingRule: input.roundingRule,
        configuration: json(configuration),
        preparedItems: 0,
        processedItems: 0,
        createdItems: 0,
        updatedItems: 0,
        unchangedItems: 0,
        reviewItems: 0,
        errorItems: 0,
        status: "PREVIEW",
        errorMessage: null,
      },
    });
  });
}

type ExistingVariant = Awaited<ReturnType<typeof loadExistingVariants>>[number];

async function loadExistingVariants(skus: string[]) {
  return prisma.variant.findMany({
    where: { sku: { in: skus } },
    include: {
      product: { select: { id: true, name: true, description: true, brand: true, imageUrl: true, updatedAt: true } },
      supplierItems: true,
    },
  });
}

function computeItem(input: {
  item: AuraImportItem;
  source: NormalizedAuraProduct;
  existing?: ExistingVariant;
  supplierId: string;
  exchangeRate: number;
  roundingRule: AuraRoundingRule;
  configuration: AuraJobConfiguration;
}) {
  const messages = readMessages(input.item.messages).filter((message) => ![
    "MISSING_CATEGORY_MAPPING",
    "MISSING_BRAND_MAPPING",
    "MISSING_CONDITION_MAPPING",
    "MISSING_MARKUP",
    "MISSING_PRICE",
  ].includes(message.code));
  const approved = Boolean(input.item.reviewedById);
  const resolvedFilters = resolveAuraFilterOptionIds({
    sourceBrand: input.source.brand,
    sourceGroup: input.source.sourceGroup,
    brandMappings: input.configuration.brandMappings ?? [],
    categoryMappings: input.configuration.categories,
  });
  const condition = input.configuration.conditions.find((mapping) => normalizeCatalogValue(mapping.sourceCondition) === normalizeCatalogValue(input.source.sourceCondition));
  const markup = input.configuration.markups.find((rule) => normalizeCatalogValue(rule.brand) === normalizeCatalogValue(input.source.brand));
  const sameSupplierItem = input.existing?.supplierItems.find((supplierItem) => supplierItem.supplierId === input.supplierId);
  const supplierConflict = Boolean(input.existing && !sameSupplierItem);
  const basis = chooseAuraPriceBasis({
    available: input.source.available,
    supplierPriceUsd: input.source.supplierPriceUsd,
    lastKnownPriceUsd: input.source.lastKnownPriceUsd,
    existingPrice: input.existing ? Number(input.existing.price) : undefined,
  });
  let price: ReturnType<typeof calculateAuraPrice> | null = null;
  if (basis.basisUsd && markup) {
    price = calculateAuraPrice({
      supplierPriceUsd: basis.basisUsd,
      exchangeRate: input.exchangeRate,
      markupPercent: markup.markupPercent,
      roundingRule: input.roundingRule,
    });
  }
  if (!resolvedFilters.categoryOptionId) messages.push({ code: "MISSING_CATEGORY_MAPPING", message: "Categoria de origem ainda não foi mapeada.", severity: "warning" });
  if (!resolvedFilters.brandOptionId) messages.push({ code: "MISSING_BRAND_MAPPING", message: `Nova marca encontrada: ${normalizeCatalogValue(input.source.brand)}`, severity: "warning" });
  if (!condition) messages.push({ code: "MISSING_CONDITION_MAPPING", message: `Condição “${input.source.sourceCondition}” ainda não foi mapeada.`, severity: "warning" });
  if (!markup) messages.push({ code: "MISSING_MARKUP", message: `Margem da marca ${input.source.brand} não foi definida.`, severity: "warning" });
  if (!basis.basisUsd && !basis.preserveExistingPrice) messages.push({ code: "MISSING_PRICE", message: "Não existe preço atual ou histórico utilizável.", severity: "warning" });

  const hardError = input.source.validationStatus === "error" || messages.some((message) => message.severity === "error");
  const auraReview = input.source.validationStatus === "warning" || !input.source.importReady;
  const missingConfiguration = messages.some((message) => ["MISSING_CATEGORY_MAPPING", "MISSING_BRAND_MAPPING", "MISSING_CONDITION_MAPPING", "MISSING_MARKUP", "MISSING_PRICE"].includes(message.code));
  let action: AuraImportAction = hardError
    ? "ERROR"
    : missingConfiguration || ((auraReview || supplierConflict) && !approved)
      ? "REVIEW"
      : input.existing ? "UPDATE" : "CREATE";

  if (action === "UPDATE" && sameSupplierItem && !input.configuration.existing.updateName
    && !input.configuration.existing.updateDescription && !input.configuration.existing.updateImages
    && !input.configuration.existing.replaceSpecifications && !input.configuration.existing.updateCategories) {
    const supplierPriceEqual = decimal(sameSupplierItem.supplierPriceUsd) === decimal(input.source.available ? input.source.supplierPriceUsd : null);
    const lastKnownEqual = decimal(sameSupplierItem.lastKnownPriceUsd) === decimal(input.source.lastKnownPriceUsd);
    const priceEqual = basis.preserveExistingPrice || (price && decimal(input.existing?.price) === decimal(price.salePriceBrl));
    if (sameSupplierItem.available === input.source.available && supplierPriceEqual && lastKnownEqual && priceEqual) action = "UNCHANGED";
  }

  const computed: AuraComputedItem = {
    action,
    condition: condition?.condition,
    optionIds: resolvedFilters.optionIds,
    managedFilterIds: input.configuration.managedFilterIds,
    exchangeRate: input.exchangeRate,
    markupPercent: markup?.markupPercent,
    roundingRule: input.roundingRule,
    convertedCostBrl: price?.convertedCostBrl,
    salePriceBrl: basis.preserveExistingPrice ? Number(input.existing?.price) : price?.salePriceBrl,
    priceBasisUsd: basis.basisUsd ?? undefined,
    preserveExistingPrice: basis.preserveExistingPrice,
    existingVariantId: input.existing?.id,
    existingProductId: input.existing?.productId,
    linkedToSupplier: Boolean(sameSupplierItem),
    requiresSupplierLink: supplierConflict,
    approved,
  };
  const status: AuraImportItemStatus = action === "ERROR" ? "ERROR" : action === "REVIEW" ? "REVIEW" : "PENDING";
  return { action, status, messages, computed };
}

async function refreshPreparedSummary(jobId: string) {
  const grouped = await prisma.auraImportItem.groupBy({
    by: ["action"],
    where: { jobId, status: { not: "IGNORED" } },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((group) => [group.action, group._count._all])) as Partial<Record<AuraImportAction, number>>;
}

export async function prepareAuraImportBatch(jobId: string, batchSize = 200) {
  const job = await prisma.auraImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Importação não encontrada.");
  if (!job.exchangeRate) throw new Error("Configure cotação, margens, categorias e condições antes da prévia.");
  const configuration = jsonObject(job.configuration) as unknown as AuraJobConfiguration;
  const items = await prisma.auraImportItem.findMany({
    where: { jobId },
    orderBy: { rowNumber: "asc" },
    skip: job.preparedItems,
    take: Math.max(1, Math.min(batchSize, 500)),
  });
  if (items.length) {
    const existingVariants = await loadExistingVariants(items.map((item) => item.sku));
    const existingBySku = new Map(existingVariants.map((variant) => [variant.sku ?? "", variant]));
    const updates = items.map((item) => {
      const source = item.sourceData as unknown as NormalizedAuraProduct;
      if (!source || typeof source !== "object" || !source.name) {
        return prisma.auraImportItem.update({
          where: { id: item.id },
          data: { action: "ERROR", status: "ERROR", messages: json([{ code: "INVALID_SOURCE_DATA", message: "Item sem dados Aura válidos.", severity: "error" }]) },
        });
      }
      const result = computeItem({
        item,
        source,
        existing: existingBySku.get(item.sku),
        supplierId: job.supplierId,
        exchangeRate: Number(job.exchangeRate),
        roundingRule: job.roundingRule,
        configuration: { ...configuration, existing: configuration.existing ?? DEFAULT_EXISTING_POLICIES },
      });
      return prisma.auraImportItem.update({
        where: { id: item.id },
        data: { action: result.action, status: result.status, messages: json(result.messages), computedData: json(result.computed) },
      });
    });
    await prisma.$transaction(updates);
  }
  const preparedItems = Math.min(job.totalItems, job.preparedItems + items.length);
  const complete = preparedItems >= job.totalItems;
  const counts = complete ? await refreshPreparedSummary(jobId) : {};
  const previousSummary = jsonObject(job.summary);
  const updated = await prisma.auraImportJob.update({
    where: { id: jobId },
    data: {
      preparedItems,
      status: complete ? "READY" : "PREVIEW",
      ...(complete ? {
        summary: json({ ...previousSummary, actions: counts }),
        reviewItems: counts.REVIEW ?? 0,
        errorItems: counts.ERROR ?? 0,
      } : {}),
    },
  });
  return { job: updated, complete, processed: items.length, counts };
}

export async function decideAuraImportItem(input: {
  jobId: string;
  itemId: string;
  decision: "approve" | "ignore";
  actorId?: string;
}) {
  const item = await prisma.auraImportItem.findFirst({ where: { id: input.itemId, jobId: input.jobId } });
  if (!item) throw new Error("Item da importação não encontrado.");
  if (input.decision === "ignore") {
    const updated = await prisma.auraImportItem.update({
      where: { id: item.id },
      data: { status: "IGNORED", reviewedById: input.actorId, computedData: json({ ...jsonObject(item.computedData), ignored: true }) },
    });
    const counts = await refreshPreparedSummary(input.jobId);
    await prisma.auraImportJob.update({ where: { id: input.jobId }, data: { summary: json({ ...jsonObject((await prisma.auraImportJob.findUniqueOrThrow({ where: { id: input.jobId }, select: { summary: true } })).summary), actions: counts }), reviewItems: counts.REVIEW ?? 0, errorItems: counts.ERROR ?? 0 } });
    return updated;
  }
  if (readMessages(item.messages).some((message) => message.severity === "error")) {
    throw new Error("Itens com erro estrutural não podem ser aprovados; corrija o arquivo de origem.");
  }
  const computed = jsonObject(item.computedData) as AuraComputedItem;
  if (!computed.salePriceBrl || !computed.condition || (computed.optionIds?.length ?? 0) < 2) {
    throw new Error("Conclua os mapeamentos e a precificação antes de aprovar este item.");
  }
  const updated = await prisma.auraImportItem.update({
    where: { id: item.id },
    data: {
      reviewedById: input.actorId,
      action: computed.existingVariantId ? "UPDATE" : "CREATE",
      status: "PENDING",
      computedData: json({ ...computed, approved: true }),
    },
  });
  const counts = await refreshPreparedSummary(input.jobId);
  const currentJob = await prisma.auraImportJob.findUniqueOrThrow({ where: { id: input.jobId }, select: { summary: true } });
  await prisma.auraImportJob.update({ where: { id: input.jobId }, data: { summary: json({ ...jsonObject(currentJob.summary), actions: counts }), reviewItems: counts.REVIEW ?? 0, errorItems: counts.ERROR ?? 0 } });
  return updated;
}

export async function updateAuraImportItemMarkup(input: {
  jobId: string;
  itemId: string;
  markupPercent: number;
}) {
  if (!Number.isFinite(input.markupPercent) || input.markupPercent < 0 || input.markupPercent > 1000) {
    throw new Error("Margem individual inválida.");
  }
  const item = await prisma.auraImportItem.findFirst({
    where: { id: input.itemId, jobId: input.jobId },
    include: { job: { select: { status: true, exchangeRate: true, roundingRule: true } } },
  });
  if (!item) throw new Error("Item da importação não encontrado.");
  if (!['PREVIEW', 'READY'].includes(item.job.status) || item.processedAt) {
    throw new Error("A margem só pode ser alterada antes do processamento.");
  }
  const computed = jsonObject(item.computedData) as AuraComputedItem;
  const priceBasisUsd = Number(computed.priceBasisUsd);
  const exchangeRate = Number(item.job.exchangeRate ?? computed.exchangeRate);
  if (!Number.isFinite(priceBasisUsd) || priceBasisUsd <= 0 || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("Este item não possui uma base de preço editável.");
  }
  const price = calculateAuraPrice({
    supplierPriceUsd: priceBasisUsd,
    exchangeRate,
    markupPercent: input.markupPercent,
    roundingRule: item.job.roundingRule,
  });
  const action: AuraImportAction = computed.existingVariantId ? "UPDATE" : "CREATE";
  const updated = await prisma.auraImportItem.update({
    where: { id: item.id },
    data: {
      action,
      status: "PENDING",
      computedData: json({
        ...computed,
        exchangeRate,
        markupPercent: input.markupPercent,
        convertedCostBrl: price.convertedCostBrl,
        salePriceBrl: price.salePriceBrl,
        priceBasisUsd,
        preserveExistingPrice: false,
      }),
    },
  });
  const counts = await refreshPreparedSummary(input.jobId);
  const currentJob = await prisma.auraImportJob.findUniqueOrThrow({ where: { id: input.jobId }, select: { summary: true } });
  await prisma.auraImportJob.update({
    where: { id: input.jobId },
    data: {
      summary: json({ ...jsonObject(currentJob.summary), actions: counts }),
      reviewItems: counts.REVIEW ?? 0,
      errorItems: counts.ERROR ?? 0,
    },
  });
  return updated;
}

export async function getAuraJob(jobId: string) {
  return prisma.auraImportJob.findUnique({
    where: { id: jobId },
    include: { supplier: { select: { id: true, name: true, slug: true, allowedDomains: true } } },
  });
}

export async function getAuraJobItems(input: {
  jobId: string;
  page?: number;
  pageSize?: number;
  action?: AuraImportAction;
  status?: AuraImportItemStatus;
  availability?: "available" | "unavailable";
  brand?: string;
  sourceGroup?: string;
  sourceSubgroup?: string;
  optionId?: string;
  condition?: Condition;
  identity?: "new" | "existing";
  query?: string;
}) {
  const page = Math.max(1, input.page ?? 1);
  const take = Math.max(1, Math.min(input.pageSize ?? 50, 200));
  const query = input.query?.trim().slice(0, 100);
  const filters: Prisma.AuraImportItemWhereInput[] = [];
  if (input.action) filters.push({ action: input.action });
  if (input.identity === "new") filters.push({ action: "CREATE" });
  if (input.identity === "existing") filters.push({ action: { in: ["UPDATE", "UNCHANGED"] } });
  if (input.optionId) filters.push({ computedData: { path: ["optionIds"], array_contains: [input.optionId] } });
  if (input.condition) filters.push({ computedData: { path: ["condition"], equals: input.condition } });
  const where: Prisma.AuraImportItemWhereInput = {
    jobId: input.jobId,
    ...(filters.length ? { AND: filters } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.brand ? { brand: { equals: input.brand, mode: "insensitive" } } : {}),
    ...(input.sourceGroup ? { sourceGroup: { equals: input.sourceGroup, mode: "insensitive" } } : {}),
    ...(input.sourceSubgroup ? { sourceSubgroup: { equals: input.sourceSubgroup, mode: "insensitive" } } : {}),
    ...(query ? { OR: [
      { sku: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { brand: { contains: query, mode: "insensitive" } },
      { sourceData: { path: ["model"], string_contains: query } },
    ] } : {}),
    ...(input.availability ? { sourceData: { path: ["available"], equals: input.availability === "available" } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.auraImportItem.findMany({ where, orderBy: { rowNumber: "asc" }, skip: (page - 1) * take, take }),
    prisma.auraImportItem.count({ where }),
  ]);
  return { items, total, page, pageSize: take, pages: Math.max(1, Math.ceil(total / take)) };
}

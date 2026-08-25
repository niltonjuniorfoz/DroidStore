import type { AuraImportItemStatus, Prisma } from "@prisma/client";
import prisma from "../prisma";
import { slugify } from "../slug";
import { ingestSupplierImages } from "./images";
import { getAuraJob } from "./jobService";
import {
  DEFAULT_EXISTING_POLICIES,
  type AuraComputedItem,
  type AuraJobConfiguration,
  type AuraMessage,
  type NormalizedAuraProduct,
} from "./types";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function object(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function messages(value: Prisma.JsonValue): AuraMessage[] {
  return Array.isArray(value) ? value.filter((item): item is AuraMessage => Boolean(item && typeof item === "object" && "code" in item)) : [];
}

function domains(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function decimal(value: unknown) {
  return Number(value).toFixed(2);
}

async function uniqueSlug(tx: Prisma.TransactionClient, source: NormalizedAuraProduct) {
  const base = slugify(`${source.brand}-${source.model || source.name}`) || `produto-${slugify(source.sku)}`;
  const candidates = [base, `${base}-${slugify(source.sku)}`];
  for (const candidate of candidates) {
    if (!await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } })) return candidate;
  }
  let suffix = 2;
  while (suffix < 1000) {
    const candidate = `${base}-${slugify(source.sku)}-${suffix++}`;
    if (!await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } })) return candidate;
  }
  throw new Error("Não foi possível gerar um slug único para o produto.");
}

function supplierCatalogData(input: {
  source: NormalizedAuraProduct;
  computed: AuraComputedItem;
}) {
  return {
    sku: input.source.sku,
    sourceUrl: input.source.sourceUrl || null,
    sourceGroup: input.source.sourceGroup || null,
    sourceSubgroup: input.source.sourceSubgroup || null,
    sourceCategory: input.source.sourceCategory || null,
    categoryPath: json(input.source.categoryPath),
    sourceName: input.source.sourceName || null,
    sourceBrand: input.source.brand || null,
    sourceModel: input.source.model || null,
    sourceColor: input.source.color || null,
    sourceStorage: input.source.storage || null,
    sourceCondition: input.source.sourceCondition || null,
    supplierPriceUsd: input.source.available ? input.source.supplierPriceUsd : null,
    lastKnownPriceUsd: input.source.lastKnownPriceUsd,
    exchangeRate: input.computed.exchangeRate,
    markupPercent: input.computed.markupPercent,
    salePriceBrl: input.computed.salePriceBrl,
    available: input.source.available,
    sourceImages: json(input.source.images),
    rawData: json(input.source.rawData),
    lastSeenAt: new Date(),
    lastImportedAt: new Date(),
  };
}

async function applyUnchanged(input: {
  itemId: string;
  supplierId: string;
  variantId: string;
  source: NormalizedAuraProduct;
  computed: AuraComputedItem;
}) {
  await prisma.$transaction([
    prisma.supplierCatalogItem.update({
      where: { supplierId_sku: { supplierId: input.supplierId, sku: input.source.sku } },
      data: supplierCatalogData(input),
    }),
    prisma.auraImportItem.update({
      where: { id: input.itemId },
      data: { status: "UNCHANGED", productId: input.computed.existingProductId, variantId: input.variantId, processedAt: new Date() },
    }),
  ]);
}

async function applyExisting(input: {
  itemId: string;
  jobId: string;
  supplierId: string;
  source: NormalizedAuraProduct;
  computed: AuraComputedItem;
  configuration: AuraJobConfiguration;
  permanentImages: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const variant = await tx.variant.findUnique({
      where: { sku: input.source.sku },
      include: {
        product: {
          include: {
            images: { orderBy: { position: "asc" } },
            specifications: { orderBy: { position: "asc" } },
            filterSelections: true,
          },
        },
        supplierItems: true,
      },
    });
    if (!variant) throw new Error("O SKU existente não foi encontrado no momento da aplicação.");
    const supplierItem = variant.supplierItems.find((item) => item.supplierId === input.supplierId);
    if (!supplierItem && !input.computed.approved) throw new Error("O vínculo deste SKU com o fornecedor ainda não foi aprovado.");

    const policies = input.configuration.existing ?? DEFAULT_EXISTING_POLICIES;
    const beforeSnapshot = {
      kind: "UPDATED",
      variant: {
        id: variant.id,
        price: decimal(variant.price),
        dropshipAvailable: variant.dropshipAvailable,
        updatedAt: variant.updatedAt,
      },
      product: {
        id: variant.product.id,
        name: variant.product.name,
        description: variant.product.description,
        imageUrl: variant.product.imageUrl,
        updatedAt: variant.product.updatedAt,
        images: variant.product.images,
        specifications: variant.product.specifications,
        filterOptionIds: variant.product.filterSelections.map((selection) => selection.optionId),
      },
      supplierItem,
    };
    const nextPrice = input.computed.preserveExistingPrice ? undefined : input.computed.salePriceBrl;
    await tx.variant.update({
      where: { id: variant.id },
      data: {
        ...(nextPrice ? { price: nextPrice } : {}),
        dropshipAvailable: input.source.available,
      },
    });

    const shouldFillDescription = !variant.product.description?.trim() && Boolean(input.source.description);
    if (policies.updateName || policies.updateDescription || shouldFillDescription) {
      await tx.product.update({
        where: { id: variant.product.id },
        data: {
          ...(policies.updateName ? { name: input.source.name } : {}),
          ...(policies.updateDescription || shouldFillDescription ? { description: input.source.description || variant.product.description } : {}),
        },
      });
    }
    if (policies.updateImages && input.permanentImages.length) {
      await tx.productImage.deleteMany({ where: { productId: variant.product.id } });
      await tx.productImage.createMany({
        data: input.permanentImages.map((url, position) => ({ productId: variant.product.id, url, color: input.source.color || null, position })),
      });
      await tx.product.update({ where: { id: variant.product.id }, data: { imageUrl: input.permanentImages[0] } });
    }
    if (policies.replaceSpecifications) {
      await tx.productSpecification.deleteMany({ where: { productId: variant.product.id } });
      if (input.source.specifications.length) {
        await tx.productSpecification.createMany({
          data: input.source.specifications.map((specification) => ({ productId: variant.product.id, ...specification })),
        });
      }
    } else if (input.source.specifications.length) {
      const existingLabels = new Set(variant.product.specifications.map((specification) => specification.label.trim().toLowerCase()));
      const missing = input.source.specifications.filter((specification) => !existingLabels.has(specification.label.trim().toLowerCase()));
      if (missing.length) {
        await tx.productSpecification.createMany({
          data: missing.map((specification, index) => ({ ...specification, productId: variant.product.id, position: variant.product.specifications.length + index })),
        });
      }
    }
    if (policies.updateCategories) {
      if (!input.computed.managedFilterIds?.length) {
        throw new Error("Os filtros Marca e Categoria não foram identificados para esta importação.");
      }
      await tx.productFilterSelection.deleteMany({
        where: {
          productId: variant.product.id,
          option: { filterId: { in: input.computed.managedFilterIds } },
        },
      });
      if (input.computed.optionIds.length) {
        await tx.productFilterSelection.createMany({
          data: input.computed.optionIds.map((optionId) => ({ productId: variant.product.id, optionId })),
          skipDuplicates: true,
        });
      }
    }
    await tx.supplierCatalogItem.upsert({
      where: { supplierId_sku: { supplierId: input.supplierId, sku: input.source.sku } },
      update: { ...supplierCatalogData(input), variantId: variant.id },
      create: { supplierId: input.supplierId, variantId: variant.id, ...supplierCatalogData(input) },
    });
    const afterSnapshot = {
      kind: "UPDATED",
      variant: { id: variant.id, price: nextPrice ? decimal(nextPrice) : decimal(variant.price), dropshipAvailable: input.source.available },
      product: {
        id: variant.product.id,
        changed: {
          name: policies.updateName,
          description: policies.updateDescription || shouldFillDescription,
          images: policies.updateImages && input.permanentImages.length > 0,
          specifications: policies.replaceSpecifications || input.source.specifications.length > 0,
          categories: policies.updateCategories,
        },
      },
    };
    await tx.auraImportItem.update({
      where: { id: input.itemId },
      data: {
        status: "UPDATED",
        productId: variant.product.id,
        variantId: variant.id,
        beforeSnapshot: json(beforeSnapshot),
        afterSnapshot: json(afterSnapshot),
        processedAt: new Date(),
      },
    });
    return { productId: variant.product.id, variantId: variant.id };
  });
}

async function applyNew(input: {
  itemId: string;
  jobId: string;
  supplierId: string;
  source: NormalizedAuraProduct;
  computed: AuraComputedItem;
  permanentImages: string[];
}) {
  return prisma.$transaction(async (tx) => {
    if (!input.computed.condition || !input.computed.salePriceBrl) throw new Error("Item sem condição ou preço final configurado.");
    if (await tx.variant.findUnique({ where: { sku: input.source.sku }, select: { id: true } })) {
      throw new Error("O SKU foi criado por outra operação depois da prévia. Revise o conflito.");
    }
    const grouped = input.source.groupKey
      ? await tx.auraImportItem.findFirst({
          where: {
            jobId: input.jobId,
            groupKey: input.source.groupKey,
            status: "CREATED",
            productId: { not: null },
          },
          orderBy: { rowNumber: "asc" },
          select: { productId: true },
        })
      : null;
    let productId = grouped?.productId ?? null;
    let variantId: string;
    let createdProduct = false;
    if (productId) {
      const variant = await tx.variant.create({
        data: {
          productId,
          sku: input.source.sku,
          storage: input.source.storage || null,
          color: input.source.color || null,
          condition: input.computed.condition,
          price: input.computed.salePriceBrl,
          costPrice: input.computed.convertedCostBrl ?? 0,
          stock: 0,
          dropshipAvailable: input.source.available,
        },
      });
      variantId = variant.id;
      const lastImage = await tx.productImage.aggregate({ where: { productId }, _max: { position: true } });
      const start = (lastImage._max.position ?? -1) + 1;
      if (input.permanentImages.length) {
        await tx.productImage.createMany({
          data: input.permanentImages.map((url, index) => ({ productId: productId!, url, color: input.source.color || null, position: start + index })),
        });
      }
      if (input.computed.optionIds.length) {
        await tx.productFilterSelection.createMany({
          data: input.computed.optionIds.map((optionId) => ({ productId: productId!, optionId })),
          skipDuplicates: true,
        });
      }
    } else {
      const slug = await uniqueSlug(tx, input.source);
      const product = await tx.product.create({
        data: {
          slug,
          name: input.source.name,
          brand: input.source.brand,
          description: input.source.description || null,
          imageUrl: input.permanentImages[0] ?? null,
          active: true,
          variants: {
            create: {
              sku: input.source.sku,
              storage: input.source.storage || null,
              color: input.source.color || null,
              condition: input.computed.condition,
              price: input.computed.salePriceBrl,
              costPrice: input.computed.convertedCostBrl ?? 0,
              stock: 0,
              dropshipAvailable: input.source.available,
            },
          },
          images: {
            create: input.permanentImages.map((url, position) => ({ url, color: input.source.color || null, position })),
          },
          specifications: { create: input.source.specifications },
          filterSelections: { create: input.computed.optionIds.map((optionId) => ({ optionId })) },
        },
        include: { variants: { select: { id: true } } },
      });
      productId = product.id;
      variantId = product.variants[0].id;
      createdProduct = true;
    }
    await tx.supplierCatalogItem.create({
      data: { supplierId: input.supplierId, variantId, ...supplierCatalogData(input) },
    });
    const snapshot = {
      kind: "CREATED",
      productId,
      variantId,
      createdProduct,
      productUpdatedAt: new Date(),
    };
    await tx.auraImportItem.update({
      where: { id: input.itemId },
      data: {
        status: "CREATED",
        productId,
        variantId,
        beforeSnapshot: json({ kind: "CREATED" }),
        afterSnapshot: json(snapshot),
        processedAt: new Date(),
      },
    });
    return { productId, variantId };
  });
}

async function markItemError(itemId: string, currentMessages: AuraMessage[], error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada ao processar o SKU.";
  await prisma.auraImportItem.update({
    where: { id: itemId },
    data: {
      action: "ERROR",
      status: "ERROR",
      messages: json([...currentMessages, { code: "PROCESSING_ERROR", message, severity: "error" }]),
      processedAt: new Date(),
    },
  });
}

export async function refreshAuraJobProgress(jobId: string) {
  const grouped = await prisma.auraImportItem.groupBy({ by: ["status"], where: { jobId }, _count: { _all: true } });
  const counts = Object.fromEntries(grouped.map((group) => [group.status, group._count._all])) as Partial<Record<AuraImportItemStatus, number>>;
  const pending = counts.PENDING ?? 0;
  const processedItems = Object.entries(counts)
    .filter(([status]) => status !== "PENDING")
    .reduce((sum, [, count]) => sum + count, 0);
  return prisma.auraImportJob.update({
    where: { id: jobId },
    data: {
      processedItems,
      createdItems: counts.CREATED ?? 0,
      updatedItems: counts.UPDATED ?? 0,
      unchangedItems: counts.UNCHANGED ?? 0,
      reviewItems: counts.REVIEW ?? 0,
      errorItems: counts.ERROR ?? 0,
      ...(pending === 0 ? { status: "COMPLETED", completedAt: new Date() } : {}),
    },
  });
}

export async function startAuraImport(jobId: string) {
  const job = await prisma.auraImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Importação não encontrada.");
  if (job.status !== "READY" && job.status !== "PAUSED") throw new Error("A importação ainda não está pronta para iniciar.");
  return prisma.auraImportJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: job.startedAt ?? new Date(), completedAt: null, cancelledAt: null },
  });
}

export async function processAuraImportBatch(jobId: string, batchSize = 10) {
  const job = await getAuraJob(jobId);
  if (!job) throw new Error("Importação não encontrada.");
  if (job.status !== "PROCESSING") throw new Error(job.status === "PAUSED" ? "Importação pausada." : "A importação não está em processamento.");
  const configuration = object(job.configuration) as unknown as AuraJobConfiguration;
  const items = await prisma.auraImportItem.findMany({
    where: { jobId, status: "PENDING", action: { in: ["CREATE", "UPDATE", "UNCHANGED"] } },
    orderBy: { rowNumber: "asc" },
    take: Math.max(1, Math.min(batchSize, 20)),
  });
  const events: Array<{ action: "aura.product.create" | "aura.product.update"; entityId: string; sku: string; name: string }> = [];
  for (const item of items) {
    const source = item.sourceData as unknown as NormalizedAuraProduct;
    const computed = item.computedData as unknown as AuraComputedItem;
    const currentMessages = messages(item.messages);
    try {
      if (item.action === "UNCHANGED") {
        if (!computed.existingVariantId) throw new Error("SKU sem vínculo existente para registrar como inalterado.");
        await applyUnchanged({ itemId: item.id, supplierId: job.supplierId, variantId: computed.existingVariantId, source, computed });
        continue;
      }
      const shouldCopyImages = item.action === "CREATE" || Boolean(configuration.existing?.updateImages);
      const permanentImages = shouldCopyImages && source.images.length
        ? (await ingestSupplierImages({
            supplierId: job.supplierId,
            sku: source.sku,
            sourceUrls: source.images,
            allowedDomains: domains(job.supplier.allowedDomains),
          })).map((image) => image.permanentUrl)
        : [];
      if (item.action === "UPDATE") {
        const applied = await applyExisting({ itemId: item.id, jobId, supplierId: job.supplierId, source, computed, configuration, permanentImages });
        events.push({ action: "aura.product.update", entityId: applied.productId, sku: source.sku, name: source.name });
      } else {
        const applied = await applyNew({ itemId: item.id, jobId, supplierId: job.supplierId, source, computed, permanentImages });
        events.push({ action: "aura.product.create", entityId: applied.productId!, sku: source.sku, name: source.name });
      }
    } catch (error) {
      await markItemError(item.id, currentMessages, error);
    }
  }
  const updatedJob = await refreshAuraJobProgress(jobId);
  return { job: updatedJob, processed: items.length, complete: updatedJob.status === "COMPLETED", events };
}

export async function pauseAuraImport(jobId: string) {
  const result = await prisma.auraImportJob.updateMany({ where: { id: jobId, status: "PROCESSING" }, data: { status: "PAUSED" } });
  if (!result.count) throw new Error("Somente uma importação em andamento pode ser pausada.");
  return prisma.auraImportJob.findUnique({ where: { id: jobId } });
}

export async function resumeAuraImport(jobId: string) {
  const result = await prisma.auraImportJob.updateMany({ where: { id: jobId, status: "PAUSED" }, data: { status: "PROCESSING" } });
  if (!result.count) throw new Error("Somente uma importação pausada pode ser retomada.");
  return prisma.auraImportJob.findUnique({ where: { id: jobId } });
}

export async function cancelAuraImport(jobId: string) {
  const result = await prisma.auraImportJob.updateMany({
    where: { id: jobId, status: { in: ["READY", "PROCESSING", "PAUSED", "PREVIEW"] } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (!result.count) throw new Error("Esta importação não pode mais ser cancelada.");
  return prisma.auraImportJob.findUnique({ where: { id: jobId } });
}

import type { Prisma } from "@prisma/client";
import prisma from "../prisma";

function object(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function dateChangedAfter(current: Date, processedAt: Date | null) {
  return processedAt ? current.getTime() > processedAt.getTime() + 2_000 : true;
}

function decimal(value: unknown) {
  return Number(value).toFixed(2);
}

export type AuraRollbackResult = {
  restored: number;
  partial: Array<{ sku: string; reason: string }>;
};

export async function rollbackAuraImport(jobId: string, actorId?: string): Promise<AuraRollbackResult> {
  const job = await prisma.auraImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Importação não encontrada.");
  if (!["COMPLETED", "CANCELLED", "FAILED"].includes(job.status)) throw new Error("Esta importação ainda não pode ser desfeita.");
  const items = await prisma.auraImportItem.findMany({
    where: { jobId, status: { in: ["CREATED", "UPDATED", "UNCHANGED"] } },
    orderBy: { rowNumber: "desc" },
  });
  let restored = 0;
  const partial: AuraRollbackResult["partial"] = [];

  for (const item of items) {
    try {
      if (item.status === "UNCHANGED") {
        await prisma.auraImportItem.update({ where: { id: item.id }, data: { status: "ROLLED_BACK" } });
        restored++;
        continue;
      }
      const before = object(item.beforeSnapshot);
      const after = object(item.afterSnapshot);
      if (item.status === "CREATED") {
        if (!item.variantId || !item.productId) throw new Error("Item criado sem referência de produto/variação.");
        const variant = await prisma.variant.findUnique({
          where: { id: item.variantId },
          include: { _count: { select: { orderItems: true } } },
        });
        if (!variant) {
          await prisma.auraImportItem.update({ where: { id: item.id }, data: { status: "ROLLED_BACK" } });
          restored++;
          continue;
        }
        if (variant._count.orderItems > 0) throw new Error("O SKU já possui pedido associado e não pode ser excluído.");
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { updatedAt: true } });
        if (product && dateChangedAfter(product.updatedAt, item.processedAt)) throw new Error("O produto recebeu alterações depois da importação.");
        await prisma.$transaction(async (tx) => {
          await tx.supplierCatalogItem.deleteMany({ where: { supplierId: job.supplierId, variantId: variant.id } });
          await tx.variant.delete({ where: { id: variant.id } });
          const remaining = await tx.variant.count({ where: { productId: item.productId! } });
          if (remaining === 0) await tx.product.delete({ where: { id: item.productId! } });
          await tx.auraImportItem.update({ where: { id: item.id }, data: { status: "ROLLED_BACK" } });
        });
        restored++;
        continue;
      }

      if (!item.variantId || !item.productId) throw new Error("Snapshot de atualização incompleto.");
      const currentVariant = await prisma.variant.findUnique({ where: { id: item.variantId } });
      const currentProduct = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!currentVariant || !currentProduct) throw new Error("Produto ou variação não existe mais.");
      const beforeVariant = object(before.variant as Prisma.JsonValue);
      const beforeProduct = object(before.product as Prisma.JsonValue);
      const afterVariant = object(after.variant as Prisma.JsonValue);
      const afterProduct = object(after.product as Prisma.JsonValue);
      const changed = object(afterProduct.changed as Prisma.JsonValue);
      if (decimal(currentVariant.price) !== decimal(afterVariant.price)
        || currentVariant.dropshipAvailable !== Boolean(afterVariant.dropshipAvailable)
        || dateChangedAfter(currentProduct.updatedAt, item.processedAt)) {
        throw new Error("O produto foi alterado depois desta importação.");
      }

      await prisma.$transaction(async (tx) => {
        await tx.variant.update({
          where: { id: item.variantId! },
          data: {
            price: String(beforeVariant.price),
            dropshipAvailable: Boolean(beforeVariant.dropshipAvailable),
          },
        });
        await tx.product.update({
          where: { id: item.productId! },
          data: {
            ...(changed.name ? { name: String(beforeProduct.name) } : {}),
            ...(changed.description ? { description: beforeProduct.description ? String(beforeProduct.description) : null } : {}),
            ...(changed.images ? { imageUrl: beforeProduct.imageUrl ? String(beforeProduct.imageUrl) : null } : {}),
          },
        });
        if (changed.images) {
          await tx.productImage.deleteMany({ where: { productId: item.productId! } });
          const previousImages = rows<{ url: string; color?: string | null; position?: number }>(beforeProduct.images);
          if (previousImages.length) {
            await tx.productImage.createMany({
              data: previousImages.map((image, position) => ({ productId: item.productId!, url: image.url, color: image.color ?? null, position: image.position ?? position })),
            });
          }
        }
        if (changed.specifications) {
          await tx.productSpecification.deleteMany({ where: { productId: item.productId! } });
          const previousSpecs = rows<{ label: string; value: string; position?: number }>(beforeProduct.specifications);
          if (previousSpecs.length) {
            await tx.productSpecification.createMany({
              data: previousSpecs.map((specification, position) => ({ productId: item.productId!, label: specification.label, value: specification.value, position: specification.position ?? position })),
            });
          }
        }
        if (changed.categories) {
          await tx.productFilterSelection.deleteMany({ where: { productId: item.productId! } });
          const optionIds = rows<string>(beforeProduct.filterOptionIds);
          if (optionIds.length) {
            await tx.productFilterSelection.createMany({ data: optionIds.map((optionId) => ({ productId: item.productId!, optionId })), skipDuplicates: true });
          }
        }
        const previousSupplier = before.supplierItem && typeof before.supplierItem === "object"
          ? before.supplierItem as Record<string, unknown>
          : null;
        if (!previousSupplier) {
          await tx.supplierCatalogItem.deleteMany({ where: { supplierId: job.supplierId, sku: item.sku } });
        } else {
          await tx.supplierCatalogItem.update({
            where: { supplierId_sku: { supplierId: job.supplierId, sku: item.sku } },
            data: {
              sourceUrl: previousSupplier.sourceUrl ? String(previousSupplier.sourceUrl) : null,
              sourceGroup: previousSupplier.sourceGroup ? String(previousSupplier.sourceGroup) : null,
              sourceSubgroup: previousSupplier.sourceSubgroup ? String(previousSupplier.sourceSubgroup) : null,
              categoryPath: previousSupplier.categoryPath ? previousSupplier.categoryPath as Prisma.InputJsonValue : [],
              sourceName: previousSupplier.sourceName ? String(previousSupplier.sourceName) : null,
              sourceBrand: previousSupplier.sourceBrand ? String(previousSupplier.sourceBrand) : null,
              sourceModel: previousSupplier.sourceModel ? String(previousSupplier.sourceModel) : null,
              sourceColor: previousSupplier.sourceColor ? String(previousSupplier.sourceColor) : null,
              sourceStorage: previousSupplier.sourceStorage ? String(previousSupplier.sourceStorage) : null,
              sourceCondition: previousSupplier.sourceCondition ? String(previousSupplier.sourceCondition) : null,
              supplierPriceUsd: previousSupplier.supplierPriceUsd ? String(previousSupplier.supplierPriceUsd) : null,
              lastKnownPriceUsd: previousSupplier.lastKnownPriceUsd ? String(previousSupplier.lastKnownPriceUsd) : null,
              exchangeRate: previousSupplier.exchangeRate ? String(previousSupplier.exchangeRate) : null,
              markupPercent: previousSupplier.markupPercent ? String(previousSupplier.markupPercent) : null,
              salePriceBrl: previousSupplier.salePriceBrl ? String(previousSupplier.salePriceBrl) : null,
              available: Boolean(previousSupplier.available),
              sourceImages: previousSupplier.sourceImages ? previousSupplier.sourceImages as Prisma.InputJsonValue : [],
              rawData: previousSupplier.rawData ? previousSupplier.rawData as Prisma.InputJsonValue : undefined,
              lastSeenAt: previousSupplier.lastSeenAt ? new Date(String(previousSupplier.lastSeenAt)) : undefined,
              lastImportedAt: previousSupplier.lastImportedAt ? new Date(String(previousSupplier.lastImportedAt)) : undefined,
            },
          });
        }
        await tx.auraImportItem.update({ where: { id: item.id }, data: { status: "ROLLED_BACK" } });
      });
      restored++;
    } catch (error) {
      partial.push({ sku: item.sku, reason: error instanceof Error ? error.message : "Rollback manual necessário." });
    }
  }

  await prisma.auraImportJob.update({
    where: { id: jobId },
    data: {
      status: partial.length ? "PARTIAL_ROLLBACK" : "ROLLED_BACK",
      rolledBackAt: new Date(),
      rollbackById: actorId,
      errorMessage: partial.length ? `Rollback parcial: ${partial.length} item(ns) exigem revisão manual.` : null,
    },
  });
  return { restored, partial };
}

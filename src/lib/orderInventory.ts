import { isVariantAvailable, reservesInventory, type StoreModeValue } from "./storeMode";
import type { Prisma } from "@prisma/client";

type InventoryTransaction = Pick<Prisma.TransactionClient, "variant" | "stockMovement">;

export class ProductUnavailableError extends Error {
  constructor(
    public readonly productName: string,
    public readonly reason: "OUT_OF_STOCK" | "DROPSHIP_UNAVAILABLE",
  ) {
    super(`${reason}:${productName}`);
    this.name = "ProductUnavailableError";
  }
}

export async function reserveVariantForOrder(
  tx: InventoryTransaction,
  input: {
    variant: { id: string; stock: number; dropshipAvailable: boolean; productName: string };
    quantity: number;
    storeMode: StoreModeValue;
  },
): Promise<void> {
  if (!reservesInventory(input.storeMode)) {
    if (!isVariantAvailable({
      storeMode: input.storeMode,
      stock: input.variant.stock,
      dropshipAvailable: input.variant.dropshipAvailable,
    })) {
      throw new ProductUnavailableError(input.variant.productName, "DROPSHIP_UNAVAILABLE");
    }
    return;
  }

  const reserved = await tx.variant.updateMany({
    where: { id: input.variant.id, stock: { gte: input.quantity } },
    data: { stock: { decrement: input.quantity } },
  });
  if (reserved.count !== 1) throw new ProductUnavailableError(input.variant.productName, "OUT_OF_STOCK");
}

export async function recordOrderSaleMovements(
  tx: InventoryTransaction,
  input: {
    orderId: string;
    inventoryReserved: boolean;
    items: Array<{ variantId: string; quantity: number }>;
  },
): Promise<void> {
  if (!input.inventoryReserved) return;
  await tx.stockMovement.createMany({
    data: input.items.map((item) => ({
      variantId: item.variantId,
      type: "SALE",
      quantity: -item.quantity,
      note: `Reserva do pedido #${input.orderId.slice(0, 8).toUpperCase()}`,
    })),
  });
}

export async function restoreOrderInventory(
  tx: InventoryTransaction,
  input: {
    inventoryReserved: boolean;
    items: Array<{ variantId: string; quantity: number }>;
    note: string;
    createdById?: string;
  },
): Promise<void> {
  if (!input.inventoryReserved) return;
  for (const item of input.items) {
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        type: "RETURN",
        quantity: item.quantity,
        note: input.note,
        ...(input.createdById ? { createdById: input.createdById } : {}),
      },
    });
  }
}

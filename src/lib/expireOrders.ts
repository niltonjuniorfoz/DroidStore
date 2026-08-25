import prisma from "./prisma";
import { restoreOrderInventory } from "./orderInventory";

export const DEFAULT_RESERVATION_HOURS = 24;

export function reservationHours(): number {
  const parsed = Number(process.env.ORDER_RESERVATION_HOURS);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 24 * 14 ? parsed : DEFAULT_RESERVATION_HOURS;
}

export function pendingCutoff(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

/**
 * Cancela pedidos PENDING antigos e devolve o estoque reservado.
 * Checkout abandonado não pode segurar aparelho à venda para sempre.
 * Chamada nos pontos quentes (admin de pedidos, checkout) e pelo cron diário.
 */
export async function expireStaleOrders(now = new Date()): Promise<number> {
  const cutoff = pendingCutoff(now, reservationHours());
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true, inventoryReserved: true },
    take: 50,
  });

  let expired = 0;
  for (const { id, inventoryReserved } of stale) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        // Claim atômico: se o webhook pagou/cancelou no meio do caminho, não mexe.
        const claimed = await tx.order.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        if (!claimed.count) return false;

        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        await restoreOrderInventory(tx, {
          inventoryReserved,
          items,
          note: `Reserva expirada do pedido #${id.slice(0, 8).toUpperCase()}`,
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: "PENDING",
            toStatus: "CANCELLED",
            note: `Cancelado automaticamente: pagamento não confirmado em ${reservationHours()}h.`,
          },
        });
        return true;
      }, { isolationLevel: "Serializable" });
      if (done) expired += 1;
    } catch (error) {
      console.error(`Falha ao expirar pedido ${id}`, error);
    }
  }
  return expired;
}

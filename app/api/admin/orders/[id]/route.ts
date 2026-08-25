import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import prisma from "../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { sendPaidOrderEmail, sendShippedOrderEmail } from "../../../../../src/lib/orderEmail";
import { canTransition, shouldRestock } from "../../../../../src/lib/orderStatus";
import { audit } from "../../../../../src/lib/audit";
import { restoreOrderInventory } from "../../../../../src/lib/orderInventory";

const patchSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  trackingCode: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
}).refine((data) => data.status !== undefined || data.trackingCode !== undefined, {
  message: "Informe uma alteração.",
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const nextStatus = parsed.data.status ?? order.status;
  if (!canTransition(order.status, nextStatus)) {
    return NextResponse.json(
      { error: `Não é possível alterar um pedido ${order.status} para ${nextStatus}.` },
      { status: 409 },
    );
  }
  if (nextStatus === "SHIPPED" && !parsed.data.trackingCode && !order.trackingCode) {
    return NextResponse.json({ error: "Informe o código de rastreio antes de enviar." }, { status: 400 });
  }

  const actorId = (session.user as { id?: string }).id;
  const updated = await prisma.$transaction(async (tx) => {
    if (shouldRestock(order.status, nextStatus)) {
      await restoreOrderInventory(tx, {
        inventoryReserved: order.inventoryReserved,
        items: order.items,
        note: `${nextStatus === "REFUNDED" ? "Reembolso" : "Estorno"} do pedido #${order.id.slice(0, 8).toUpperCase()}`,
        createdById: actorId,
      });
    }

    const statusChanged = nextStatus !== order.status;
    const result = await tx.order.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(parsed.data.trackingCode !== undefined ? { trackingCode: parsed.data.trackingCode || null } : {}),
        ...(nextStatus === "SHIPPED" && statusChanged ? { shippedAt: new Date() } : {}),
        ...(nextStatus === "DELIVERED" && statusChanged ? { deliveredAt: new Date() } : {}),
        ...(nextStatus === "CANCELLED" && statusChanged ? { cancelledAt: new Date() } : {}),
        ...(nextStatus === "REFUNDED" && statusChanged ? { cancelledAt: new Date() } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { variant: { include: { product: true } } } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (statusChanged) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: nextStatus,
          note: parsed.data.note || null,
          createdById: actorId,
        },
      });
    }
    return result;
  });

  await audit(session, {
    action: "order.update",
    entity: "Order",
    entityId: order.id,
    summary: nextStatus !== order.status
      ? `Pedido #${order.id.slice(0, 8).toUpperCase()}: ${order.status} → ${nextStatus}`
      : `Pedido #${order.id.slice(0, 8).toUpperCase()}: rastreio atualizado`,
    before: { status: order.status, trackingCode: order.trackingCode },
    after: { status: nextStatus, trackingCode: updated.trackingCode },
  });

  if (order.status === "PENDING" && nextStatus === "PAID") await sendPaidOrderEmail(order.id);
  if (order.status !== "SHIPPED" && nextStatus === "SHIPPED") await sendShippedOrderEmail(order.id);

  if (isOwnerAdmin(session)) return NextResponse.json(updated);
  return NextResponse.json({
    ...updated,
    items: updated.items.map(({ costPrice: _costPrice, ...item }) => item),
  });
}

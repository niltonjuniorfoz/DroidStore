import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { sendPaidOrderEmail } from "../../../../src/lib/orderEmail";
import { shouldRestock } from "../../../../src/lib/orderStatus";
import { restoreOrderInventory } from "../../../../src/lib/orderInventory";

function validSignature(req: Request, paymentId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")));
  if (!parts.ts || !parts.v1 || !requestId) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = parts.v1.toLowerCase();
  return expected.length === received.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({})) as {
      type?: string;
      data?: { id?: string | number };
    };
    const type = body.type ?? url.searchParams.get("type");
    const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
    if (type !== "payment" || !id) return new NextResponse("Evento ignorado", { status: 200 });
    if (!validSignature(req, id)) return new NextResponse("Assinatura inválida", { status: 401 });
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return new NextResponse("Gateway não configurado", { status: 503 });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    const payment = await new Payment(client).get({ id });
    const orderId = payment.external_reference;
    if (!orderId) return new NextResponse("Pedido ausente", { status: 400 });

    // O mesmo pagamento gera notificações em estados diferentes (approved -> refunded),
    // então a idempotência precisa ser por pagamento+status, não só por pagamento.
    const eventKey = `${id}:${payment.status ?? "unknown"}`;
    const alreadyProcessed = await prisma.paymentEvent.findFirst({
      where: { providerEventId: { in: [id, eventKey] }, status: payment.status ?? "unknown" },
    });
    if (alreadyProcessed) return new NextResponse("OK", { status: 200 });

    const approvedNow = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");

      await tx.paymentEvent.create({
        data: { providerEventId: eventKey, orderId, status: payment.status ?? "unknown" },
      });

      if (payment.status === "approved" && order.status === "PENDING") {
        // Taxa real cobrada pelo gateway neste pagamento (para a margem líquida).
        const gatewayFeeBrl = (payment.fee_details ?? []).reduce(
          (total, fee) => total + Number(fee.amount ?? 0),
          0,
        );
        await tx.order.update({
          where: { id: orderId },
          data: { status: "PAID", ...(gatewayFeeBrl > 0 ? { gatewayFeeBrl } : {}) },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: "PENDING",
            toStatus: "PAID",
            note: "Pagamento confirmado pelo Mercado Pago.",
          },
        });
        return true;
      }

      // Estorno ou chargeback depois do pagamento: pedido vira REFUNDED.
      // Estoque só volta sozinho se o aparelho ainda não saiu (PENDING/PAID) —
      // devolução física após envio é lançada manualmente no estoque.
      if (
        ["refunded", "charged_back"].includes(payment.status ?? "") &&
        ["PAID", "SHIPPED", "DELIVERED"].includes(order.status)
      ) {
        if (shouldRestock(order.status, "REFUNDED")) {
          await restoreOrderInventory(tx, {
            inventoryReserved: order.inventoryReserved,
            items: order.items,
            note: `Reembolso do pedido #${orderId.slice(0, 8).toUpperCase()}`,
          });
        }
        await tx.order.update({
          where: { id: orderId },
          data: { status: "REFUNDED", cancelledAt: new Date() },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: "REFUNDED",
            note: payment.status === "charged_back"
              ? "Chargeback registrado pelo Mercado Pago."
              : "Pagamento estornado pelo Mercado Pago.",
          },
        });
        return false;
      }

      if (["cancelled", "rejected"].includes(payment.status ?? "") && order.status === "PENDING") {
        await restoreOrderInventory(tx, {
          inventoryReserved: order.inventoryReserved,
          items: order.items,
          note: `Pagamento recusado/cancelado no pedido #${orderId.slice(0, 8).toUpperCase()}`,
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: "PENDING",
            toStatus: "CANCELLED",
            note: "Pagamento recusado ou cancelado pelo Mercado Pago.",
          },
        });
      }
      return false;
    }, { isolationLevel: "Serializable" });

    if (approvedNow) await sendPaidOrderEmail(orderId);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error", error);
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return new NextResponse("Pedido não encontrado", { status: 404 });
    }
    return new NextResponse("Falha ao processar webhook", { status: 500 });
  }
}

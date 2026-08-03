import type { Order, OrderItem, Product, SiteContent, User, Variant } from "@prisma/client";
import prisma from "./prisma";
import { reservationHours } from "./expireOrders";

const money = (value: unknown) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);

type OrderWithRelations = Order & {
  user: User;
  items: Array<OrderItem & { variant: Variant & { product: Product } }>;
};

type EmailTheme = {
  badge: string;
  title: string;
  intro: string;
  totalLabel: string;
  extraHtml?: string;
};

function renderOrderEmail(order: OrderWithRelations, content: SiteContent, theme: EmailTheme) {
  const storeName = content.storeName || "Aura Tech";
  const items = order.items.map((item) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #e8ece9;color:#1e2923;font-size:14px;line-height:1.45">
        <strong style="display:block">${escapeHtml(item.variant.product.name)}</strong>
        <span style="color:#6b756f;font-size:12px">${escapeHtml([item.variant.storage, item.variant.color, item.variant.condition.replaceAll("_", " ")].filter(Boolean).join(" | "))}</span>
      </td>
      <td style="padding:14px 8px;border-bottom:1px solid #e8ece9;text-align:center;color:#55605a;font-size:13px">${item.quantity}</td>
      <td style="padding:14px 0;border-bottom:1px solid #e8ece9;text-align:right;color:#1e2923;font-size:14px;font-weight:700;white-space:nowrap">${money(Number(item.price) * item.quantity)}</td>
    </tr>`).join("");
  const address = [order.shippingStreet, order.shippingNumber, order.shippingComplement, order.shippingNeighborhood, order.shippingCity, order.shippingState, order.shippingZipCode].filter(Boolean).join(", ");
  const companyLine = [content.companyLegalName, content.companyTaxId, content.companyCity, content.companyState].filter(Boolean).join(" | ");
  const customerName = order.user.name?.trim() || "cliente";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1e2923">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f4;padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe5e1;border-radius:8px;overflow:hidden">
        <tr><td style="padding:28px 30px 24px;text-align:center;border-top:5px solid #ff7900">
          <div style="color:#ff7900;font-size:12px;font-weight:800;letter-spacing:1px">${escapeHtml(theme.badge)}</div>
          <h1 style="margin:10px 0 8px;font-size:25px;line-height:1.25;color:#17211c">${theme.title.replace("{name}", escapeHtml(customerName))}</h1>
          <p style="margin:0;color:#647069;font-size:14px;line-height:1.6">${escapeHtml(theme.intro)}</p>
        </td></tr>
        <tr><td style="padding:0 30px"><div style="height:1px;background:#e4e9e6"></div></td></tr>
        <tr><td style="padding:22px 30px">
          <table role="presentation" width="100%"><tr><td><span style="display:block;color:#7a847f;font-size:11px;text-transform:uppercase">Pedido</span><strong style="font-size:15px">#${escapeHtml(order.id.slice(0, 8).toUpperCase())}</strong></td><td align="right"><span style="display:block;color:#7a847f;font-size:11px;text-transform:uppercase">Pagamento</span><strong style="font-size:15px">${escapeHtml(order.paymentMethod)}</strong></td></tr></table>
        </td></tr>
        ${theme.extraHtml ?? ""}
        <tr><td style="padding:0 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><thead><tr><th align="left" style="padding:10px 0;border-top:1px solid #e4e9e6;border-bottom:1px solid #e4e9e6;color:#68736d;font-size:11px;text-transform:uppercase">Produto</th><th style="padding:10px 8px;border-top:1px solid #e4e9e6;border-bottom:1px solid #e4e9e6;color:#68736d;font-size:11px;text-transform:uppercase">Qtd.</th><th align="right" style="padding:10px 0;border-top:1px solid #e4e9e6;border-bottom:1px solid #e4e9e6;color:#68736d;font-size:11px;text-transform:uppercase">Valor</th></tr></thead><tbody>${items}</tbody></table></td></tr>
        <tr><td style="padding:20px 30px"><table role="presentation" width="100%"><tr><td style="color:#647069;font-size:13px">${escapeHtml(theme.totalLabel)}</td><td align="right" style="color:#17211c;font-size:23px;font-weight:800">${money(order.totalAmount)}</td></tr></table></td></tr>
        ${address ? `<tr><td style="padding:0 30px"><div style="height:1px;background:#e4e9e6"></div><div style="padding:20px 0"><strong style="display:block;font-size:13px;margin-bottom:6px">Endereço de entrega</strong><span style="color:#647069;font-size:13px;line-height:1.6">${escapeHtml(address)}</span></div></td></tr>` : ""}
        <tr><td style="padding:22px 30px;text-align:center;background:#fafbfa;border-top:1px solid #e4e9e6"><strong style="display:block;font-size:14px">${escapeHtml(storeName)}</strong>${companyLine ? `<span style="display:block;margin-top:5px;color:#7a847f;font-size:11px">${escapeHtml(companyLine)}</span>` : ""}<p style="margin:12px 0 0;color:#7a847f;font-size:11px;line-height:1.5">Este é um e-mail automático sobre uma compra realizada em nossa loja.</p></td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

type SendResult = { sent: boolean; reason?: string };

async function loadEmailContext(orderId: string) {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  if (!apiKey) return null;
  const [order, content] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: { include: { variant: { include: { product: true } } } } },
    }),
    prisma.siteContent.findUnique({ where: { id: "main" } }),
  ]);
  if (!order || !content?.transactionalEmailEnabled || !content.transactionalFromEmail?.trim()) return null;
  return { apiKey, order: order as OrderWithRelations, content };
}

async function deliver(
  context: NonNullable<Awaited<ReturnType<typeof loadEmailContext>>>,
  subject: string,
  html: string,
  idempotencyKey: string,
): Promise<void> {
  const { apiKey, order, content } = context;
  const storeName = content.storeName || "Aura Tech";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: `${content.transactionalFromName || storeName} <${content.transactionalFromEmail!.trim()}>`,
      to: [order.user.email],
      subject,
      html,
      ...(content.transactionalReplyTo ? { reply_to: content.transactionalReplyTo } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

// Reivindica a flag de envio de forma atômica; devolve função de rollback.
async function claimFlag(orderId: string, column: "paidEmailSentAt" | "createdEmailSentAt" | "shippedEmailSentAt") {
  const claimedAt = new Date();
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, [column]: null },
    data: { [column]: claimedAt },
  });
  if (!claimed.count) return null;
  return async () => {
    await prisma.order.updateMany({ where: { id: orderId, [column]: claimedAt }, data: { [column]: null } });
  };
}

export async function sendPaidOrderEmail(orderId: string): Promise<SendResult> {
  const context = await loadEmailContext(orderId);
  if (!context) return { sent: false, reason: "not-configured" };
  if (context.order.status !== "PAID" || context.order.paidEmailSentAt) return { sent: false, reason: "not-eligible" };

  const release = await claimFlag(orderId, "paidEmailSentAt");
  if (!release) return { sent: false, reason: "already-sent" };
  try {
    const html = renderOrderEmail(context.order, context.content, {
      badge: "COMPRA APROVADA",
      title: "Parabéns, {name}!",
      intro: "Seu pagamento foi confirmado e o pedido já está sendo preparado para embalagem.",
      totalLabel: "Total aprovado",
    });
    await deliver(context, `Pagamento aprovado - pedido #${orderId.slice(0, 8).toUpperCase()}`, html, `paid-order-${orderId}`);
    return { sent: true };
  } catch (error) {
    await release();
    console.error("Paid order email error", error);
    return { sent: false, reason: "send-failed" };
  }
}

export async function sendOrderCreatedEmail(orderId: string): Promise<SendResult> {
  const context = await loadEmailContext(orderId);
  if (!context) return { sent: false, reason: "not-configured" };
  if (context.order.status !== "PENDING" || context.order.createdEmailSentAt) return { sent: false, reason: "not-eligible" };

  const release = await claimFlag(orderId, "createdEmailSentAt");
  if (!release) return { sent: false, reason: "already-sent" };
  try {
    const hours = reservationHours();
    const html = renderOrderEmail(context.order, context.content, {
      badge: "PEDIDO RECEBIDO",
      title: "Recebemos seu pedido, {name}!",
      intro: "Agora é só concluir o pagamento para garantirmos a separação do seu aparelho.",
      totalLabel: "Total a pagar",
      extraHtml: `<tr><td style="padding:0 30px 6px"><div style="background:#fff7ee;border:1px solid #ffd9ad;border-radius:8px;padding:14px 16px;color:#8a5200;font-size:13px;line-height:1.6"><strong style="display:block;margin-bottom:4px">Aguardando pagamento</strong>Sua reserva fica garantida por ${hours} horas. Se o pagamento não for confirmado nesse prazo, o pedido é cancelado automaticamente e o valor não é cobrado.</div></td></tr>`,
    });
    await deliver(context, `Recebemos seu pedido #${orderId.slice(0, 8).toUpperCase()}`, html, `created-order-${orderId}`);
    return { sent: true };
  } catch (error) {
    await release();
    console.error("Created order email error", error);
    return { sent: false, reason: "send-failed" };
  }
}

export async function sendShippedOrderEmail(orderId: string): Promise<SendResult> {
  const context = await loadEmailContext(orderId);
  if (!context) return { sent: false, reason: "not-configured" };
  if (context.order.status !== "SHIPPED" || context.order.shippedEmailSentAt) return { sent: false, reason: "not-eligible" };

  const release = await claimFlag(orderId, "shippedEmailSentAt");
  if (!release) return { sent: false, reason: "already-sent" };
  try {
    const tracking = context.order.trackingCode?.trim();
    const html = renderOrderEmail(context.order, context.content, {
      badge: "PEDIDO A CAMINHO",
      title: "Seu pedido foi enviado, {name}!",
      intro: "O aparelho saiu para entrega. Acompanhe o transporte pelo código de rastreio abaixo.",
      totalLabel: "Total do pedido",
      extraHtml: tracking
        ? `<tr><td style="padding:0 30px 6px"><div style="background:#eef6ff;border:1px solid #bcdcff;border-radius:8px;padding:14px 16px;color:#0f4c81;font-size:13px;line-height:1.6"><strong style="display:block;margin-bottom:4px">Código de rastreio</strong><span style="font-size:16px;font-weight:800;letter-spacing:1px">${escapeHtml(tracking)}</span></div></td></tr>`
        : undefined,
    });
    await deliver(context, `Pedido #${orderId.slice(0, 8).toUpperCase()} enviado`, html, `shipped-order-${orderId}`);
    return { sent: true };
  } catch (error) {
    await release();
    console.error("Shipped order email error", error);
    return { sent: false, reason: "send-failed" };
  }
}

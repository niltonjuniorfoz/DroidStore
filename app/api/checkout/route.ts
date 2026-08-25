import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";
import { auth } from "../../../auth";
import prisma from "../../../src/lib/prisma";
import { isBrazilState } from "../../../src/lib/brazil";
import { expireStaleOrders } from "../../../src/lib/expireOrders";
import { RATE_LIMITED_MESSAGE, clientIp, rateLimit } from "../../../src/lib/rateLimit";
import { sendOrderCreatedEmail } from "../../../src/lib/orderEmail";
import {
  ProductUnavailableError,
  recordOrderSaleMovements,
  reserveVariantForOrder,
} from "../../../src/lib/orderInventory";
import { normalizeStoreMode, reservesInventory } from "../../../src/lib/storeMode";

const checkoutSchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(5),
  })).min(1).max(20),
  shippingAddress: z.object({
    zipCode: z.string().regex(/^\d{8}$/),
    street: z.string().min(2).max(120),
    number: z.string().min(1).max(20),
    complement: z.string().max(80).optional(),
    neighborhood: z.string().min(2).max(80),
    city: z.string().min(2).max(80),
    state: z.string().length(2).transform((value) => value.toUpperCase()).refine(isBrazilState, "Selecione um estado brasileiro válido."),
  }),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }

    // Flood de pedidos PENDING reserva estoque; freio por usuário e por IP.
    const limited = await rateLimit(`checkout:${userId}:${clientIp(req)}`, 10, 10 * 60);
    if (!limited.ok) {
      return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
    }

    const parsed = checkoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados do checkout inválidos." }, { status: 400 });
    }

    // Libera estoque preso em reservas abandonadas antes de tentar reservar.
    await expireStaleOrders().catch((error) => console.error("Expiração de reservas falhou", error));

    const content = await prisma.siteContent.findUnique({ where: { id: "main" } });
    const pixDiscount = Math.min(30, Math.max(0, content?.pixDiscount ?? 10));
    const discountFactor = (100 - pixDiscount) / 100;
    const shipping = parsed.data.shippingAddress;

    const order = await prisma.$transaction(async (tx) => {
      const transactionalContent = await tx.siteContent.findUnique({
        where: { id: "main" },
        select: { storeMode: true },
      });
      const storeMode = normalizeStoreMode(transactionalContent?.storeMode);
      const inventoryReserved = reservesInventory(storeMode);
      const variants = await tx.variant.findMany({
        where: {
          id: { in: parsed.data.items.map((item) => item.variantId) },
          product: { active: true },
        },
        include: { product: true },
      });
      if (variants.length !== parsed.data.items.length) throw new Error("PRODUCT_NOT_FOUND");

      let totalAmount = 0;
      const orderItems = [];
      for (const item of parsed.data.items) {
        const variant = variants.find((candidate) => candidate.id === item.variantId)!;
        await reserveVariantForOrder(tx, {
          variant: {
            id: variant.id,
            stock: variant.stock,
            dropshipAvailable: variant.dropshipAvailable,
            productName: variant.product.name,
          },
          quantity: item.quantity,
          storeMode,
        });
        // Desconto PIX do produto vence o da loja quando configurado.
        const productPix = variant.product.pixDiscountPct;
        const itemFactor = productPix === null || productPix === undefined
          ? discountFactor
          : (100 - Math.min(90, Math.max(0, productPix))) / 100;
        const discountedPrice = Math.round(Number(variant.price) * itemFactor * 100) / 100;
        totalAmount += discountedPrice * item.quantity;
        orderItems.push({
          variantId: variant.id,
          quantity: item.quantity,
          price: discountedPrice,
          costPrice: variant.costPrice,
        });
      }

      const created = await tx.order.create({
        data: {
          userId,
          totalAmount: Math.round(totalAmount * 100) / 100,
          status: "PENDING",
          paymentMethod: "PIX",
          inventoryReserved,
          shippingZipCode: shipping.zipCode,
          shippingStreet: shipping.street,
          shippingNumber: shipping.number,
          shippingComplement: shipping.complement || null,
          shippingNeighborhood: shipping.neighborhood,
          shippingCity: shipping.city,
          shippingState: shipping.state.toUpperCase(),
          items: { create: orderItems },
          statusHistory: {
            create: { toStatus: "PENDING", note: "Pedido criado e aguardando pagamento." },
          },
        },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });

      await recordOrderSaleMovements(tx, {
        orderId: created.id,
        inventoryReserved,
        items: created.items,
      });
      return created;
    }, { isolationLevel: "Serializable" });

    await sendOrderCreatedEmail(order.id).catch((error) => console.error("E-mail de pedido criado falhou", error));

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN || !process.env.APP_URL) {
      return NextResponse.json({
        orderId: order.id,
        demoMode: true,
        message: "Pedido reservado. No modo de teste, confirme o pagamento pelo painel administrativo.",
      });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    const preference = new Preference(client);
    const payment = await preference.create({
      body: {
        items: order.items.map((item) => ({
          id: item.variantId,
          title: item.variant.product.name,
          quantity: item.quantity,
          unit_price: Number(item.price),
          currency_id: "BRL",
        })),
        external_reference: order.id,
        back_urls: {
          success: `${process.env.APP_URL}/checkout/sucesso`,
          failure: `${process.env.APP_URL}/checkout/erro`,
          pending: `${process.env.APP_URL}/checkout/pendente`,
        },
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
        auto_return: "approved",
      },
    });

    return NextResponse.json({
      preferenceId: payment.id,
      orderId: order.id,
      checkoutUrl: payment.init_point ?? payment.sandbox_init_point,
    });
  } catch (error) {
    console.error("Checkout error", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Produto indisponível." }, { status: 400 });
    }
    if (error instanceof ProductUnavailableError) {
      const detail = error.reason === "OUT_OF_STOCK"
        ? `Estoque insuficiente para ${error.productName}.`
        : `${error.productName} está indisponível no fornecedor.`;
      return NextResponse.json({ error: detail }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível concluir o pedido." }, { status: 500 });
  }
}

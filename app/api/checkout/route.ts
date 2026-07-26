import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";
import { auth } from "../../../auth";
import prisma from "../../../src/lib/prisma";

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
    state: z.string().length(2),
  }),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }

    const parsed = checkoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados do checkout inválidos." }, { status: 400 });
    }

    const content = await prisma.siteContent.findUnique({ where: { id: "main" } });
    const pixDiscount = Math.min(30, Math.max(0, content?.pixDiscount ?? 10));
    const discountFactor = (100 - pixDiscount) / 100;
    const shipping = parsed.data.shippingAddress;

    const order = await prisma.$transaction(async (tx) => {
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
        const reserved = await tx.variant.updateMany({
          where: { id: variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) throw new Error(`OUT_OF_STOCK:${variant.product.name}`);
        const discountedPrice = Math.round(Number(variant.price) * discountFactor * 100) / 100;
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

      await tx.stockMovement.createMany({
        data: created.items.map((item) => ({
          variantId: item.variantId,
          type: "SALE" as const,
          quantity: -item.quantity,
          note: `Reserva do pedido #${created.id.slice(0, 8).toUpperCase()}`,
        })),
      });
      return created;
    }, { isolationLevel: "Serializable" });

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
    if (message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ error: `Estoque insuficiente para ${message.slice(13)}.` }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível concluir o pedido." }, { status: 500 });
  }
}

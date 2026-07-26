import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const orders = await prisma.order.findMany({
    take: 250,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          variant: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        },
      },
      paymentEvents: { orderBy: { createdAt: "desc" }, take: 3 },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (isOwnerAdmin(session)) {
    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        costTotal: order.items.reduce(
          (total, item) => total + Number(item.costPrice) * item.quantity,
          0,
        ),
        grossProfit:
          Number(order.totalAmount) -
          order.items.reduce((total, item) => total + Number(item.costPrice) * item.quantity, 0),
      })),
    );
  }

  return NextResponse.json(
    orders.map((order) => ({
      ...order,
      items: order.items.map(({ costPrice: _costPrice, ...item }) => item),
    })),
  );
}

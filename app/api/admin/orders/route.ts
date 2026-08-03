import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { calculateGrossProfit } from "../../../../src/lib/profit";
import { expireStaleOrders } from "../../../../src/lib/expireOrders";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  await expireStaleOrders().catch((error) => console.error("Expiração de reservas falhou", error));

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
      orders.map((order) => {
        const costTotal = order.items.reduce(
          (total, item) => total + Number(item.costPrice) * item.quantity,
          0,
        );
        return {
          ...order,
          costTotal,
          grossProfit: calculateGrossProfit(Number(order.totalAmount), costTotal).grossProfit,
        };
      }),
    );
  }

  return NextResponse.json(
    orders.map((order) => ({
      ...order,
      items: order.items.map(({ costPrice: _costPrice, ...item }) => item),
    })),
  );
}

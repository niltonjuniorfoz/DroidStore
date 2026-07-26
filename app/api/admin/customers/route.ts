import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      addresses: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, totalAmount: true, createdAt: true },
      },
    },
  });
  return NextResponse.json(
    customers.map(({ password: _password, ...customer }) => ({
      ...customer,
      orderCount: customer.orders.length,
      totalSpent: customer.orders
        .filter((order) => ["PAID", "SHIPPED", "DELIVERED"].includes(order.status))
        .reduce((total, order) => total + Number(order.totalAmount), 0),
    })),
  );
}

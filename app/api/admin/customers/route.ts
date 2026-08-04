import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/admin";

export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().slice(0, 80);
  const take = Math.min(500, Math.max(1, Number(searchParams.get("take")) || 200));
  const customers = await prisma.user.findMany({
    take,
    where: {
      role: "CUSTOMER",
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { cpf: { contains: query } },
            ],
          }
        : {}),
    },
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

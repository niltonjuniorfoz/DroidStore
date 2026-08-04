import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { calculateGrossProfit } from "../../../../src/lib/profit";
import { expireStaleOrders } from "../../../../src/lib/expireOrders";

const VALID_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

function dateFloor(filter: string | null): Date | undefined {
  const now = new Date();
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "7days") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return undefined;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  await expireStaleOrders().catch((error) => console.error("Expiração de reservas falhou", error));

  // Filtros aplicados no banco: com muitos pedidos, o take não esconde os antigos.
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.find((valid) => valid === statusParam);
  const since = dateFloor(searchParams.get("period"));
  const query = searchParams.get("q")?.trim().slice(0, 80);
  const take = Math.min(500, Math.max(1, Number(searchParams.get("take")) || 250));

  const orders = await prisma.order.findMany({
    take,
    where: {
      ...(status ? { status } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              { user: { name: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
              { shippingCity: { contains: query, mode: "insensitive" } },
              { trackingCode: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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

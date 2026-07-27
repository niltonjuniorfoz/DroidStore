import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";

const SALES_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const owner = isOwnerAdmin(session);

  const [salesOrders, recentOrders, variants, customerCount, productCount, last7DaysOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: [...SALES_STATUSES] },
        createdAt: { gte: previousStart },
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
    }),
    prisma.variant.findMany({ include: { product: { select: { id: true, name: true, active: true, imageUrl: true } } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { active: true } }),
    prisma.order.findMany({
      where: {
        status: { in: [...SALES_STATUSES] },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, totalAmount: true },
    }),
  ]);

  const currentOrders = salesOrders.filter((order) => order.createdAt >= currentStart);
  const previousOrders = salesOrders.filter((order) => order.createdAt < currentStart);
  const revenueOf = (orders: typeof salesOrders) =>
    orders.reduce((total, order) => total + Number(order.totalAmount), 0);
  const costOf = (orders: typeof salesOrders) =>
    orders.reduce(
      (total, order) =>
        total + order.items.reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0),
      0,
    );
  const revenue = revenueOf(currentOrders);
  const previousRevenue = revenueOf(previousOrders);
  const costs = costOf(currentOrders);
  const grossProfit = revenue - costs;
  const averageTicket = currentOrders.length ? revenue / currentOrders.length : 0;
  const inventoryValue = variants.reduce(
    (total, variant) => total + Number(variant.price) * variant.stock,
    0,
  );

  const lowStock = variants.filter(
    (variant) => variant.product.active && variant.stock <= variant.lowStockThreshold,
  );

  const topProductMap = new Map<string, { id: string; name: string; units: number; revenue: number }>();
  for (const order of currentOrders) {
    for (const item of order.items) {
      const product = item.variant.product;
      const current = topProductMap.get(product.id) ?? {
        id: product.id,
        name: product.name,
        units: 0,
        revenue: 0,
      };
      current.units += item.quantity;
      current.revenue += Number(item.price) * item.quantity;
      topProductMap.set(product.id, current);
    }
  }

  // Vendas dos últimos 7 dias para mini-gráfico
  const dailySales: Array<{ date: string; label: string; revenue: number; orders: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });

    const dayOrders = last7DaysOrders.filter((o) => o.createdAt.toISOString().split("T")[0] === dateStr);
    const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    dailySales.push({ date: dateStr, label: dayLabel, revenue: dayRevenue, orders: dayOrders.length });
  }

  const response = {
    period: { start: currentStart, end: now },
    metrics: {
      revenue,
      previousRevenue,
      revenueChange: previousRevenue
        ? ((revenue - previousRevenue) / previousRevenue) * 100
        : revenue > 0 ? 100 : 0,
      orders: currentOrders.length,
      previousOrders: previousOrders.length,
      averageTicket,
      customers: customerCount,
      products: productCount,
      lowStock: lowStock.length,
      inventoryValue,
      ...(owner
        ? {
            costs,
            grossProfit,
            grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
            inventoryCost: variants.reduce(
              (total, variant) => total + Number(variant.costPrice) * variant.stock,
              0,
            ),
          }
        : {}),
    },
    dailySales,
    recentOrders,
    lowStockItems: lowStock.map((variant) => ({
      id: variant.id,
      productId: variant.product.id,
      name: variant.product.name,
      imageUrl: variant.product.imageUrl,
      storage: variant.storage,
      color: variant.color,
      stock: variant.stock,
      threshold: variant.lowStockThreshold,
      price: Number(variant.price),
    })),
    topProducts: [...topProductMap.values()].sort((a, b) => b.units - a.units).slice(0, 6),
    ownerView: owner,
  };

  return NextResponse.json(response);
}

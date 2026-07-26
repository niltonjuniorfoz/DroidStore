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
  const owner = isOwnerAdmin(session);

  const [salesOrders, recentOrders, variants, customerCount, productCount] = await Promise.all([
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
    prisma.variant.findMany({ include: { product: { select: { id: true, name: true, active: true } } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { active: true } }),
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
      customers: customerCount,
      products: productCount,
      lowStock: lowStock.length,
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
    recentOrders,
    lowStockItems: lowStock.slice(0, 8).map((variant) => ({
      id: variant.id,
      name: variant.product.name,
      storage: variant.storage,
      color: variant.color,
      stock: variant.stock,
      threshold: variant.lowStockThreshold,
    })),
    topProducts: [...topProductMap.values()].sort((a, b) => b.units - a.units).slice(0, 6),
    ownerView: owner,
  };

  return NextResponse.json(response);
}

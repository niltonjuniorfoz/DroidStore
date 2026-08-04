import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../src/lib/admin";
import { calculateGrossProfit } from "../../../../src/lib/profit";

// Filtro de vendas confirmadas, com cast para o enum do Postgres.
const SALES = Prisma.sql`ARRAY['PAID','SHIPPED','DELIVERED']::"OrderStatus"[]`;

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const owner = isOwnerAdmin(session);

  // Tudo agregado no banco: nada de carregar pedidos/variantes inteiros na memória.
  const [periodRows, costRows, inventoryRows, lowStockRows, lowStockCountRows, topProductRows, dailyRows, recentOrders, customerCount, productCount] = await Promise.all([
    prisma.$queryRaw<Array<{ period: string; revenue: number; orders: number }>>`
      SELECT CASE WHEN "createdAt" >= ${currentStart} THEN 'current' ELSE 'previous' END AS period,
             COALESCE(SUM("totalAmount"), 0)::float AS revenue,
             COUNT(*)::int AS orders
      FROM "Order"
      WHERE status = ANY(${SALES}) AND "createdAt" >= ${previousStart}
      GROUP BY 1`,
    prisma.$queryRaw<Array<{ costs: number; fees: number }>>`
      SELECT COALESCE(SUM(oi."costPrice" * oi.quantity), 0)::float AS costs,
             COALESCE((SELECT SUM("gatewayFeeBrl") FROM "Order"
                       WHERE status = ANY(${SALES}) AND "createdAt" >= ${currentStart}), 0)::float AS fees
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status = ANY(${SALES}) AND o."createdAt" >= ${currentStart}`,
    prisma.$queryRaw<Array<{ value: number; cost: number }>>`
      SELECT COALESCE(SUM(price * stock), 0)::float AS value,
             COALESCE(SUM("costPrice" * stock), 0)::float AS cost
      FROM "Variant"`,
    prisma.$queryRaw<Array<{
      id: string; productId: string; name: string; imageUrl: string | null;
      storage: string | null; color: string | null; stock: number; threshold: number; price: number;
    }>>`
      SELECT v.id, p.id AS "productId", p.name, p."imageUrl", v.storage, v.color,
             v.stock, v."lowStockThreshold" AS threshold, v.price::float AS price
      FROM "Variant" v
      JOIN "Product" p ON p.id = v."productId"
      WHERE p.active = true AND v.stock <= v."lowStockThreshold"
      ORDER BY v.stock ASC, p.name ASC
      LIMIT 50`,
    prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM "Variant" v
      JOIN "Product" p ON p.id = v."productId"
      WHERE p.active = true AND v.stock <= v."lowStockThreshold"`,
    prisma.$queryRaw<Array<{ id: string; name: string; units: number; revenue: number }>>`
      SELECT p.id, p.name,
             SUM(oi.quantity)::int AS units,
             COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Variant" v ON v.id = oi."variantId"
      JOIN "Product" p ON p.id = v."productId"
      WHERE o.status = ANY(${SALES}) AND o."createdAt" >= ${currentStart}
      GROUP BY p.id, p.name
      ORDER BY units DESC
      LIMIT 6`,
    prisma.$queryRaw<Array<{ day: string; revenue: number; orders: number }>>`
      SELECT to_char("createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
             COALESCE(SUM("totalAmount"), 0)::float AS revenue,
             COUNT(*)::int AS orders
      FROM "Order"
      WHERE status = ANY(${SALES}) AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY 1`,
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { active: true } }),
  ]);

  // Visão de pregão diário + fila de ação (padrão Shopify Home / Seller Central):
  // o topo do painel responde "como está HOJE" e "o que fazer AGORA".
  const [todayRows, queueRows, methodRows] = await Promise.all([
    prisma.$queryRaw<Array<{ day: string; revenue: number; orders: number }>>`
      SELECT CASE WHEN ("createdAt" AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
                  THEN 'today' ELSE 'yesterday' END AS day,
             COALESCE(SUM("totalAmount"), 0)::float AS revenue,
             COUNT(*)::int AS orders
      FROM "Order"
      WHERE status = ANY(${SALES})
        AND ("createdAt" AT TIME ZONE 'America/Sao_Paulo')::date >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date - 1
      GROUP BY 1`,
    prisma.$queryRaw<Array<{ pending: number; toship: number; late: number; nophoto: number }>>`
      SELECT
        (SELECT COUNT(*) FROM "Order" WHERE status = 'PENDING')::int AS pending,
        (SELECT COUNT(*) FROM "Order" WHERE status = 'PAID')::int AS toship,
        (SELECT COUNT(*) FROM "Order" o WHERE o.status = 'PAID' AND EXISTS (
           SELECT 1 FROM "OrderStatusHistory" h
           WHERE h."orderId" = o.id AND h."toStatus" = 'PAID' AND h."createdAt" < NOW() - INTERVAL '24 hours'
        ))::int AS late,
        (SELECT COUNT(*) FROM "Product" WHERE active = true AND ("imageUrl" IS NULL OR "imageUrl" = ''))::int AS nophoto`,
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] }, createdAt: { gte: currentStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const current = periodRows.find((row) => row.period === "current") ?? { revenue: 0, orders: 0 };
  const previous = periodRows.find((row) => row.period === "previous") ?? { revenue: 0, orders: 0 };
  const revenue = current.revenue;
  const previousRevenue = previous.revenue;
  const costs = costRows[0]?.costs ?? 0;
  const gatewayFees = costRows[0]?.fees ?? 0;
  const { grossProfit, grossMargin } = calculateGrossProfit(revenue, costs);
  const averageTicket = current.orders ? revenue / current.orders : 0;
  const inventory = inventoryRows[0] ?? { value: 0, cost: 0 };

  // Preenche os dias sem venda para o mini-gráfico ficar contínuo.
  const dailyByDate = new Map(dailyRows.map((row) => [row.day, row]));
  const dailySales: Array<{ date: string; label: string; revenue: number; orders: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // en-CA gera YYYY-MM-DD; mesmo fuso usado na agregação SQL.
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", timeZone: "America/Sao_Paulo" });
    const found = dailyByDate.get(dateStr);
    dailySales.push({ date: dateStr, label: dayLabel, revenue: found?.revenue ?? 0, orders: found?.orders ?? 0 });
  }

  const response = {
    period: { start: currentStart, end: now },
    metrics: {
      revenue,
      previousRevenue,
      revenueChange: previousRevenue
        ? ((revenue - previousRevenue) / previousRevenue) * 100
        : revenue > 0 ? 100 : 0,
      orders: current.orders,
      previousOrders: previous.orders,
      averageTicket,
      customers: customerCount,
      products: productCount,
      lowStock: lowStockCountRows[0]?.total ?? lowStockRows.length,
      inventoryValue: inventory.value,
      ...(owner
        ? {
            costs,
            grossProfit,
            grossMargin,
            gatewayFees,
            netProfit: grossProfit - gatewayFees,
            inventoryCost: inventory.cost,
          }
        : {}),
    },
    today: {
      revenue: todayRows.find((row) => row.day === "today")?.revenue ?? 0,
      orders: todayRows.find((row) => row.day === "today")?.orders ?? 0,
      yesterdayRevenue: todayRows.find((row) => row.day === "yesterday")?.revenue ?? 0,
      yesterdayOrders: todayRows.find((row) => row.day === "yesterday")?.orders ?? 0,
    },
    actionQueue: {
      awaitingPayment: queueRows[0]?.pending ?? 0,
      toShip: queueRows[0]?.toship ?? 0,
      lateShipments: queueRows[0]?.late ?? 0,
      productsWithoutPhoto: queueRows[0]?.nophoto ?? 0,
      lowStock: lowStockCountRows[0]?.total ?? 0,
    },
    paymentMethods: methodRows.map((row) => ({
      method: row.paymentMethod,
      revenue: Number(row._sum.totalAmount ?? 0),
      orders: row._count,
    })).sort((a, b) => b.revenue - a.revenue),
    dailySales,
    recentOrders,
    lowStockItems: lowStockRows,
    topProducts: topProductRows,
    ownerView: owner,
  };

  return NextResponse.json(response);
}

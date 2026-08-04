import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";

const SALES = Prisma.sql`ARRAY['PAID','SHIPPED','DELIVERED']::"OrderStatus"[]`;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00-03:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

// Relatório por período livre: totais, curva ABC e giro de estoque.
// Contém custo e lucro — somente administrador proprietário.
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário vê os relatórios." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const from = parseDate(searchParams.get("from"), new Date(now.getTime() - 30 * DAY_MS));
  const toInclusive = parseDate(searchParams.get("to"), now);
  const to = new Date(toInclusive.getTime() + DAY_MS); // exclusivo no SQL
  if (from >= to) return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));

  const [totalsRows, abcRows, turnoverRows] = await Promise.all([
    prisma.$queryRaw<Array<{ revenue: number; orders: number; fees: number; cost: number }>>`
      SELECT COALESCE(SUM(o."totalAmount"), 0)::float AS revenue,
             COUNT(DISTINCT o.id)::int AS orders,
             COALESCE(SUM(o."gatewayFeeBrl"), 0)::float AS fees,
             COALESCE((SELECT SUM(oi."costPrice" * oi.quantity)
                       FROM "OrderItem" oi JOIN "Order" o2 ON o2.id = oi."orderId"
                       WHERE o2.status = ANY(${SALES}) AND o2."createdAt" >= ${from} AND o2."createdAt" < ${to}), 0)::float AS cost
      FROM "Order" o
      WHERE o.status = ANY(${SALES}) AND o."createdAt" >= ${from} AND o."createdAt" < ${to}`,
    prisma.$queryRaw<Array<{ id: string; name: string; units: number; revenue: number; cost: number }>>`
      SELECT p.id, p.name,
             SUM(oi.quantity)::int AS units,
             COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue,
             COALESCE(SUM(oi."costPrice" * oi.quantity), 0)::float AS cost
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Variant" v ON v.id = oi."variantId"
      JOIN "Product" p ON p.id = v."productId"
      WHERE o.status = ANY(${SALES}) AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 30`,
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; units: number }>>`
      SELECT p.id, p.name,
             COALESCE(SUM(v.stock), 0)::int AS stock,
             COALESCE((SELECT SUM(oi.quantity)
                       FROM "OrderItem" oi
                       JOIN "Order" o ON o.id = oi."orderId"
                       JOIN "Variant" v2 ON v2.id = oi."variantId"
                       WHERE v2."productId" = p.id AND o.status = ANY(${SALES})
                         AND o."createdAt" >= ${from} AND o."createdAt" < ${to}), 0)::int AS units
      FROM "Product" p
      JOIN "Variant" v ON v."productId" = p.id
      WHERE p.active = true
      GROUP BY p.id, p.name
      HAVING COALESCE(SUM(v.stock), 0) > 0
      ORDER BY units DESC, stock DESC
      LIMIT 50`,
  ]);

  const totals = totalsRows[0] ?? { revenue: 0, orders: 0, fees: 0, cost: 0 };
  return NextResponse.json({
    period: { from, to: toInclusive, days: periodDays },
    totals: {
      ...totals,
      profit: totals.revenue - totals.fees - totals.cost,
      averageTicket: totals.orders ? totals.revenue / totals.orders : 0,
    },
    abc: abcRows.map((row) => ({ ...row, profit: row.revenue - row.cost })),
    turnover: turnoverRows.map((row) => {
      const perDay = row.units / periodDays;
      return {
        ...row,
        // Dias para esgotar o estoque atual no ritmo de venda do período.
        daysOfStock: perDay > 0 ? Math.round(row.stock / perDay) : null,
      };
    }),
  });
}

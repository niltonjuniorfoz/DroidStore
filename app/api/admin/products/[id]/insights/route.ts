import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "../../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../../src/lib/admin";
import {
  breakEvenPrice,
  feesFromPercent,
  installmentLadder,
  marginOf,
  maxPurchasePrice,
  netAfterFee,
  pixPrice,
  reorderSuggestion,
} from "../../../../../../src/lib/pricing";

const SALES = Prisma.sql`ARRAY['PAID','SHIPPED','DELIVERED']::"OrderStatus"[]`;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Dossiê financeiro e comercial do produto: compra, venda, procura,
 * precificação e recomendações. Custos só para o administrador proprietário.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const owner = isOwnerAdmin(session);
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      active: true,
      variants: { select: { id: true, price: true, costPrice: true, stock: true, lowStockThreshold: true } },
      _count: { select: { favorites: true } },
    },
  });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const variantIds = product.variants.map((variant) => variant.id);
  const now = Date.now();

  const [salesRows, monthlyRows, viewRows, lotRows, movementRows, priceLog, content] = await Promise.all([
    prisma.$queryRaw<Array<{
      units: number; orders: number; revenue: number; cost: number;
      avgprice: number; minprice: number; maxprice: number;
      firstsale: Date | null; lastsale: Date | null; fees: number;
    }>>`
      SELECT COALESCE(SUM(oi.quantity), 0)::int AS units,
             COUNT(DISTINCT o.id)::int AS orders,
             COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue,
             COALESCE(SUM(oi."costPrice" * oi.quantity), 0)::float AS cost,
             COALESCE(AVG(oi.price), 0)::float AS avgprice,
             COALESCE(MIN(oi.price), 0)::float AS minprice,
             COALESCE(MAX(oi.price), 0)::float AS maxprice,
             MIN(o."createdAt") AS firstsale,
             MAX(o."createdAt") AS lastsale,
             COALESCE(SUM(o."gatewayFeeBrl"), 0)::float AS fees
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi."variantId" = ANY(${variantIds}) AND o.status = ANY(${SALES})`,
    prisma.$queryRaw<Array<{ month: string; units: number; revenue: number }>>`
      SELECT to_char(o."createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month,
             SUM(oi.quantity)::int AS units,
             COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi."variantId" = ANY(${variantIds}) AND o.status = ANY(${SALES})
        AND o."createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Array<{ total: number; last30: number; last7: number }>>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days')::int AS last30,
             COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days')::int AS last7
      FROM "ProductView" WHERE "productId" = ${id}`,
    owner
      ? prisma.purchaseLot.findMany({
          where: { variantId: { in: variantIds } },
          orderBy: { purchasedAt: "asc" },
          select: { id: true, supplier: true, currency: true, unitCostFx: true, exchangeRate: true, quantity: true, unitCostBrl: true, purchasedAt: true },
        })
      : Promise.resolve([]),
    prisma.stockMovement.findMany({
      where: { variantId: { in: variantIds } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, type: true, quantity: true, note: true, createdAt: true },
    }),
    owner
      ? prisma.adminAuditLog.findMany({
          where: { entity: "Product", entityId: id, action: { in: ["product.update", "product.create"] } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, summary: true, after: true, actorEmail: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.siteContent.findUnique({
      where: { id: "main" },
      select: { pixDiscount: true, maxInstallments: true, pixFeePct: true, cardFeePct: true, cardInstallmentFeePct: true },
    }),
  ]);

  // Série mensal de visitas para cruzar procura x venda no gráfico.
  const viewMonthly = await prisma.$queryRaw<Array<{ month: string; views: number }>>`
    SELECT to_char("createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month, COUNT(*)::int AS views
    FROM "ProductView"
    WHERE "productId" = ${id} AND "createdAt" >= NOW() - INTERVAL '6 months'
    GROUP BY 1 ORDER BY 1`;

  const sales = salesRows[0] ?? { units: 0, orders: 0, revenue: 0, cost: 0, avgprice: 0, minprice: 0, maxprice: 0, firstsale: null, lastsale: null, fees: 0 };
  const views = viewRows[0] ?? { total: 0, last30: 0, last7: 0 };

  const price = Number(product.variants[0]?.price ?? 0);
  const cost = Number(product.variants[0]?.costPrice ?? 0);
  const stock = product.variants.reduce((total, variant) => total + variant.stock, 0);
  const pixDiscountPct = content?.pixDiscount ?? 10;
  const maxInstallments = content?.maxInstallments ?? 12;

  // Tempo de catálogo e ritmo de venda
  const daysInCatalog = Math.max(1, Math.floor((now - product.createdAt.getTime()) / DAY));
  const daysSinceLastSale = sales.lastsale ? Math.floor((now - new Date(sales.lastsale).getTime()) / DAY) : null;
  const unitsPerMonth = sales.units > 0 ? (sales.units / daysInCatalog) * 30 : 0;
  const daysOfStock = unitsPerMonth > 0 ? Math.round((stock / unitsPerMonth) * 30) : null;

  // Precificação com as taxas reais desta loja
  const feePercents = {
    pix: Number(content?.pixFeePct ?? 0.99),
    card: Number(content?.cardFeePct ?? 4.98),
    perInstallment: Number(content?.cardInstallmentFeePct ?? 2.08),
  };
  const fees = feesFromPercent(feePercents.pix, feePercents.card, feePercents.perInstallment);
  const pix = pixPrice(price, pixDiscountPct);
  const pixNet = netAfterFee(pix, fees.pix);
  const cardNet = netAfterFee(price, fees.cardBase);
  const ladder = installmentLadder(price, owner ? cost : 0, maxInstallments, fees);

  // Histórico de compra (custo real por lote)
  const lots = lotRows.map((lot) => ({
    id: lot.id,
    supplier: lot.supplier,
    currency: lot.currency,
    unitCostFx: Number(lot.unitCostFx),
    exchangeRate: Number(lot.exchangeRate),
    quantity: lot.quantity,
    unitCostBrl: Number(lot.unitCostBrl),
    purchasedAt: lot.purchasedAt,
  }));
  const totalBought = lots.reduce((total, lot) => total + lot.quantity, 0);
  const totalInvested = lots.reduce((total, lot) => total + lot.unitCostBrl * lot.quantity, 0);
  const purchase = owner
    ? {
        lots,
        firstCost: lots[0]?.unitCostBrl ?? null,
        lastCost: lots.length ? lots[lots.length - 1].unitCostBrl : null,
        avgCost: totalBought > 0 ? Math.round((totalInvested / totalBought) * 100) / 100 : null,
        totalBought,
        totalInvested: Math.round(totalInvested * 100) / 100,
        // Custo subiu ou caiu entre o primeiro e o último lote?
        costTrendPct: lots.length > 1 && lots[0].unitCostBrl > 0
          ? Math.round(((lots[lots.length - 1].unitCostBrl - lots[0].unitCostBrl) / lots[0].unitCostBrl) * 1000) / 10
          : null,
      }
    : null;

  // Margens sobre o custo atual
  const table = marginOf(price, cost);
  const pixMargin = marginOf(pixNet, cost);
  const cardMargin = marginOf(cardNet, cost);
  // Margem realizada: o que de fato aconteceu nas vendas passadas
  const realizedProfit = sales.revenue - sales.cost - sales.fees;

  const reorder = reorderSuggestion(unitsPerMonth, stock, 2);
  const conversionPct = views.total > 0 ? Math.round((sales.units / views.total) * 1000) / 10 : null;

  return NextResponse.json({
    ownerView: owner,
    product: {
      name: product.name,
      active: product.active,
      createdAt: product.createdAt,
      daysInCatalog,
      stock,
      favorites: product._count.favorites,
    },
    demand: {
      views: views.total,
      views30d: views.last30,
      views7d: views.last7,
      favorites: product._count.favorites,
      conversionPct, // visitas que viraram unidade vendida
      daysSinceLastSale,
      monthly: viewMonthly,
    },
    fees: feePercents,
    sales: {
      units: sales.units,
      orders: sales.orders,
      revenue: sales.revenue,
      avgPrice: sales.avgprice,
      minPrice: sales.minprice,
      maxPrice: sales.maxprice,
      firstSale: sales.firstsale,
      lastSale: sales.lastsale,
      unitsPerMonth: Math.round(unitsPerMonth * 10) / 10,
      monthly: monthlyRows,
      ...(owner ? { cost: sales.cost, fees: sales.fees, realizedProfit } : {}),
    },
    stockHealth: {
      stock,
      daysOfStock,
      lowStockThreshold: product.variants[0]?.lowStockThreshold ?? 0,
      unsold: Math.max(0, totalBought - sales.units),
    },
    pricing: {
      price,
      pixDiscountPct,
      pixPrice: pix,
      pixNet,
      cardPrice: price,
      cardNet,
      maxInstallments,
      ladder: owner ? ladder : ladder.map(({ profit: _p, marginPct: _m, netReceived: _n, ...row }) => row),
    },
    ...(owner
      ? {
          margins: {
            cost,
            table,
            pix: pixMargin,
            card: cardMargin,
            breakEvenPix: breakEvenPrice(cost, fees.pix),
            breakEvenCard: breakEvenPrice(cost, fees.cardBase),
          },
          guidance: {
            // Quanto pagar no próximo lote para manter a margem alvo
            maxPurchase30: maxPurchasePrice(pix, 30, fees.pix),
            maxPurchase20: maxPurchasePrice(pix, 20, fees.pix),
            maxPurchase15: maxPurchasePrice(pix, 15, fees.pix),
            ...reorder,
            investmentNeeded: purchase?.avgCost ? Math.round(reorder.unitsToBuy * purchase.avgCost * 100) / 100 : null,
            suggestedPriceForMargin30: cost > 0 ? Math.round((cost / 0.7 / (1 - fees.pix) / ((100 - pixDiscountPct) / 100)) * 100) / 100 : null,
          },
          purchase,
          priceLog,
        }
      : {}),
    movements: movementRows,
  });
}

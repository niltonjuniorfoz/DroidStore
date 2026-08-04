import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import prisma from "../../../../../src/lib/prisma";
import { isOwnerAdmin, requireAdmin } from "../../../../../src/lib/admin";
import { audit } from "../../../../../src/lib/audit";

// Exportação mensal de vendas para conferência/contador.
// Uma linha por pedido: bruto, taxa real do gateway, líquido, custo e lucro.
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isOwnerAdmin(session)) {
    return NextResponse.json({ error: "Somente o administrador proprietário exporta vendas." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // YYYY-MM
  const match = monthParam?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end }, status: { in: ["PAID", "SHIPPED", "DELIVERED", "REFUNDED"] } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { variant: { include: { product: { select: { name: true } } } } } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  const monthLabel = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const sales = workbook.addWorksheet("Vendas");
  sales.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Pedido", key: "id", width: 12 },
    { header: "Cliente", key: "customer", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Pagamento", key: "method", width: 12 },
    { header: "Bruto (R$)", key: "gross", width: 12 },
    { header: "Taxa gateway (R$)", key: "fee", width: 16 },
    { header: "Líquido (R$)", key: "net", width: 12 },
    { header: "Custo (R$)", key: "cost", width: 12 },
    { header: "Lucro (R$)", key: "profit", width: 12 },
  ];
  for (const order of orders) {
    const gross = Number(order.totalAmount);
    const fee = Number(order.gatewayFeeBrl ?? 0);
    const cost = order.items.reduce((total, item) => total + Number(item.costPrice) * item.quantity, 0);
    sales.addRow({
      date: order.createdAt.toLocaleDateString("pt-BR"),
      id: `#${order.id.slice(0, 8).toUpperCase()}`,
      customer: order.user.name ?? order.user.email,
      status: order.status,
      method: order.paymentMethod,
      gross,
      fee,
      net: gross - fee,
      cost,
      profit: gross - fee - cost,
    });
  }
  sales.getRow(1).font = { bold: true };

  // Curva ABC do mês: unidades e receita por produto, maior receita primeiro.
  const productMap = new Map<string, { name: string; units: number; revenue: number; cost: number }>();
  for (const order of orders) {
    if (order.status === "REFUNDED") continue;
    for (const item of order.items) {
      const name = item.variant.product.name;
      const entry = productMap.get(name) ?? { name, units: 0, revenue: 0, cost: 0 };
      entry.units += item.quantity;
      entry.revenue += Number(item.price) * item.quantity;
      entry.cost += Number(item.costPrice) * item.quantity;
      productMap.set(name, entry);
    }
  }
  const abc = workbook.addWorksheet("Produtos (ABC)");
  abc.columns = [
    { header: "Produto", key: "name", width: 40 },
    { header: "Unidades", key: "units", width: 10 },
    { header: "Receita (R$)", key: "revenue", width: 14 },
    { header: "Custo (R$)", key: "cost", width: 12 },
    { header: "Lucro (R$)", key: "profit", width: 12 },
  ];
  for (const entry of [...productMap.values()].sort((a, b) => b.revenue - a.revenue)) {
    abc.addRow({ ...entry, profit: entry.revenue - entry.cost });
  }
  abc.getRow(1).font = { bold: true };

  await audit(session, {
    action: "report.sales-export",
    entity: "Order",
    summary: `Exportação de vendas de ${monthLabel} (${orders.length} pedidos)`,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `vendas-${year}-${String(month + 1).padStart(2, "0")}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

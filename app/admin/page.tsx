"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, CircleDollarSign, PackageCheck, RefreshCw, TrendingUp, Users } from "lucide-react";

type Dashboard = {
  metrics: {
    revenue: number;
    previousRevenue: number;
    revenueChange: number;
    orders: number;
    previousOrders: number;
    customers: number;
    products: number;
    lowStock: number;
    costs?: number;
    grossProfit?: number;
    grossMargin?: number;
    inventoryCost?: number;
  };
  ownerView: boolean;
  recentOrders: Array<{
    id: string;
    status: string;
    totalAmount: string;
    createdAt: string;
    user: { name: string | null; email: string };
    _count: { items: number };
  }>;
  lowStockItems: Array<{ id: string; name: string; storage: string | null; stock: number; threshold: number }>;
  topProducts: Array<{ id: string; name: string; units: number; revenue: number }>;
};

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel: Record<string, string> = {
  PENDING: "Aguardando pagamento", PAID: "Pago", SHIPPED: "Enviado", DELIVERED: "Entregue", CANCELLED: "Cancelado",
};

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível carregar o painel.");
    else setData(body);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  if (loading) return <div className="admin-loading"><RefreshCw className="animate-spin" /> Atualizando indicadores...</div>;
  if (!data) return <div className="form-error">{error}</div>;
  const metrics = data.metrics;

  return <div className="admin-easy">
    <div className="admin-title">
      <div><span className="eyebrow">Operação em tempo real</span><h1>Visão geral</h1><p>Resultados calculados a partir dos pedidos e do estoque reais.</p></div>
      <button className="button ghost" onClick={() => void load()}><RefreshCw size={16} /> Atualizar</button>
    </div>
    {error && <div className="form-error">{error}</div>}

    <section className="metric-grid">
      <article className="metric-card accent">
        <span><CircleDollarSign /> Faturamento no mês</span>
        <strong>{money(metrics.revenue)}</strong>
        <small className={metrics.revenueChange >= 0 ? "positive" : "negative"}><TrendingUp /> {metrics.revenueChange.toFixed(1)}% versus mês anterior</small>
      </article>
      {data.ownerView && <article className="metric-card profit">
        <span><TrendingUp /> Lucro bruto no mês</span>
        <strong>{money(metrics.grossProfit)}</strong>
        <small>{metrics.grossMargin?.toFixed(1)}% de margem • custo {money(metrics.costs)}</small>
      </article>}
      <article className="metric-card">
        <span><PackageCheck /> Pedidos pagos no mês</span>
        <strong>{metrics.orders}</strong>
        <small>{metrics.previousOrders} no mês anterior</small>
      </article>
      <article className="metric-card">
        <span><Users /> Clientes cadastrados</span>
        <strong>{metrics.customers}</strong>
        <small>{metrics.products} produtos publicados</small>
      </article>
      <article className={`metric-card ${metrics.lowStock ? "warning" : ""}`}>
        <span><AlertTriangle /> Estoque baixo</span>
        <strong>{metrics.lowStock}</strong>
        <small>{metrics.lowStock ? "Variações precisam de reposição" : "Estoque dentro do limite"}</small>
      </article>
      {data.ownerView && <article className="metric-card">
        <span><Boxes /> Capital no estoque</span>
        <strong>{money(metrics.inventoryCost)}</strong>
        <small>Quantidade atual × preço de custo</small>
      </article>}
    </section>

    <section className="dashboard-grid">
      <article className="admin-data-card">
        <header><div><h2>Pedidos recentes</h2><p>Últimas movimentações da loja.</p></div><Link href="/admin/pedidos">Ver todos <ArrowUpRight /></Link></header>
        <div className="compact-list">
          {data.recentOrders.length === 0 && <p className="empty-inline">Nenhum pedido realizado ainda.</p>}
          {data.recentOrders.map((order) => <Link href="/admin/pedidos" key={order.id}>
            <div><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><span>{order.user.name ?? order.user.email} • {order._count.items} item(ns)</span></div>
            <div className="right"><b>{money(Number(order.totalAmount))}</b><em className={`status-chip ${order.status.toLowerCase()}`}>{statusLabel[order.status] ?? order.status}</em></div>
          </Link>)}
        </div>
      </article>

      <article className="admin-data-card">
        <header><div><h2>Mais vendidos</h2><p>Produtos com mais unidades no mês.</p></div></header>
        <div className="rank-list">
          {data.topProducts.length === 0 && <p className="empty-inline">As vendas aparecerão aqui quando houver pedidos pagos.</p>}
          {data.topProducts.map((product, index) => <div key={product.id}><span>{index + 1}</span><div><strong>{product.name}</strong><small>{product.units} unidade(s)</small></div><b>{money(product.revenue)}</b></div>)}
        </div>
      </article>
    </section>

    {data.lowStockItems.length > 0 && <section className="admin-data-card low-stock-card">
      <header><div><h2>Reposição necessária</h2><p>Itens no limite mínimo configurado.</p></div><Link href="/admin/estoque">Ajustar estoque <ArrowUpRight /></Link></header>
      <div className="stock-pills">{data.lowStockItems.map((item) => <span key={item.id}><b>{item.name}</b> {item.storage ?? ""}<em>{item.stock} em estoque</em></span>)}</div>
    </section>}
  </div>;
}

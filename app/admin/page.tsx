"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileDown,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";

type DailySale = { date: string; label: string; revenue: number; orders: number };

type Dashboard = {
  metrics: {
    revenue: number;
    previousRevenue: number;
    revenueChange: number;
    orders: number;
    previousOrders: number;
    averageTicket: number;
    customers: number;
    products: number;
    lowStock: number;
    inventoryValue: number;
    costs?: number;
    grossProfit?: number;
    grossMargin?: number;
    gatewayFees?: number;
    netProfit?: number;
    inventoryCost?: number;
  };
  today: { revenue: number; orders: number; yesterdayRevenue: number; yesterdayOrders: number };
  actionQueue: { awaitingPayment: number; toShip: number; lateShipments: number; productsWithoutPhoto: number; lowStock: number };
  paymentMethods: Array<{ method: string; revenue: number; orders: number }>;
  dailySales: DailySale[];
  ownerView: boolean;
  recentOrders: Array<{
    id: string;
    status: string;
    totalAmount: string;
    createdAt: string;
    user: { name: string | null; email: string };
    _count: { items: number };
  }>;
  lowStockItems: Array<{
    id: string;
    productId: string;
    name: string;
    imageUrl?: string;
    storage: string | null;
    color: string | null;
    stock: number;
    threshold: number;
    price: number;
  }>;
  topProducts: Array<{ id: string; name: string; units: number; revenue: number }>;
};

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
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

  useEffect(() => {
    void load().catch(() => { setError("Falha de conexão. Recarregue a página."); setLoading(false); });
  }, []);

  if (loading) return <div className="admin-loading"><RefreshCw className="animate-spin" /> Atualizando indicadores da loja...</div>;
  if (!data) return <div className="form-error">{error}</div>;

  const metrics = data.metrics;
  const maxDailyRevenue = Math.max(...data.dailySales.map((d) => d.revenue), 1);

  return (
    <div className="admin-easy">
      {/* HEADER DE COMANDO EXECUTIVO */}
      <div className="dash-header-bar">
        <div>
          <span className="eyebrow">Central de Operações • Aura Tech</span>
          <h1>Visão Geral da Loja</h1>
          <p>Métricas em tempo real calculadas diretamente das vendas e do estoque atual.</p>
        </div>
        
        <div className="dash-quick-actions">
          <Link href="/admin/produtos" className="button primary sm">
            <Plus size={15} /> Novo produto
          </Link>
          <Link href="/admin/pedidos" className="button ghost sm">
            <Receipt size={15} /> Ver Pedidos
          </Link>
          {data.ownerView && (
            <a href={`/api/admin/reports/sales-export?month=${new Date().toISOString().slice(0, 7)}`} className="button ghost sm" title="Baixar planilha de vendas do mês (bruto, taxas, líquido, custo, lucro)">
              <FileDown size={15} /> Exportar mês
            </a>
          )}
          <button className="button ghost sm" onClick={() => void load()} title="Atualizar dados">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* FILA DE AÇÃO — o que precisa de você agora */}
      <section className="action-queue" aria-label="Fila de ação">
        <Link href="/admin/pedidos" className={`action-card ${data.actionQueue.lateShipments > 0 ? "urgent" : ""}`}>
          <strong>{data.actionQueue.toShip}</strong>
          <span>pedido(s) pagos para enviar</span>
          {data.actionQueue.lateShipments > 0 && <em>{data.actionQueue.lateShipments} há mais de 24h — prioridade</em>}
        </Link>
        <Link href="/admin/pedidos" className="action-card">
          <strong>{data.actionQueue.awaitingPayment}</strong>
          <span>aguardando pagamento</span>
        </Link>
        <Link href="/admin/estoque" className={`action-card ${data.actionQueue.lowStock > 0 ? "warn" : ""}`}>
          <strong>{data.actionQueue.lowStock}</strong>
          <span>variações em estoque crítico</span>
        </Link>
        <Link href="/admin/produtos" className={`action-card ${data.actionQueue.productsWithoutPhoto > 0 ? "warn" : ""}`}>
          <strong>{data.actionQueue.productsWithoutPhoto}</strong>
          <span>produto(s) ativos sem foto</span>
        </Link>
      </section>

      {/* PREGÃO DE HOJE */}
      <section className="today-strip" aria-label="Vendas de hoje">
        <div>
          <span>Hoje</span>
          <strong>{money(data.today.revenue)}</strong>
          <small>{data.today.orders} pedido(s) confirmado(s)</small>
        </div>
        <div>
          <span>Ontem</span>
          <strong>{money(data.today.yesterdayRevenue)}</strong>
          <small>{data.today.yesterdayOrders} pedido(s)</small>
        </div>
        {data.paymentMethods.length > 0 && (
          <div className="today-methods">
            <span>Pagamento no mês</span>
            <div>
              {data.paymentMethods.slice(0, 3).map((entry) => (
                <small key={entry.method}><b>{entry.method}</b> {money(entry.revenue)} ({entry.orders})</small>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* CARDS DE KPI EXECUTIVOS */}
      <section className="metric-grid">
        <article className="metric-card accent">
          <span><CircleDollarSign /> Faturamento no mês</span>
          <strong>{money(metrics.revenue)}</strong>
          <small className={metrics.revenueChange >= 0 ? "positive" : "negative"}>
            <TrendingUp /> {metrics.revenueChange.toFixed(1)}% versus mês anterior
          </small>
        </article>

        {data.ownerView && (
          <article className="metric-card profit">
            <span><TrendingUp /> Lucro no mês</span>
            <strong>{money(metrics.netProfit ?? metrics.grossProfit)}</strong>
            <small>
              {metrics.grossMargin?.toFixed(1)}% de margem bruta • Custo: {money(metrics.costs)}
              {(metrics.gatewayFees ?? 0) > 0 ? ` • Taxas MP: ${money(metrics.gatewayFees)}` : ""}
            </small>
          </article>
        )}

        <article className="metric-card">
          <span><PackageCheck /> Pedidos pagos</span>
          <strong>{metrics.orders}</strong>
          <small>Ticket Médio: {money(metrics.averageTicket)}</small>
        </article>

        <article className="metric-card">
          <span><Boxes /> Valor em estoque</span>
          <strong>{money(metrics.inventoryValue)}</strong>
          <small>{data.ownerView && metrics.inventoryCost ? `Custo: ${money(metrics.inventoryCost)}` : `${metrics.products} produtos cadastrados`}</small>
        </article>

        <article className={`metric-card ${metrics.lowStock > 0 ? "warning" : ""}`}>
          <span><AlertTriangle /> Reposição de Estoque</span>
          <strong>{metrics.lowStock}</strong>
          <small>{metrics.lowStock > 0 ? "Itens em nível crítico ou esgotados" : "Todos em nível normal"}</small>
        </article>

        <article className="metric-card">
          <span><Users /> Clientes cadastrados</span>
          <strong>{metrics.customers}</strong>
          <small>Base ativa de compradores</small>
        </article>
      </section>

      {/* GRÁFICO VISUAL DE VENDAS (ÚLTIMOS 7 DIAS) */}
      <section className="admin-data-card dash-chart-card">
        <header>
          <div>
            <h2>Desempenho de Vendas (Últimos 7 Dias)</h2>
            <p>Faturamento diário e número de pedidos confirmados.</p>
          </div>
          <span className="chart-total-badge"><BarChart3 size={15} /> Total 7D: {money(data.dailySales.reduce((a, b) => a + b.revenue, 0))}</span>
        </header>
        
        <div className="dash-chart-body">
          {data.dailySales.map((day) => {
            const heightPct = Math.max(12, Math.round((day.revenue / maxDailyRevenue) * 100));
            return (
              <div key={day.date} className="chart-col">
                <div className="chart-bar-container">
                  <span className="chart-bar-val">{day.revenue > 0 ? money(day.revenue) : "R$ 0"}</span>
                  <div
                    className={`chart-bar-fill ${day.revenue > 0 ? "has-sales" : ""}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="chart-day-label">{day.label}</span>
                <small className="chart-orders-count">{day.orders} ped.</small>
              </div>
            );
          })}
        </div>
      </section>

      {/* PAINEL TÁTICO DE REPOSIÇÃO DE ESTOQUE (Substitui caixas amareladas) */}
      {data.lowStockItems.length > 0 && (
        <section className="admin-data-card low-stock-tactical-card">
          <header>
            <div>
              <h2>⚠️ Reposição Urgente de Estoque</h2>
              <p>{data.lowStockItems.length} aparelho(s) atingiram a quantidade mínima estipulada.</p>
            </div>
            <Link href="/admin/produtos?stock=lowStock">Ajustar no Catálogo <ArrowUpRight /></Link>
          </header>

          <div className="tactical-stock-table">
            <div className="stock-table-header">
              <div>Aparelho / Modelo</div>
              <div>Armazenamento</div>
              <div>Estoque Atual</div>
              <div>Limite Mínimo</div>
              <div>Ação</div>
            </div>

            <div className="stock-table-body">
              {data.lowStockItems.map((item) => (
                <div key={item.id} className="stock-table-row">
                  <div className="stock-product-cell">
                    <div className="stock-mini-img">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Package size={16} />}
                    </div>
                    <strong>{item.name}</strong>
                  </div>

                  <div>
                    <span className="tag-storage">{item.storage ?? "Padrão"}</span>
                  </div>

                  <div>
                    <span className={`pill-stock ${item.stock === 0 ? "zero" : "low"}`}>
                      {item.stock === 0 ? "🔴 Esgotado (0)" : `🟡 ${item.stock} un.`}
                    </span>
                  </div>

                  <div>
                    <small>Mínimo: {item.threshold} un.</small>
                  </div>

                  <div>
                    <Link href={`/admin/produtos?q=${encodeURIComponent(item.name)}`} className="button ghost sm text-xs">
                      <Pencil size={13} /> Repor
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO DUPLA: PEDIDOS RECENTES & MAIS VENDIDOS */}
      <section className="dashboard-grid">
        <article className="admin-data-card">
          <header>
            <div>
              <h2>Pedidos recentes</h2>
              <p>Últimas movimentações da loja.</p>
            </div>
            <Link href="/admin/pedidos">Ver todos <ArrowUpRight /></Link>
          </header>
          <div className="compact-list">
            {data.recentOrders.length === 0 && <p className="empty-inline">Nenhum pedido realizado ainda.</p>}
            {data.recentOrders.map((order) => (
              <Link href="/admin/pedidos" key={order.id}>
                <div>
                  <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                  <span>{order.user.name ?? order.user.email} • {order._count.items} item(ns)</span>
                </div>
                <div className="right">
                  <b>{money(Number(order.totalAmount))}</b>
                  <em className={`status-chip ${order.status.toLowerCase()}`}>
                    {statusLabel[order.status] ?? order.status}
                  </em>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="admin-data-card">
          <header>
            <div>
              <h2>Mais vendidos no mês</h2>
              <p>Produtos campeões de faturamento.</p>
            </div>
          </header>
          <div className="rank-list">
            {data.topProducts.length === 0 && (
              <p className="empty-inline">As estatísticas de vendas aparecerão aqui quando houver pedidos pagos.</p>
            )}
            {data.topProducts.map((product, index) => (
              <div key={product.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.units} unidade(s) vendida(s)</small>
                </div>
                <b>{money(product.revenue)}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

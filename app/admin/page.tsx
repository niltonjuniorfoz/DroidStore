"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  CreditCard,
  FileDown,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  TrendingUp,
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

type AuditEvent = { id: string; actorEmail: string | null; summary: string | null; action: string; createdAt: string };

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

function greeting(): string {
  const hour = Number(new Date().toLocaleString("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
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

  // Feed de atividade da equipe (auditoria) — só o proprietário enxerga.
  useEffect(() => {
    if (!data?.ownerView) return;
    fetch("/api/admin/audit", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((events: AuditEvent[]) => setActivity(Array.isArray(events) ? events.slice(0, 6) : []))
      .catch(() => undefined);
  }, [data?.ownerView]);

  if (loading) return <div className="admin-loading"><RefreshCw className="animate-spin" /> Atualizando indicadores da loja...</div>;
  if (!data) return <div className="form-error">{error}</div>;

  const metrics = data.metrics;
  const maxDailyRevenue = Math.max(...data.dailySales.map((d) => d.revenue), 1);
  const bestDay = data.dailySales.reduce((best, day) => (day.revenue > best.revenue ? day : best), data.dailySales[0]);
  const todayDelta = data.today.yesterdayRevenue
    ? ((data.today.revenue - data.today.yesterdayRevenue) / data.today.yesterdayRevenue) * 100
    : data.today.revenue > 0 ? 100 : 0;
  const monthTarget = metrics.previousRevenue; // meta natural: bater o mês anterior
  const monthProgress = monthTarget > 0 ? Math.min(100, (metrics.revenue / monthTarget) * 100) : 100;
  const methodTotal = data.paymentMethods.reduce((total, entry) => total + entry.revenue, 0) || 1;
  const maxTopRevenue = Math.max(...data.topProducts.map((product) => product.revenue), 1);
  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

  return (
    <div className="admin-easy">
      {/* CABEÇALHO COM CONTEXTO DO DIA */}
      <div className="dash-header-bar">
        <div>
          <span className="eyebrow">{dateLabel}</span>
          <h1>{greeting()}, comando da loja</h1>
          <p>Indicadores em tempo real de vendas, estoque e operação.</p>
        </div>
        <div className="dash-quick-actions">
          <Link href="/admin/produtos" className="button primary sm">
            <Plus size={15} /> Novo produto
          </Link>
          <Link href="/admin/pedidos" className="button ghost sm">
            <Receipt size={15} /> Pedidos
          </Link>
          {data.ownerView && (
            <a href={`/api/admin/reports/sales-export?month=${new Date().toISOString().slice(0, 7)}`} className="button ghost sm" title="Baixar planilha de vendas do mês">
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

      {/* BANDA DE KPIs CURADA */}
      <section className="metric-grid dash-kpi-band">
        <article className="metric-card accent">
          <span><CircleDollarSign /> Faturamento no mês</span>
          <strong>{money(metrics.revenue)}</strong>
          <small className={metrics.revenueChange >= 0 ? "positive" : "negative"}>
            <TrendingUp /> {metrics.revenueChange.toFixed(1)}% vs mês anterior
          </small>
          {monthTarget > 0 && (
            <div className="goal-progress" title={`Meta natural: repetir o mês anterior (${money(monthTarget)})`}>
              <div className="goal-progress-track"><div className="goal-progress-fill" style={{ width: `${monthProgress}%` }} /></div>
              <small>{monthProgress >= 100
                ? "✓ mês anterior superado"
                : `faltam ${money(monthTarget - metrics.revenue)} para bater o mês anterior`}</small>
            </div>
          )}
        </article>

        <article className="metric-card">
          <span><Activity /> Hoje</span>
          <strong>{money(data.today.revenue)}</strong>
          <small className={todayDelta >= 0 ? "positive" : "negative"}>
            {data.today.orders} pedido(s) · {todayDelta >= 0 ? "▲" : "▼"} {Math.abs(todayDelta).toFixed(0)}% vs ontem ({money(data.today.yesterdayRevenue)})
          </small>
        </article>

        {data.ownerView && (
          <article className="metric-card profit">
            <span><TrendingUp /> Lucro no mês</span>
            <strong>{money(metrics.netProfit ?? metrics.grossProfit)}</strong>
            <small>
              {metrics.grossMargin?.toFixed(1)}% margem · custo {money(metrics.costs)}
              {(metrics.gatewayFees ?? 0) > 0 ? ` · taxas MP ${money(metrics.gatewayFees)}` : ""}
            </small>
          </article>
        )}

        <article className="metric-card">
          <span><PackageCheck /> Pedidos no mês</span>
          <strong>{metrics.orders}</strong>
          <small>ticket médio {money(metrics.averageTicket)} · {metrics.customers} clientes na base</small>
        </article>

        <article className="metric-card">
          <span><Boxes /> Valor em estoque</span>
          <strong>{money(metrics.inventoryValue)}</strong>
          <small>{data.ownerView && metrics.inventoryCost ? `custo ${money(metrics.inventoryCost)} · ` : ""}{metrics.products} produtos ativos</small>
        </article>
      </section>

      {/* ZONA EDITORIAL: CONTEÚDO PRINCIPAL + TRILHO LATERAL */}
      <div className="dash-columns">
        <div className="dash-main">
          {/* GRÁFICO 7 DIAS */}
          <section className="admin-data-card dash-chart-card">
            <header>
              <div>
                <h2>Vendas dos últimos 7 dias</h2>
                <p>Melhor dia: <strong>{bestDay?.label ?? "—"}</strong> com {money(bestDay?.revenue ?? 0)}.</p>
              </div>
              <span className="chart-total-badge"><BarChart3 size={15} /> 7D: {money(data.dailySales.reduce((a, b) => a + b.revenue, 0))}</span>
            </header>
            <div className="dash-chart-body">
              {data.dailySales.map((day) => {
                const heightPct = Math.max(12, Math.round((day.revenue / maxDailyRevenue) * 100));
                return (
                  <div key={day.date} className="chart-col">
                    <div className="chart-bar-container">
                      <span className="chart-bar-val">{day.revenue > 0 ? money(day.revenue) : "R$ 0"}</span>
                      <div className={`chart-bar-fill ${day.revenue > 0 ? "has-sales" : ""}`} style={{ height: `${heightPct}%` }} />
                    </div>
                    <span className="chart-day-label">{day.label}</span>
                    <small className="chart-orders-count">{day.orders} ped.</small>
                  </div>
                );
              })}
            </div>
          </section>

          {/* MAIS VENDIDOS COM SHARE DE RECEITA */}
          <section className="admin-data-card">
            <header>
              <div>
                <h2>Mais vendidos no mês</h2>
                <p>Participação de cada campeão no faturamento.</p>
              </div>
              <Link href="/admin/relatorios">Curva ABC completa <ArrowUpRight /></Link>
            </header>
            <div className="rank-list">
              {data.topProducts.length === 0 && (
                <p className="empty-inline">As estatísticas aparecem aqui com os primeiros pedidos pagos.</p>
              )}
              {data.topProducts.map((product, index) => (
                <div key={product.id} className="rank-row">
                  <span className="rank-pos">{index + 1}</span>
                  <div className="rank-info">
                    <strong>{product.name}</strong>
                    <div className="share-track"><div className="share-fill" style={{ width: `${Math.max(4, (product.revenue / maxTopRevenue) * 100)}%` }} /></div>
                    <small>{product.units} unidade(s)</small>
                  </div>
                  <b>{money(product.revenue)}</b>
                </div>
              ))}
            </div>
          </section>

          {/* REPOSIÇÃO URGENTE */}
          {data.lowStockItems.length > 0 && (
            <section className="admin-data-card low-stock-tactical-card">
              <header>
                <div>
                  <h2>Reposição urgente de estoque</h2>
                  <p>{data.lowStockItems.length} aparelho(s) no limite mínimo ou esgotados.</p>
                </div>
                <Link href="/admin/estoque">Abrir estoque <ArrowUpRight /></Link>
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
                  {data.lowStockItems.slice(0, 8).map((item) => (
                    <div key={item.id} className="stock-table-row">
                      <div className="stock-product-cell">
                        <div className="stock-mini-img">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <Package size={16} />}
                        </div>
                        <strong>{item.name}</strong>
                      </div>
                      <div><span className="tag-storage">{item.storage ?? "Padrão"}</span></div>
                      <div>
                        <span className={`pill-stock ${item.stock === 0 ? "zero" : "low"}`}>
                          {item.stock === 0 ? "Esgotado (0)" : `${item.stock} un.`}
                        </span>
                      </div>
                      <div><small>Mínimo: {item.threshold} un.</small></div>
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
        </div>

        <aside className="dash-rail">
          {/* MÉTODOS DE PAGAMENTO */}
          <section className="admin-data-card rail-card">
            <header>
              <div>
                <h2><CreditCard size={14} /> Pagamento no mês</h2>
              </div>
            </header>
            <div className="method-list">
              {data.paymentMethods.length === 0 && <p className="empty-inline">Sem vendas confirmadas no mês.</p>}
              {data.paymentMethods.map((entry) => (
                <div key={entry.method} className="method-row">
                  <div className="method-head">
                    <strong>{entry.method}</strong>
                    <b>{money(entry.revenue)}</b>
                  </div>
                  <div className="share-track"><div className="share-fill" style={{ width: `${Math.max(3, (entry.revenue / methodTotal) * 100)}%` }} /></div>
                  <small>{entry.orders} pedido(s) · {Math.round((entry.revenue / methodTotal) * 100)}% do faturamento</small>
                </div>
              ))}
            </div>
          </section>

          {/* PEDIDOS RECENTES */}
          <section className="admin-data-card rail-card">
            <header>
              <div><h2>Pedidos recentes</h2></div>
              <Link href="/admin/pedidos">Ver todos <ArrowUpRight /></Link>
            </header>
            <div className="compact-list">
              {data.recentOrders.length === 0 && <p className="empty-inline">Nenhum pedido ainda.</p>}
              {data.recentOrders.slice(0, 6).map((order) => (
                <Link href="/admin/pedidos" key={order.id}>
                  <div>
                    <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                    <span>{order.user.name ?? order.user.email}</span>
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
          </section>

          {/* ATIVIDADE DA EQUIPE (owner) */}
          {data.ownerView && (
            <section className="admin-data-card rail-card">
              <header>
                <div><h2><Activity size={14} /> Atividade da equipe</h2></div>
                <Link href="/admin/auditoria">Auditoria <ArrowUpRight /></Link>
              </header>
              <div className="activity-feed">
                {activity.length === 0 && <p className="empty-inline">As ações do painel aparecem aqui.</p>}
                {activity.map((event) => (
                  <div key={event.id} className="activity-row">
                    <span className="activity-dot" />
                    <div>
                      <strong>{event.summary ?? event.action}</strong>
                      <small>{event.actorEmail ?? "sistema"} · {new Date(event.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ALERTA DE ESTOQUE COMPACTO (se a tabela principal estourou) */}
          {metrics.lowStock > 8 && (
            <section className="admin-data-card rail-card">
              <header><div><h2><AlertTriangle size={14} /> Estoque crítico</h2></div></header>
              <p className="empty-inline" style={{ padding: "0 1.25rem 1rem" }}>
                {metrics.lowStock} variações no total precisam de reposição — a tabela ao lado mostra as 8 mais urgentes.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

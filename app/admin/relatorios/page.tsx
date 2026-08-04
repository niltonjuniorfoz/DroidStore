"use client";

import { useEffect, useState } from "react";
import { BarChart3, CircleDollarSign, FileDown, PackageCheck, TrendingUp } from "lucide-react";

type Summary = {
  period: { from: string; to: string; days: number };
  totals: { revenue: number; orders: number; fees: number; cost: number; profit: number; averageTicket: number };
  abc: Array<{ id: string; name: string; units: number; revenue: number; cost: number; profit: number }>;
  turnover: Array<{ id: string; name: string; stock: number; units: number; daysOfStock: number | null }>;
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateInput = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export default function AdminRelatorios() {
  const [from, setFrom] = useState(() => dateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => dateInput(new Date()));
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/reports/summary?from=${from}&to=${to}`, { cache: "no-store" })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) setError(body.error ?? "Não foi possível carregar o relatório.");
          else { setData(body); setError(""); }
        })
        .catch(() => setError("Falha de conexão. Tente novamente."))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [from, to]);

  return <div className="admin-easy">
    <div className="admin-title">
      <div>
        <span className="eyebrow">Financeiro</span>
        <h1>Relatórios</h1>
        <p>Vendas, curva ABC e giro de estoque em qualquer período. Custos e lucro visíveis só para você.</p>
      </div>
      <a href={`/api/admin/reports/sales-export?month=${to.slice(0, 7)}`} className="button ghost sm" title="Baixar XLSX do mês final do período">
        <FileDown size={15} /> XLSX do mês
      </a>
    </div>

    <section className="admin-panel" style={{ padding: "0.9rem 1.1rem" }}>
      <div className="admin-form-grid" style={{ alignItems: "end" }}>
        <label>De<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Até<input type="date" value={to} min={from} max={dateInput(new Date())} onChange={(event) => setTo(event.target.value)} /></label>
        {data && <small style={{ color: "var(--muted)", paddingBottom: "0.6rem" }}>{data.period.days} dia(s) analisado(s)</small>}
      </div>
    </section>

    {error && <div className="form-error">{error}</div>}
    {loading && <div className="admin-loading">Calculando relatório...</div>}

    {!loading && data && <>
      <section className="metric-grid">
        <article className="metric-card accent">
          <span><CircleDollarSign /> Faturamento</span>
          <strong>{money(data.totals.revenue)}</strong>
          <small>{data.totals.orders} pedidos • ticket {money(data.totals.averageTicket)}</small>
        </article>
        <article className="metric-card profit">
          <span><TrendingUp /> Lucro do período</span>
          <strong>{money(data.totals.profit)}</strong>
          <small>Custo: {money(data.totals.cost)} • Taxas MP: {money(data.totals.fees)}</small>
        </article>
        <article className="metric-card">
          <span><PackageCheck /> Unidades vendidas</span>
          <strong>{data.abc.reduce((total, row) => total + row.units, 0)}</strong>
          <small>{data.abc.length} produtos com venda no período</small>
        </article>
      </section>

      <section className="admin-data-card">
        <div className="admin-toolbar"><strong style={{ fontSize: "0.8rem" }}><BarChart3 size={14} style={{ verticalAlign: "-2px" }} /> Curva ABC — o que sustenta o faturamento</strong></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)", fontSize: "0.64rem", textTransform: "uppercase" }}>
              <th style={{ padding: "0.6rem 1.25rem" }}>Produto</th><th>Unid.</th><th>Receita</th><th>Lucro</th><th>% acum.</th>
            </tr></thead>
            <tbody>
              {(() => {
                const totalRevenue = data.abc.reduce((total, row) => total + row.revenue, 0) || 1;
                let accumulated = 0;
                return data.abc.map((row) => {
                  accumulated += row.revenue;
                  const pct = (accumulated / totalRevenue) * 100;
                  return <tr key={row.id} style={{ borderTop: "1px solid #edf0ee" }}>
                    <td style={{ padding: "0.55rem 1.25rem", fontWeight: 600 }}>{row.name}</td>
                    <td>{row.units}</td>
                    <td>{money(row.revenue)}</td>
                    <td style={{ color: row.profit >= 0 ? "#087c25" : "#b42323" }}>{money(row.profit)}</td>
                    <td><span style={{ fontWeight: 700 }}>{pct.toFixed(0)}%</span> <small style={{ color: "var(--muted)" }}>({pct <= 80 ? "A" : pct <= 95 ? "B" : "C"})</small></td>
                  </tr>;
                });
              })()}
              {!data.abc.length && <tr><td colSpan={5} style={{ padding: "1rem 1.25rem", color: "var(--muted)" }}>Nenhuma venda no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-data-card">
        <div className="admin-toolbar"><strong style={{ fontSize: "0.8rem" }}>Giro de estoque — quanto tempo o estoque atual dura no ritmo do período</strong></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)", fontSize: "0.64rem", textTransform: "uppercase" }}>
              <th style={{ padding: "0.6rem 1.25rem" }}>Produto</th><th>Estoque</th><th>Vendidos</th><th>Cobertura</th>
            </tr></thead>
            <tbody>
              {data.turnover.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid #edf0ee" }}>
                  <td style={{ padding: "0.55rem 1.25rem", fontWeight: 600 }}>{row.name}</td>
                  <td>{row.stock}</td>
                  <td>{row.units}</td>
                  <td>{row.daysOfStock === null
                    ? <span style={{ color: "var(--muted)" }}>parado (sem venda)</span>
                    : <span style={{ color: row.daysOfStock < 15 ? "#b42323" : row.daysOfStock < 45 ? "#966000" : "#087c25", fontWeight: 700 }}>~{row.daysOfStock} dias</span>}
                  </td>
                </tr>
              ))}
              {!data.turnover.length && <tr><td colSpan={4} style={{ padding: "1rem 1.25rem", color: "var(--muted)" }}>Sem produtos ativos com estoque.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>}
  </div>;
}

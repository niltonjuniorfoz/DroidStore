"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  Eye,
  History,
  LoaderCircle,
  PackagePlus,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import { feesFromPercent, installmentLadder, marginOf, netAfterFee } from "../../../src/lib/pricing";

type Insights = {
  ownerView: boolean;
  product: { name: string; active: boolean; createdAt: string; daysInCatalog: number; stock: number; favorites: number };
  demand: { views: number; views30d: number; views7d: number; favorites: number; conversionPct: number | null; daysSinceLastSale: number | null; monthly: Array<{ month: string; views: number }> };
  fees: { pix: number; card: number; perInstallment: number };
  sales: {
    units: number; orders: number; revenue: number; avgPrice: number; minPrice: number; maxPrice: number;
    firstSale: string | null; lastSale: string | null; unitsPerMonth: number;
    monthly: Array<{ month: string; units: number; revenue: number }>;
    cost?: number; fees?: number; realizedProfit?: number;
  };
  stockHealth: { stock: number; daysOfStock: number | null; lowStockThreshold: number; unsold: number };
  pricing: {
    price: number; pixDiscountPct: number; pixPrice: number; pixNet: number; cardPrice: number; cardNet: number;
    maxInstallments: number;
    ladder: Array<{ installments: number; installmentValue: number; total: number; netReceived?: number; profit?: number; marginPct?: number }>;
  };
  margins?: {
    cost: number;
    table: { profit: number; marginPct: number; markupPct: number | null };
    pix: { profit: number; marginPct: number; markupPct: number | null };
    card: { profit: number; marginPct: number; markupPct: number | null };
    breakEvenPix: number;
    breakEvenCard: number;
  };
  guidance?: {
    maxPurchase30: number; maxPurchase20: number; maxPurchase15: number;
    targetUnits: number; unitsToBuy: number;
    investmentNeeded: number | null;
    suggestedPriceForMargin30: number | null;
  };
  purchase?: {
    lots: Array<{ id: string; supplier: string; currency: string; unitCostFx: number; exchangeRate: number; quantity: number; unitCostBrl: number; purchasedAt: string }>;
    firstCost: number | null; lastCost: number | null; avgCost: number | null;
    totalBought: number; totalInvested: number; costTrendPct: number | null;
  } | null;
  priceLog?: Array<{ id: string; summary: string | null; actorEmail: string | null; createdAt: string }>;
  movements: Array<{ id: string; type: string; quantity: number; note: string | null; createdAt: string }>;
};

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const movementLabels: Record<string, string> = {
  ENTRY: "Entrada de lote",
  ADJUSTMENT: "Ajuste manual",
  SALE: "Venda",
  RETURN: "Devolução",
};

export default function ProductInsights({ productId }: { productId: string }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Simulador da maquininha: taxas editáveis que recalculam a tabela na hora.
  const [pixFee, setPixFee] = useState<number | "">("");
  const [cardFee, setCardFee] = useState<number | "">("");
  const [perInstallmentFee, setPerInstallmentFee] = useState<number | "">("");
  const [savingFees, setSavingFees] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/products/${productId}/insights`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) setError(body.error ?? "Não foi possível carregar a inteligência do produto.");
        else {
          setData(body);
          setError("");
          if (body.fees) {
            setPixFee(body.fees.pix);
            setCardFee(body.fees.card);
            setPerInstallmentFee(body.fees.perInstallment);
          }
        }
      })
      .catch(() => setError("Falha de conexão ao carregar a inteligência."))
      .finally(() => setLoading(false));
  }, [productId]);

  async function saveFees() {
    setSavingFees(true);
    setFeeSaved(false);
    try {
      const current = await fetch("/api/admin/settings", { cache: "no-store" }).then((response) => response.json());
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current.content,
          pixFeePct: Number(pixFee) || 0,
          cardFeePct: Number(cardFee) || 0,
          cardInstallmentFeePct: Number(perInstallmentFee) || 0,
        }),
      });
      if (response.ok) setFeeSaved(true);
      else setError("Não foi possível salvar as taxas como padrão.");
    } catch {
      setError("Falha de conexão ao salvar as taxas.");
    }
    setSavingFees(false);
  }

  if (loading) return <div className="product-editor-loading"><LoaderCircle className="spin" /><span>Analisando histórico do aparelho...</span></div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!data) return null;

  const { demand, sales, stockHealth, pricing, margins, guidance, purchase } = data;
  const maxMonthly = Math.max(...sales.monthly.map((row) => row.revenue), 1);
  const parado = demand.daysSinceLastSale !== null && demand.daysSinceLastSale > 60;
  const semVenda = sales.units === 0;
  const procurado = demand.views30d >= 20 && sales.units === 0;

  return (
    <div className="insights-panel">
      {/* DIAGNÓSTICO EM UMA FRASE */}
      <div className={`insight-verdict ${semVenda ? "warn" : parado ? "warn" : "good"}`}>
        <AlertTriangle size={16} />
        <div>
          {semVenda && demand.views === 0 && <strong>Ninguém viu este aparelho ainda — {data.product.daysInCatalog} dia(s) no catálogo, sem visitas e sem vendas.</strong>}
          {semVenda && demand.views > 0 && <strong>{demand.views} visita(s), nenhuma venda. Há procura — o preço ou as fotos podem estar travando a conversão.</strong>}
          {!semVenda && parado && <strong>Vendeu {sales.units} un., mas está parado há {demand.daysSinceLastSale} dias. Considere promoção ou revisão de preço.</strong>}
          {!semVenda && !parado && <strong>Girando: {sales.units} un. vendidas · ritmo de {sales.unitsPerMonth}/mês · última venda há {demand.daysSinceLastSale} dia(s).</strong>}
          {procurado && <small>Muitas visitas sem conversão nos últimos 30 dias — sinal clássico de preço acima do mercado.</small>}
        </div>
      </div>

      {/* PROCURA E GIRO */}
      <section className="insight-block">
        <h4><Eye size={14} /> Procura e giro</h4>
        <div className="insight-grid">
          <div><span>Visitas totais</span><strong>{demand.views}</strong><small>{demand.views30d} em 30d · {demand.views7d} em 7d</small></div>
          <div><span>Favoritos</span><strong>{demand.favorites}</strong><small>clientes que salvaram</small></div>
          <div><span>Conversão</span><strong>{demand.conversionPct !== null ? `${demand.conversionPct}%` : "—"}</strong><small>visitas que viraram venda</small></div>
          <div><span>No catálogo há</span><strong>{data.product.daysInCatalog} dias</strong><small>{demand.daysSinceLastSale !== null ? `última venda há ${demand.daysSinceLastSale}d` : "nunca vendeu"}</small></div>
        </div>
      </section>

      {/* HISTÓRICO DE VENDA */}
      <section className="insight-block">
        <h4><TrendingUp size={14} /> Histórico de venda</h4>
        <div className="insight-grid">
          <div><span>Unidades vendidas</span><strong>{sales.units}</strong><small>em {sales.orders} pedido(s)</small></div>
          <div><span>Faturamento</span><strong>{money(sales.revenue)}</strong><small>ritmo {sales.unitsPerMonth}/mês</small></div>
          <div><span>Preço médio praticado</span><strong>{money(sales.avgPrice)}</strong><small>{sales.units > 0 ? `mín ${money(sales.minPrice)} · máx ${money(sales.maxPrice)}` : "sem vendas"}</small></div>
          {margins && sales.realizedProfit !== undefined && (
            <div><span>Lucro realizado</span><strong className={sales.realizedProfit >= 0 ? "good" : "bad"}>{money(sales.realizedProfit)}</strong><small>custo {money(sales.cost)} · taxas {money(sales.fees)}</small></div>
          )}
        </div>
        {sales.monthly.length > 0 && (
          <div className="insight-spark">
            {sales.monthly.map((row) => (
              <div key={row.month} title={`${row.month}: ${row.units} un. · ${money(row.revenue)}`}>
                <div className="insight-spark-bar" style={{ height: `${Math.max(8, (row.revenue / maxMonthly) * 100)}%` }} />
                <small>{row.month.slice(5)}/{row.month.slice(2, 4)}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HISTÓRICO DE COMPRA (owner) */}
      {purchase && (
        <section className="insight-block">
          <h4><PackagePlus size={14} /> Histórico de compra</h4>
          {purchase.lots.length === 0 ? (
            <p className="finance-hint">Nenhum lote registrado. Cadastre a entrada em <b>Compras</b> para o sistema saber o custo real em dólar/USDT e acompanhar a variação.</p>
          ) : (
            <>
              <div className="insight-grid">
                <div><span>Primeiro custo</span><strong>{money(purchase.firstCost ?? 0)}</strong><small>entrada inicial</small></div>
                <div><span>Custo médio</span><strong>{money(purchase.avgCost ?? 0)}</strong><small>{purchase.totalBought} un. compradas</small></div>
                <div>
                  <span>Último custo</span>
                  <strong className={purchase.costTrendPct !== null && purchase.costTrendPct > 0 ? "bad" : "good"}>{money(purchase.lastCost ?? 0)}</strong>
                  <small>{purchase.costTrendPct !== null ? `${purchase.costTrendPct > 0 ? "▲" : "▼"} ${Math.abs(purchase.costTrendPct)}% vs 1º lote` : "único lote"}</small>
                </div>
                <div><span>Investido</span><strong>{money(purchase.totalInvested)}</strong><small>{stockHealth.unsold} un. ainda em mãos</small></div>
              </div>
              <div className="insight-table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Fornecedor</th><th>Moeda</th><th className="cell-num">Custo un.</th><th className="cell-num">Qtd</th><th className="cell-num">Em R$</th></tr></thead>
                  <tbody>
                    {purchase.lots.map((lot) => (
                      <tr key={lot.id}>
                        <td>{new Date(lot.purchasedAt).toLocaleDateString("pt-BR")}</td>
                        <td>{lot.supplier}</td>
                        <td>{lot.currency} {lot.currency !== "BRL" ? `@ ${lot.exchangeRate.toFixed(4)}` : ""}</td>
                        <td className="cell-num">{lot.currency} {lot.unitCostFx.toFixed(2)}</td>
                        <td className="cell-num">{lot.quantity}</td>
                        <td className="cell-num"><strong>{money(lot.unitCostBrl)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ESCADA DE PAGAMENTO COM SIMULADOR DE TAXA */}
      {(() => {
        const simFees = feesFromPercent(Number(pixFee) || 0, Number(cardFee) || 0, Number(perInstallmentFee) || 0);
        const cost = margins?.cost ?? 0;
        const simPixNet = netAfterFee(pricing.pixPrice, simFees.pix);
        const simPixMargin = marginOf(simPixNet, cost);
        const simLadder = installmentLadder(pricing.price, cost, pricing.maxInstallments, simFees);
        const changed = Math.abs((Number(pixFee) || 0) - data.fees.pix) > 0.001
          || Math.abs((Number(cardFee) || 0) - data.fees.card) > 0.001
          || Math.abs((Number(perInstallmentFee) || 0) - data.fees.perInstallment) > 0.001;
        const worstRow = simLadder[simLadder.length - 1];
        return (
          <section className="insight-block">
            <h4><CreditCard size={14} /> Como o cliente paga — e quanto sobra</h4>

            {margins && (
              <div className="fee-simulator">
                <div className="fee-inputs">
                  <label>Taxa PIX (%)<input type="number" step="0.01" min="0" max="20" value={pixFee} onChange={(event) => setPixFee(event.target.value === "" ? "" : Number(event.target.value))} /></label>
                  <label>Taxa cartão à vista (%)<input type="number" step="0.01" min="0" max="20" value={cardFee} onChange={(event) => setCardFee(event.target.value === "" ? "" : Number(event.target.value))} /></label>
                  <label>Acréscimo por parcela (%)<input type="number" step="0.01" min="0" max="10" value={perInstallmentFee} onChange={(event) => setPerInstallmentFee(event.target.value === "" ? "" : Number(event.target.value))} /></label>
                  <button type="button" className="button ghost sm" disabled={savingFees || !changed} onClick={() => void saveFees()}>
                    <Save size={13} /> {savingFees ? "Salvando..." : feeSaved ? "Salvo!" : "Salvar como padrão"}
                  </button>
                </div>
                <small className="finance-hint">
                  Digite a taxa real da sua maquininha — a tabela recalcula na hora. &quot;Salvar como padrão&quot; aplica em todo o painel.
                </small>
              </div>
            )}

            {margins && (
              <div className={`fee-verdict ${simPixMargin.profit <= 0 ? "bad" : worstRow.profit <= 0 ? "warn" : "good"}`}>
                {simPixMargin.profit <= 0
                  ? <strong>Com essa taxa você PERDE {money(Math.abs(simPixMargin.profit))} por unidade até no PIX. Suba o preço ou renegocie a taxa.</strong>
                  : worstRow.profit <= 0
                    ? <strong>Ganha no PIX ({money(simPixMargin.profit)}), mas PERDE em {worstRow.installments}x ({money(worstRow.profit)}). Limite o parcelamento ou repasse a taxa.</strong>
                    : <strong>Ganha em todas as formas: de {money(worstRow.profit)} ({worstRow.installments}x) até {money(simPixMargin.profit)} no PIX.</strong>}
              </div>
            )}

            <div className="insight-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Forma</th><th className="cell-num">Cliente paga</th><th className="cell-num">Por parcela</th>
                    {margins && <><th className="cell-num">Taxa</th><th className="cell-num">Você recebe</th><th className="cell-num">Lucro</th><th className="cell-num">Margem</th></>}
                  </tr>
                </thead>
                <tbody>
                  <tr className="highlight-row">
                    <td><strong>PIX (−{pricing.pixDiscountPct}%)</strong></td>
                    <td className="cell-num"><strong>{money(pricing.pixPrice)}</strong></td>
                    <td className="cell-num">à vista</td>
                    {margins && <>
                      <td className="cell-num">{(Number(pixFee) || 0).toFixed(2)}%</td>
                      <td className="cell-num">{money(simPixNet)}</td>
                      <td className="cell-num"><strong className={simPixMargin.profit >= 0 ? "good" : "bad"}>{money(simPixMargin.profit)}</strong></td>
                      <td className="cell-num">{simPixMargin.marginPct}%</td>
                    </>}
                  </tr>
                  {simLadder.map((row) => (
                    <tr key={row.installments} className={margins && row.profit <= 0 ? "row-loss" : ""}>
                      <td>{row.installments === 1 ? "Cartão à vista" : `Cartão ${row.installments}x`}</td>
                      <td className="cell-num">{money(row.total)}</td>
                      <td className="cell-num">{row.installments}× {money(row.installmentValue)}</td>
                      {margins && <>
                        <td className="cell-num">{((simFees.cardBase + Math.max(0, row.installments - 1) * simFees.cardPerInstallment) * 100).toFixed(2)}%</td>
                        <td className="cell-num">{money(row.netReceived)}</td>
                        <td className="cell-num"><strong className={row.profit >= 0 ? "good" : "bad"}>{money(row.profit)}</strong></td>
                        <td className="cell-num">{row.marginPct}%</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {margins && (
              <p className="finance-hint">
                Preço mínimo para não sair no prejuízo: <b>{money(margins.breakEvenPix)}</b> no PIX · <b>{money(margins.breakEvenCard)}</b> no cartão à vista.
              </p>
            )}
          </section>
        );
      })()}

      {/* DASHBOARD: PROCURA x VENDA MÊS A MÊS */}
      {(demand.monthly.length > 0 || sales.monthly.length > 0) && (
        <section className="insight-block">
          <h4><BarChart3 size={14} /> Procura x venda — últimos 6 meses</h4>
          {(() => {
            const months = Array.from(new Set([...demand.monthly.map((row) => row.month), ...sales.monthly.map((row) => row.month)])).sort();
            const viewsByMonth = new Map(demand.monthly.map((row) => [row.month, row.views]));
            const unitsByMonth = new Map(sales.monthly.map((row) => [row.month, row.units]));
            const maxViews = Math.max(...months.map((month) => viewsByMonth.get(month) ?? 0), 1);
            const maxUnits = Math.max(...months.map((month) => unitsByMonth.get(month) ?? 0), 1);
            return (
              <>
                <div className="dual-chart">
                  {months.map((month) => {
                    const views = viewsByMonth.get(month) ?? 0;
                    const units = unitsByMonth.get(month) ?? 0;
                    return (
                      <div key={month} className="dual-col" title={`${month}: ${views} visita(s), ${units} venda(s)`}>
                        <div className="dual-bars">
                          <div className="dual-bar views" style={{ height: `${Math.max(3, (views / maxViews) * 100)}%` }} />
                          <div className="dual-bar units" style={{ height: `${Math.max(3, (units / maxUnits) * 100)}%` }} />
                        </div>
                        <small>{month.slice(5)}/{month.slice(2, 4)}</small>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-legend">
                  <span><i className="dot views" /> visitas</span>
                  <span><i className="dot units" /> unidades vendidas</span>
                </div>
              </>
            );
          })()}
        </section>
      )}

      {/* RECOMENDAÇÕES DE COMPRA E PREÇO */}
      {guidance && margins && (
        <section className="insight-block">
          <h4><Target size={14} /> Quanto comprar e por quanto vender</h4>
          <div className="insight-grid">
            <div>
              <span>Máximo a pagar por unidade</span>
              <strong>{money(guidance.maxPurchase30)}</strong>
              <small>para manter 30% de margem · 20%: {money(guidance.maxPurchase20)} · 15%: {money(guidance.maxPurchase15)}</small>
            </div>
            <div>
              <span>Quanto comprar agora</span>
              <strong>{guidance.unitsToBuy} un.</strong>
              <small>cobertura de 2 meses ({guidance.targetUnits} un.) · tem {stockHealth.stock}</small>
            </div>
            <div>
              <span>Investimento sugerido</span>
              <strong>{guidance.investmentNeeded !== null ? money(guidance.investmentNeeded) : "—"}</strong>
              <small>{guidance.investmentNeeded !== null ? "pelo custo médio dos lotes" : "registre um lote em Compras"}</small>
            </div>
            <div>
              <span>Preço para 30% de margem</span>
              <strong>{guidance.suggestedPriceForMargin30 !== null ? money(guidance.suggestedPriceForMargin30) : "—"}</strong>
              <small>{guidance.suggestedPriceForMargin30 !== null ? `tabela hoje: ${money(pricing.price)}` : "informe o custo"}</small>
            </div>
          </div>
          {stockHealth.daysOfStock !== null && (
            <p className="finance-hint">
              No ritmo atual, o estoque de {stockHealth.stock} un. dura <b>~{stockHealth.daysOfStock} dias</b>.
            </p>
          )}
        </section>
      )}

      {/* MOVIMENTAÇÕES E ALTERAÇÕES */}
      <section className="insight-block">
        <h4><History size={14} /> Últimas movimentações</h4>
        <div className="activity-feed" style={{ padding: 0 }}>
          {data.movements.map((movement) => (
            <div key={movement.id} className="activity-row">
              <span className="activity-dot" />
              <div>
                <strong>{movementLabels[movement.type] ?? movement.type} ({movement.quantity > 0 ? "+" : ""}{movement.quantity})</strong>
                <small>{movement.note ?? "sem observação"} · {new Date(movement.createdAt).toLocaleString("pt-BR")}</small>
              </div>
            </div>
          ))}
          {data.movements.length === 0 && <p className="empty-inline">Nenhuma movimentação registrada.</p>}
        </div>
        {data.priceLog && data.priceLog.length > 0 && (
          <>
            <h4 style={{ marginTop: "0.9rem" }}><History size={14} /> Alterações do cadastro</h4>
            <div className="activity-feed" style={{ padding: 0 }}>
              {data.priceLog.map((entry) => (
                <div key={entry.id} className="activity-row">
                  <span className="activity-dot" />
                  <div>
                    <strong>{entry.summary ?? "Produto atualizado"}</strong>
                    <small>{entry.actorEmail ?? "sistema"} · {new Date(entry.createdAt).toLocaleString("pt-BR")}</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

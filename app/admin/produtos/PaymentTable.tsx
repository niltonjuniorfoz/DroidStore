"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw, Save, Sparkles, Store, Wallet } from "lucide-react";
import {
  breakEvenPrice,
  cardFeeRate,
  evaluatePlanRow,
  feesFromPercent,
  minimumForNextTier,
  netAfterFee,
  validateInstallmentPlan,
  type PlanRow,
} from "../../../src/lib/pricing";

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  plan: PlanRow[];
  onChange: (plan: PlanRow[]) => void;
  basePrice: number;
  cost: number;
  pixDiscountPct: number;
  maxInstallments: number;
  showMargins: boolean;
  fees: { pix: number; card: number; perInstallment: number };
  onFeesChange: (fees: { pix: number; card: number; perInstallment: number }) => void;
};

/**
 * Tabela única de pagamento do produto.
 * Coluna "Cliente paga" = o que a vitrine mostra.
 * Coluna "Você recebe" = o que entra na conta após a taxa.
 * Sem plano salvo, as parcelas são o preço de tabela dividido; ao personalizar,
 * os valores viram plano do produto e são salvos com ele.
 */
export default function PaymentTable({
  plan, onChange, basePrice, cost, pixDiscountPct, maxInstallments, showMargins, fees, onFeesChange,
}: Props) {
  const [savingFees, setSavingFees] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [feeError, setFeeError] = useState("");

  const feeConfig = feesFromPercent(fees.pix, fees.card, fees.perInstallment);
  const custom = plan.length > 0;
  const sorted = [...plan].sort((a, b) => a.n - b.n);
  const planError = validateInstallmentPlan(sorted);

  // Sem plano próprio: escada padrão (preço dividido), igual à vitrine hoje.
  const defaultRows: PlanRow[] = Array.from(
    { length: Math.max(1, Math.min(25, maxInstallments)) },
    (_row, index) => ({ n: index + 1, price: basePrice }),
  );
  const rows = custom ? sorted : defaultRows;

  const pixPrice = Math.round(basePrice * (100 - pixDiscountPct)) / 100;
  const pixNet = netAfterFee(pixPrice, feeConfig.pix);
  const pixProfit = Math.round((pixNet - cost) * 100) / 100;
  const pixMargin = pixPrice > 0 ? Math.round((pixProfit / pixPrice) * 1000) / 10 : 0;

  const evaluations = rows.map((row) => evaluatePlanRow(row, cost, feeConfig));
  const worst = evaluations.length ? evaluations.reduce((min, row) => (row.profit < min.profit ? row : min)) : null;
  const best = evaluations.length ? evaluations.reduce((max, row) => (row.profit > max.profit ? row : max)) : null;

  const usedTiers = new Set(sorted.map((row) => row.n));
  const nextTier = (() => {
    for (let n = 1; n <= 25; n++) if (!usedTiers.has(n)) return n;
    return null;
  })();

  function customize() {
    // Materializa a escada padrão como plano editável do produto.
    onChange([1, 3, 6, 10, 12].filter((n) => n <= maxInstallments).map((n) => ({ n, price: basePrice })));
  }

  function generateLadder() {
    if (!basePrice) return;
    // Repassa a taxa de cada faixa ao cliente: o líquido fica igual ao da venda à vista.
    const targetNet = basePrice * (1 - feeConfig.cardBase);
    onChange([1, 3, 6, 10, 12, 18, 24]
      .filter((n) => n <= maxInstallments)
      .map((n) => ({ n, price: Math.max(basePrice, Math.round((targetNet / (1 - cardFeeRate(n, feeConfig))) * 100) / 100) })));
  }

  function addTier() {
    if (nextTier === null) return;
    const last = sorted[sorted.length - 1];
    onChange([...sorted, { n: nextTier, price: last ? minimumForNextTier(last.price) : basePrice }]);
  }

  async function saveFees() {
    setSavingFees(true);
    setFeeSaved(false);
    setFeeError("");
    try {
      const current = await fetch("/api/admin/settings", { cache: "no-store" }).then((response) => response.json());
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current.content,
          pixFeePct: fees.pix,
          cardFeePct: fees.card,
          cardInstallmentFeePct: fees.perInstallment,
        }),
      });
      if (response.ok) setFeeSaved(true);
      else setFeeError("Não foi possível salvar as taxas como padrão.");
    } catch {
      setFeeError("Falha de conexão ao salvar as taxas.");
    }
    setSavingFees(false);
  }

  return (
    <div className="payment-table">
      {/* TAXAS DA MAQUININHA */}
      {showMargins && (
        <div className="fee-simulator">
          <div className="fee-inputs">
            <label>Taxa PIX (%)
              <input type="number" step="0.01" min="0" max="20" value={fees.pix}
                onChange={(event) => onFeesChange({ ...fees, pix: Number(event.target.value) })} />
            </label>
            <label>Taxa cartão à vista (%)
              <input type="number" step="0.01" min="0" max="20" value={fees.card}
                onChange={(event) => onFeesChange({ ...fees, card: Number(event.target.value) })} />
            </label>
            <label>Acréscimo por parcela (%)
              <input type="number" step="0.01" min="0" max="10" value={fees.perInstallment}
                onChange={(event) => onFeesChange({ ...fees, perInstallment: Number(event.target.value) })} />
            </label>
            <button type="button" className="button ghost sm" disabled={savingFees} onClick={() => void saveFees()}>
              <Save size={13} /> {savingFees ? "Salvando..." : feeSaved ? "Salvo!" : "Salvar taxas como padrão"}
            </button>
          </div>
          <small className="finance-hint">Taxa real da sua maquininha. A tabela recalcula na hora; salvar aplica em todo o painel.</small>
          {feeError && <div className="form-error" style={{ marginTop: "0.4rem" }}>{feeError}</div>}
        </div>
      )}

      {/* MODO DA TABELA */}
      <div className="planner-head">
        <div>
          <strong>{custom ? "Tabela personalizada deste produto" : "Tabela padrão (preço dividido)"}</strong>
          <small>
            {custom
              ? "Você define quanto o cliente paga em cada faixa. Salvo com o produto e exibido na vitrine."
              : "Hoje a vitrine divide o preço de tabela pelas parcelas. Personalize para cobrar mais de quem parcela mais."}
          </small>
        </div>
        <div className="planner-actions">
          {!custom && (
            <button type="button" className="button primary sm" onClick={customize} disabled={!basePrice}>
              <Plus size={13} /> Personalizar parcelas
            </button>
          )}
          {custom && <>
            <button type="button" className="button ghost sm" onClick={generateLadder} disabled={!basePrice}>
              <Sparkles size={13} /> Escada automática
            </button>
            <button type="button" className="button ghost sm" onClick={addTier} disabled={nextTier === null}>
              <Plus size={13} /> Faixa
            </button>
            <button type="button" className="button ghost sm" onClick={() => onChange([])}>
              <RotateCcw size={13} /> Voltar ao padrão
            </button>
          </>}
        </div>
      </div>

      {planError && <div className="form-error" style={{ marginBottom: "0.6rem" }}>{planError}</div>}

      <div className="insight-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Forma</th>
              <th className="cell-num"><Store size={11} style={{ verticalAlign: "-1px" }} /> Cliente paga (vitrine)</th>
              <th className="cell-num">Por parcela</th>
              {showMargins && <>
                <th className="cell-num">Taxa</th>
                <th className="cell-num"><Wallet size={11} style={{ verticalAlign: "-1px" }} /> Você recebe</th>
                <th className="cell-num">Lucro</th>
                <th className="cell-num">Margem</th>
              </>}
              {custom && <th className="cell-action" />}
            </tr>
          </thead>
          <tbody>
            {/* PIX sempre primeiro: é o meio mais usado e o de melhor margem. */}
            <tr className="highlight-row">
              <td><strong>PIX</strong> <small className="cell-muted">(−{pixDiscountPct}%)</small></td>
              <td className="cell-num"><strong>{money(pixPrice)}</strong></td>
              <td className="cell-num">à vista</td>
              {showMargins && <>
                <td className="cell-num">{fees.pix.toFixed(2)}%</td>
                <td className="cell-num">{money(pixNet)}</td>
                <td className="cell-num"><strong className={pixProfit >= 0 ? "good" : "bad"}>{money(pixProfit)}</strong></td>
                <td className="cell-num">{pixMargin}%</td>
              </>}
              {custom && <td className="cell-action cell-muted">—</td>}
            </tr>

            {rows.map((row, index) => {
              const evaluated = evaluations[index];
              const previous = index > 0 ? rows[index - 1] : null;
              const invalid = previous ? row.price < previous.price : false;
              return (
                <tr key={`${row.n}-${index}`} className={showMargins && evaluated.profit <= 0 ? "row-loss" : ""}>
                  <td>
                    {custom ? (
                      <input type="number" min={1} max={25} value={row.n}
                        onChange={(event) => onChange(sorted.map((item, position) => position === index ? { ...item, n: Number(event.target.value) } : item))}
                        style={{ width: 62, minHeight: 30 }} />
                    ) : (
                      <>Cartão {row.n === 1 ? "à vista" : `${row.n}x`}</>
                    )}
                  </td>
                  <td className="cell-num">
                    {custom ? (
                      <input type="number" step="0.01" min={previous ? minimumForNextTier(previous.price) : 0.01} value={row.price}
                        onChange={(event) => onChange(sorted.map((item, position) => position === index ? { ...item, price: Number(event.target.value) } : item))}
                        style={{ width: 112, minHeight: 30, borderColor: invalid ? "#c2342c" : undefined }}
                        title={previous ? `Mínimo ${money(minimumForNextTier(previous.price))}` : undefined} />
                    ) : (
                      <strong>{money(row.price)}</strong>
                    )}
                  </td>
                  <td className="cell-num"><strong>{row.n}× {money(evaluated.installmentValue)}</strong></td>
                  {showMargins && <>
                    <td className="cell-num">{(cardFeeRate(row.n, feeConfig) * 100).toFixed(2)}%</td>
                    <td className="cell-num">{money(evaluated.netReceived)}</td>
                    <td className="cell-num"><strong className={evaluated.profit >= 0 ? "good" : "bad"}>{money(evaluated.profit)}</strong></td>
                    <td className="cell-num">{evaluated.marginPct}%</td>
                  </>}
                  {custom && (
                    <td className="cell-action">
                      <button type="button" className="row-action-btn" onClick={() => onChange(sorted.filter((_item, position) => position !== index))} title="Remover faixa">
                        <Minus size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showMargins && worst && best && !planError && (
        <div className={`fee-verdict ${Math.min(worst.profit, pixProfit) <= 0 ? "bad" : worst.marginPct < 10 ? "warn" : "good"}`}>
          {Math.min(worst.profit, pixProfit) <= 0
            ? <strong>PERDE dinheiro em {pixProfit <= 0 ? "PIX" : `${worst.installments}x`}. Suba o preço dessa faixa ou renegocie a taxa.</strong>
            : worst.profit === best.profit
              ? <strong>Lucro constante de {money(worst.profit)} em todas as faixas do cartão — a taxa está repassada ao cliente. No PIX: {money(pixProfit)}.</strong>
              : <strong>Lucro do cartão vai de {money(worst.profit)} ({worst.installments}x, margem {worst.marginPct}%) até {money(best.profit)} ({best.installments}x). No PIX: {money(pixProfit)}.</strong>}
        </div>
      )}

      {showMargins && cost > 0 && (
        <p className="finance-hint">
          Preço mínimo para não sair no prejuízo: <b>{money(breakEvenPrice(cost, feeConfig.pix))}</b> no PIX ·{" "}
          <b>{money(breakEvenPrice(cost, feeConfig.cardBase))}</b> no cartão à vista.
        </p>
      )}
    </div>
  );
}

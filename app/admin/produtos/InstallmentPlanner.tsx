"use client";

import { Minus, Plus, TrendingUp } from "lucide-react";
import {
  cardFeeRate,
  evaluatePlanRow,
  feesFromPercent,
  minimumForNextTier,
  validateInstallmentPlan,
  type PlanRow,
} from "../../../src/lib/pricing";

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  plan: PlanRow[];
  onChange: (plan: PlanRow[]) => void;
  basePrice: number;
  cost: number;
  showMargins: boolean;
  fees: { pix: number; card: number; perInstallment: number };
};

/**
 * Planejador da tabela de parcelas: você define o total de cada faixa,
 * o sistema calcula parcela, taxa, recebimento e lucro — e trava faixa
 * seguinte com total menor que a anterior.
 */
export default function InstallmentPlanner({ plan, onChange, basePrice, cost, showMargins, fees }: Props) {
  const feeConfig = feesFromPercent(fees.pix, fees.card, fees.perInstallment);
  const sorted = [...plan].sort((a, b) => a.n - b.n);
  const error = validateInstallmentPlan(sorted);
  const usedTiers = new Set(sorted.map((row) => row.n));
  const nextTier = (() => {
    for (let n = 1; n <= 25; n++) if (!usedTiers.has(n)) return n;
    return null;
  })();

  function addTier() {
    if (nextTier === null) return;
    const last = sorted[sorted.length - 1];
    const suggested = last ? minimumForNextTier(last.price) : basePrice || 0;
    onChange([...sorted, { n: nextTier, price: Math.round(suggested * 100) / 100 }]);
  }

  function updateRow(index: number, patch: Partial<PlanRow>) {
    onChange(sorted.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(sorted.filter((_row, position) => position !== index));
  }

  function generateLadder() {
    // Escada automática: repassa a taxa de cada faixa ao cliente, mantendo
    // o mesmo lucro líquido da venda à vista.
    const base = basePrice || 0;
    if (!base) return;
    const targetNet = base * (1 - feeConfig.cardBase);
    const rows: PlanRow[] = [];
    for (const n of [1, 3, 6, 10, 12, 18, 24]) {
      const price = Math.round((targetNet / (1 - cardFeeRate(n, feeConfig))) * 100) / 100;
      rows.push({ n, price: Math.max(base, price) });
    }
    onChange(rows);
  }

  return (
    <div className="planner">
      <div className="planner-head">
        <div>
          <strong>Tabela de parcelas deste produto</strong>
          <small>Defina o total de cada faixa. O cliente que parcela mais nunca paga menos.</small>
        </div>
        <div className="planner-actions">
          <button type="button" className="button ghost sm" onClick={generateLadder} disabled={!basePrice}>
            <TrendingUp size={13} /> Gerar escada automática
          </button>
          <button type="button" className="button ghost sm" onClick={addTier} disabled={nextTier === null}>
            <Plus size={13} /> Adicionar faixa
          </button>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: "0.6rem" }}>{error}</div>}

      {sorted.length === 0 ? (
        <p className="finance-hint">
          Sem tabela própria: a loja mostra o preço de tabela dividido pelo número de parcelas.
          Clique em <b>Adicionar faixa</b> para cobrar mais de quem parcela mais.
        </p>
      ) : (
        <div className="insight-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 92 }}>Parcelas</th>
                <th style={{ width: 140 }}>Total cobrado</th>
                <th className="cell-num">Por parcela</th>
                <th className="cell-num">Taxa</th>
                {showMargins && <><th className="cell-num">Você recebe</th><th className="cell-num">Lucro</th><th className="cell-num">Margem</th></>}
                <th className="cell-action" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => {
                const evaluated = evaluatePlanRow(row, cost, feeConfig);
                const previous = index > 0 ? sorted[index - 1] : null;
                const invalid = previous ? row.price < previous.price : false;
                const loss = showMargins && evaluated.profit <= 0;
                return (
                  <tr key={`${row.n}-${index}`} className={loss ? "row-loss" : ""}>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={row.n}
                        onChange={(event) => updateRow(index, { n: Number(event.target.value) })}
                        style={{ width: 70, minHeight: 32 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={previous ? minimumForNextTier(previous.price) : 0.01}
                        step="0.01"
                        value={row.price}
                        onChange={(event) => updateRow(index, { price: Number(event.target.value) })}
                        style={{ width: 120, minHeight: 32, borderColor: invalid ? "#c2342c" : undefined }}
                        title={previous ? `Mínimo ${money(minimumForNextTier(previous.price))} (acima da faixa de ${previous.n}x)` : undefined}
                      />
                    </td>
                    <td className="cell-num"><strong>{row.n}× {money(evaluated.installmentValue)}</strong></td>
                    <td className="cell-num">{(cardFeeRate(row.n, feeConfig) * 100).toFixed(2)}%</td>
                    {showMargins && <>
                      <td className="cell-num">{money(evaluated.netReceived)}</td>
                      <td className="cell-num"><strong className={evaluated.profit >= 0 ? "good" : "bad"}>{money(evaluated.profit)}</strong></td>
                      <td className="cell-num">{evaluated.marginPct}%</td>
                    </>}
                    <td className="cell-action">
                      <button type="button" className="row-action-btn" onClick={() => removeRow(index)} title="Remover faixa">
                        <Minus size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showMargins && sorted.length > 0 && !error && (() => {
        const evaluations = sorted.map((row) => evaluatePlanRow(row, cost, feeConfig));
        const worst = evaluations.reduce((min, row) => (row.profit < min.profit ? row : min), evaluations[0]);
        const best = evaluations.reduce((max, row) => (row.profit > max.profit ? row : max), evaluations[0]);
        return (
          <div className={`fee-verdict ${worst.profit <= 0 ? "bad" : worst.marginPct < 10 ? "warn" : "good"}`} style={{ marginTop: "0.6rem" }}>
            {worst.profit <= 0
              ? <strong>PERDE {money(Math.abs(worst.profit))} em {worst.installments}x. Suba o total dessa faixa para pelo menos {money(cost / (1 - cardFeeRate(worst.installments, feeConfig)))}.</strong>
              : <strong>Lucra de {money(worst.profit)} ({worst.installments}x, margem {worst.marginPct}%) até {money(best.profit)} ({best.installments}x). Escada saudável.</strong>}
          </div>
        );
      })()}
    </div>
  );
}

// Matemática de precificação e margem do produto.
// Pura de propósito: entra número, sai número — testável sem banco.

/**
 * Taxas do gateway (Mercado Pago, referência de mercado BR).
 * Ajuste aqui se negociar taxas melhores — todo o painel usa estes valores.
 */
export const GATEWAY_FEES = {
  pix: 0.0099, // 0,99%
  cardOnSight: 0.0498, // crédito à vista, recebimento em ~14 dias
  cardInstallmentBase: 0.0498, // base do parcelado
  cardInstallmentPerMonth: 0.0208, // acréscimo por parcela adicional quando a loja absorve
} as const;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Preço final no PIX após o desconto da loja. */
export function pixPrice(price: number, pixDiscountPct: number): number {
  return round2(price * (100 - pixDiscountPct) / 100);
}

/** Quanto entra na conta depois da taxa do gateway. */
export function netAfterFee(price: number, feeRate: number): number {
  return round2(price * (1 - feeRate));
}

/** Taxas efetivamente cobradas nesta loja (vêm das Configurações). */
export type FeeConfig = {
  pix: number; // fração, ex.: 0.0099
  cardBase: number; // crédito à vista
  cardPerInstallment: number; // acréscimo por parcela extra
};

export const DEFAULT_FEES: FeeConfig = {
  pix: GATEWAY_FEES.pix,
  cardBase: GATEWAY_FEES.cardInstallmentBase,
  cardPerInstallment: GATEWAY_FEES.cardInstallmentPerMonth,
};

/** Converte percentuais da configuração (0,99) em frações (0,0099). */
export function feesFromPercent(pixPct: number, cardPct: number, perInstallmentPct: number): FeeConfig {
  return {
    pix: pixPct / 100,
    cardBase: cardPct / 100,
    cardPerInstallment: perInstallmentPct / 100,
  };
}

/** Taxa efetiva do crédito para N parcelas absorvidas pela loja. */
export function cardFeeRate(installments: number, fees: FeeConfig = DEFAULT_FEES): number {
  const extra = Math.max(0, installments - 1) * fees.cardPerInstallment;
  return fees.cardBase + extra;
}

export type InstallmentRow = {
  installments: number;
  installmentValue: number;
  total: number;
  netReceived: number;
  profit: number;
  marginPct: number;
};

/**
 * Escada de parcelas: quanto o cliente paga por parcela e quanto sobra
 * de lucro real em cada opção, já descontada a taxa do cartão.
 */
export function installmentLadder(price: number, cost: number, maxInstallments: number, fees: FeeConfig = DEFAULT_FEES): InstallmentRow[] {
  const rows: InstallmentRow[] = [];
  const limit = Math.max(1, Math.min(24, maxInstallments));
  for (let n = 1; n <= limit; n++) {
    const netReceived = netAfterFee(price, cardFeeRate(n, fees));
    const profit = round2(netReceived - cost);
    rows.push({
      installments: n,
      installmentValue: round2(price / n),
      total: round2(price),
      netReceived,
      profit,
      marginPct: price > 0 ? round2((profit / price) * 100) : 0,
    });
  }
  return rows;
}

/**
 * Preço máximo de compra para manter a margem líquida desejada,
 * considerando a taxa do meio de pagamento mais usado.
 * É a resposta de "quanto no máximo posso pagar neste aparelho".
 */
export function maxPurchasePrice(salePrice: number, targetMarginPct: number, feeRate: number): number {
  const net = salePrice * (1 - feeRate);
  const target = net * (1 - targetMarginPct / 100);
  return round2(Math.max(0, target));
}

/** Preço mínimo de venda para não sair no prejuízo depois da taxa. */
export function breakEvenPrice(cost: number, feeRate: number): number {
  if (feeRate >= 1) return 0;
  return round2(cost / (1 - feeRate));
}

/** Margem e markup de uma venda. */
export function marginOf(price: number, cost: number) {
  const profit = round2(price - cost);
  return {
    profit,
    marginPct: price > 0 ? round2((profit / price) * 100) : 0,
    markupPct: cost > 0 ? round2((profit / cost) * 100) : null,
  };
}

export type PlanRow = { n: number; price: number };

/**
 * Tabela de parcelamento própria do produto.
 * Regra do negócio: o total nunca pode cair conforme o número de parcelas
 * aumenta — quem parcela mais paga igual ou mais, nunca menos.
 */
export function validateInstallmentPlan(plan: PlanRow[]): string | null {
  if (!plan.length) return null;
  const sorted = [...plan].sort((a, b) => a.n - b.n);
  for (const row of sorted) {
    if (!Number.isInteger(row.n) || row.n < 1 || row.n > 25) return "Parcelas válidas: de 1 a 25.";
    if (!(row.price > 0)) return `Informe o valor total para ${row.n}x.`;
  }
  const seen = new Set(sorted.map((row) => row.n));
  if (seen.size !== sorted.length) return "Há número de parcelas repetido.";
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].price < sorted[i - 1].price) {
      return `O total de ${sorted[i].n}x (${sorted[i].price.toFixed(2)}) não pode ser menor que o de ${sorted[i - 1].n}x (${sorted[i - 1].price.toFixed(2)}).`;
    }
  }
  return null;
}

/** Menor total permitido para a faixa seguinte (trava do valor anterior). */
export function minimumForNextTier(previousPrice: number): number {
  // Um centavo acima impede repetir a mesma faixa de preço.
  return round2(previousPrice + 0.01);
}

/**
 * Linha do plano com o resultado financeiro real: quanto o cliente paga,
 * quanto entra após a taxa daquela quantidade de parcelas, e o lucro.
 */
export function evaluatePlanRow(row: PlanRow, cost: number, fees: FeeConfig = DEFAULT_FEES): InstallmentRow {
  const netReceived = netAfterFee(row.price, cardFeeRate(row.n, fees));
  const profit = round2(netReceived - cost);
  return {
    installments: row.n,
    installmentValue: round2(row.price / row.n),
    total: round2(row.price),
    netReceived,
    profit,
    marginPct: row.price > 0 ? round2((profit / row.price) * 100) : 0,
  };
}

/**
 * Quanto ainda dá para investir neste produto sem encalhar:
 * ritmo de venda × meses de cobertura, menos o que já está em estoque.
 */
export function reorderSuggestion(unitsPerMonth: number, currentStock: number, coverageMonths = 2) {
  const target = Math.ceil(unitsPerMonth * coverageMonths);
  const buy = Math.max(0, target - currentStock);
  return { targetUnits: target, unitsToBuy: buy };
}

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

/** Taxa efetiva do crédito para N parcelas absorvidas pela loja. */
export function cardFeeRate(installments: number): number {
  const extra = Math.max(0, installments - 1) * GATEWAY_FEES.cardInstallmentPerMonth;
  return GATEWAY_FEES.cardInstallmentBase + extra;
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
export function installmentLadder(price: number, cost: number, maxInstallments: number): InstallmentRow[] {
  const rows: InstallmentRow[] = [];
  const limit = Math.max(1, Math.min(24, maxInstallments));
  for (let n = 1; n <= limit; n++) {
    const netReceived = netAfterFee(price, cardFeeRate(n));
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

/**
 * Quanto ainda dá para investir neste produto sem encalhar:
 * ritmo de venda × meses de cobertura, menos o que já está em estoque.
 */
export function reorderSuggestion(unitsPerMonth: number, currentStock: number, coverageMonths = 2) {
  const target = Math.ceil(unitsPerMonth * coverageMonths);
  const buy = Math.max(0, target - currentStock);
  return { targetUnits: target, unitsToBuy: buy };
}

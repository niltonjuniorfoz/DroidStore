// Matemática dos lotes de compra. Tudo em centavos-seguros (arredondamento
// só na borda), pura de propósito para ser testável.

export const PURCHASE_CURRENCIES = ["USD", "USDT", "BRL"] as const;
export type PurchaseCurrency = (typeof PURCHASE_CURRENCIES)[number];

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Custo unitário em BRL: valor na moeda × cotação + rateio do frete do lote.
 */
export function unitCostBrl(unitCostFx: number, exchangeRate: number, freightBrl: number, quantity: number): number {
  if (quantity <= 0) throw new Error("Quantidade deve ser positiva.");
  return round2(unitCostFx * exchangeRate + freightBrl / quantity);
}

/**
 * Custo médio ponderado após a entrada do lote.
 * Estoque atual zerado ou custo atual zerado → custo do lote vale sozinho.
 */
export function weightedAverageCost(
  currentStock: number,
  currentUnitCost: number,
  lotQuantity: number,
  lotUnitCost: number,
): number {
  const safeStock = Math.max(0, currentStock);
  const base = currentUnitCost > 0 ? safeStock : 0;
  const totalUnits = base + lotQuantity;
  if (totalUnits <= 0) return round2(lotUnitCost);
  return round2((base * currentUnitCost + lotQuantity * lotUnitCost) / totalUnits);
}

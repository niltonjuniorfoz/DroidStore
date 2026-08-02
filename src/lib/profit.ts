export function calculateGrossProfit(revenue: number, cost: number) {
  const grossProfit = Math.round((revenue - cost) * 100) / 100;
  const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 1_000_000) / 10_000 : 0;
  return { grossProfit, grossMargin };
}

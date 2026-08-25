import type { AuraRoundingRule } from "@prisma/client";

export type AuraPriceInput = {
  supplierPriceUsd: number;
  exchangeRate: number;
  markupPercent: number;
  roundingRule: AuraRoundingRule;
};

export type AuraPriceResult = {
  supplierPriceUsd: number;
  exchangeRate: number;
  markupPercent: number;
  convertedCostBrl: number;
  priceBeforeRounding: number;
  salePriceBrl: number;
};

function cents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function roundAuraPrice(value: number, rule: AuraRoundingRule): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error("Preço inválido para arredondamento.");
  switch (rule) {
    case "NEAREST_10": return Math.round(value / 10) * 10;
    case "CEIL_50": return Math.ceil(value / 50) * 50;
    case "CEIL_100": return Math.ceil(value / 100) * 100;
    case "CEIL_10":
    default: return Math.ceil(value / 10) * 10;
  }
}

export function calculateAuraPrice(input: AuraPriceInput): AuraPriceResult {
  if (!Number.isFinite(input.supplierPriceUsd) || input.supplierPriceUsd <= 0) throw new Error("Preço USD deve ser maior que zero.");
  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0 || input.exchangeRate > 100) throw new Error("Cotação USD inválida.");
  if (!Number.isFinite(input.markupPercent) || input.markupPercent < 0 || input.markupPercent > 1000) throw new Error("Margem inválida.");
  const convertedCostBrl = cents(input.supplierPriceUsd * input.exchangeRate);
  const priceBeforeRounding = cents(convertedCostBrl * (1 + input.markupPercent / 100));
  return {
    ...input,
    convertedCostBrl,
    priceBeforeRounding,
    salePriceBrl: roundAuraPrice(priceBeforeRounding, input.roundingRule),
  };
}

export function chooseAuraPriceBasis(input: {
  available: boolean;
  supplierPriceUsd: number | null;
  lastKnownPriceUsd: number | null;
  existingPrice?: number;
}) {
  if (input.available && input.supplierPriceUsd && input.supplierPriceUsd > 0) {
    return { basisUsd: input.supplierPriceUsd, preserveExistingPrice: false, reason: "current" as const };
  }
  if (!input.available && input.existingPrice && input.existingPrice > 0) {
    return { basisUsd: null, preserveExistingPrice: true, reason: "existing" as const };
  }
  if (!input.available && input.lastKnownPriceUsd && input.lastKnownPriceUsd > 0) {
    return { basisUsd: input.lastKnownPriceUsd, preserveExistingPrice: false, reason: "historical" as const };
  }
  return { basisUsd: null, preserveExistingPrice: false, reason: "missing" as const };
}

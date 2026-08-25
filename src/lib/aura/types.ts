import type { AuraImportAction, AuraRoundingRule, Condition } from "@prisma/client";

export type AuraMessage = {
  code: string;
  message: string;
  severity: "warning" | "error";
};

export type AuraSpecification = { label: string; value: string; position: number };

export type NormalizedAuraProduct = {
  schemaVersion: number;
  sku: string;
  name: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  sourceCondition: string;
  sourceName: string;
  sourceDomain: string;
  sourceUrl: string;
  sourceGroup: string;
  sourceSubgroup: string;
  sourceCategory: string;
  categoryPath: string[];
  supplierPriceUsd: number | null;
  lastKnownPriceUsd: number | null;
  currency: string;
  available: boolean;
  description: string;
  images: string[];
  specifications: AuraSpecification[];
  groupKey: string;
  validationStatus: "ok" | "warning" | "error";
  importReady: boolean;
  messages: AuraMessage[];
  rawData: Record<string, unknown>;
};

export type AuraCategorySelection = {
  sourceGroup: string;
  optionIds: string[];
  persist?: boolean;
};

export type AuraBrandSelection = {
  sourceBrand: string;
  optionId?: string;
  createIfMissing?: boolean;
};

export type AuraConditionSelection = {
  sourceCondition: string;
  condition: Condition;
  persist?: boolean;
};

export type AuraMarkupSelection = {
  brand: string;
  markupPercent: number;
  persist?: boolean;
};

export type AuraExistingPolicies = {
  updateName: boolean;
  updateDescription: boolean;
  updateImages: boolean;
  replaceSpecifications: boolean;
  updateCategories: boolean;
};

export type AuraJobConfiguration = {
  brandMappings: AuraBrandSelection[];
  categories: AuraCategorySelection[];
  conditions: AuraConditionSelection[];
  markups: AuraMarkupSelection[];
  existing: AuraExistingPolicies;
  managedFilterIds?: string[];
  scopeBrands?: string[];
  columnMapping?: Record<string, string>;
};

export type AuraComputedItem = {
  action: AuraImportAction;
  condition?: Condition;
  optionIds: string[];
  managedFilterIds?: string[];
  exchangeRate?: number;
  markupPercent?: number;
  roundingRule?: AuraRoundingRule;
  convertedCostBrl?: number;
  salePriceBrl?: number;
  priceBasisUsd?: number;
  preserveExistingPrice?: boolean;
  existingVariantId?: string;
  existingProductId?: string;
  linkedToSupplier?: boolean;
  requiresSupplierLink?: boolean;
  approved?: boolean;
  ignored?: boolean;
};

export const DEFAULT_EXISTING_POLICIES: AuraExistingPolicies = {
  updateName: false,
  updateDescription: false,
  updateImages: false,
  replaceSpecifications: false,
  updateCategories: false,
};

export const EMPTY_SOURCE_CONDITION = "(sem condição)";

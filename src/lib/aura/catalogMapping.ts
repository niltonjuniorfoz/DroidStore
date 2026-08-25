export type CatalogOptionLike = {
  id: string;
  label: string;
  slug?: string;
  active?: boolean;
};

export type CatalogFilterLike = {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
  options: CatalogOptionLike[];
};

export function normalizeCatalogValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function findCatalogFilter<T extends CatalogFilterLike>(filters: T[], target: "Marca" | "Categoria") {
  const normalizedTarget = normalizeCatalogValue(target);
  const acceptedNames = new Set([normalizedTarget, `${normalizedTarget}S`]);
  return filters.find((filter) => (
    filter.active !== false
    && [filter.name, filter.slug].some((value) => acceptedNames.has(normalizeCatalogValue(value.replace(/[-_]+/g, " "))))
  ));
}

export function findCatalogOption<T extends CatalogOptionLike>(filter: { options: T[] } | undefined, sourceLabel: string) {
  const normalizedLabel = normalizeCatalogValue(sourceLabel);
  return filter?.options.find((option) => (
    option.active !== false
    && [option.label, option.slug ?? ""].some((value) => normalizeCatalogValue(value.replace(/[-_]+/g, " ")) === normalizedLabel)
  ));
}

export function auraCategoryKey(sourceGroup: string) {
  return normalizeCatalogValue(sourceGroup);
}

export function buildAuraFilterOptionIds(brandOptionId?: string, categoryOptionId?: string) {
  return [...new Set([brandOptionId, categoryOptionId].filter((value): value is string => Boolean(value)))];
}

export function resolveAuraFilterOptionIds(input: {
  sourceBrand: string;
  sourceGroup: string;
  brandMappings: Array<{ sourceBrand: string; optionId?: string }>;
  categoryMappings: Array<{ sourceGroup: string; optionIds: string[] }>;
}) {
  const brandOptionId = input.brandMappings.find((mapping) => (
    normalizeCatalogValue(mapping.sourceBrand) === normalizeCatalogValue(input.sourceBrand)
  ))?.optionId;
  const categoryOptionId = input.categoryMappings.find((mapping) => (
    auraCategoryKey(mapping.sourceGroup) === auraCategoryKey(input.sourceGroup)
  ))?.optionIds[0];
  return {
    brandOptionId,
    categoryOptionId,
    optionIds: buildAuraFilterOptionIds(brandOptionId, categoryOptionId),
  };
}

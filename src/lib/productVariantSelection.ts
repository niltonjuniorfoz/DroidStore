import { getBaseModelName, type CatalogProduct } from "./catalog";

export type ProductVariantOption = {
  id: string;
  productId: string;
  sku?: string;
  slug: string;
  color: string;
  storage: string;
  condition: CatalogProduct["condition"];
  price: number;
  stock: number;
  available: boolean;
  imageUrl?: string;
  images?: string[];
  model3dUrl?: string | null;
};

const normalized = (value: string) => value
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR");

export function selectImagesForColor(
  images: Array<{ url: string; color?: string | null }> | undefined,
  color: string | null | undefined,
  fallbackUrl?: string | null,
) {
  const targetColor = normalized(color ?? "");
  const sourceImages = images ?? [];
  const matching = targetColor
    ? sourceImages.filter((image) => normalized(image.color ?? "") === targetColor)
    : [];
  const generic = sourceImages.filter((image) => !normalized(image.color ?? ""));
  const selected = matching.length
    ? [...matching, ...generic]
    : generic.length
      ? generic
      : sourceImages;
  const urls = [...new Set(selected.map((image) => image.url).filter(Boolean))];
  return urls.length ? urls : fallbackUrl ? [fallbackUrl] : [];
}

export function findMatchingProductVariant(
  variants: ProductVariantOption[],
  color: string,
  storage: string,
  condition: CatalogProduct["condition"],
) {
  const requestedColor = normalized(color);
  const requestedStorage = normalized(storage);

  return variants.find((variant) =>
    normalized(variant.color) === requestedColor
    && normalized(variant.storage) === requestedStorage
    && variant.condition === condition
  ) ?? variants.find((variant) =>
    normalized(variant.color) === requestedColor
    && normalized(variant.storage) === requestedStorage
  ) ?? variants.find((variant) => normalized(variant.color) === requestedColor);
}

export function applyProductVariant(product: CatalogProduct, variant: ProductVariantOption): CatalogProduct {
  const variantImages = variant.images?.filter(Boolean) ?? [];
  const imageUrl = variantImages[0] ?? variant.imageUrl ?? product.imageUrl;
  const images = variantImages.length
    ? variantImages
    : variant.imageUrl
      ? [variant.imageUrl, ...(product.images ?? []).filter((image) => image !== variant.imageUrl)]
      : product.images;

  return {
    ...product,
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku ?? product.sku,
    slug: variant.slug,
    name: `${getBaseModelName(product.name)} - ${variant.storage} - ${variant.color} - ${variant.condition}`,
    color: variant.color,
    storage: variant.storage,
    condition: variant.condition,
    price: variant.price,
    stock: variant.stock,
    available: variant.available,
    imageUrl,
    images,
    model3dUrl: variant.model3dUrl ?? product.model3dUrl,
  };
}

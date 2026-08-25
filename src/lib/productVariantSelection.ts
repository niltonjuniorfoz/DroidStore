import { getBaseModelName, type CatalogProduct } from "./catalog";

export type ProductVariantOption = {
  id: string;
  productId: string;
  slug: string;
  color: string;
  storage: string;
  condition: CatalogProduct["condition"];
  price: number;
  stock: number;
  available: boolean;
  imageUrl?: string;
  model3dUrl?: string | null;
};

const normalized = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

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
  const imageUrl = variant.imageUrl ?? product.imageUrl;
  const images = imageUrl
    ? [imageUrl, ...(product.images ?? []).filter((image) => image !== imageUrl)]
    : product.images;

  return {
    ...product,
    id: variant.id,
    productId: variant.productId,
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

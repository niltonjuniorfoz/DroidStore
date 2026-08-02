import prisma from "./prisma";

export const MAX_FEATURED_PRODUCTS = 10;

export async function hasFeaturedCapacity(excludeProductId?: string) {
  const count = await prisma.product.count({
    where: {
      featured: true,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
  });
  return count < MAX_FEATURED_PRODUCTS;
}

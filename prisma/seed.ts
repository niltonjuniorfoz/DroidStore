import bcrypt from "bcryptjs";
import { PrismaClient, Condition, Role } from "@prisma/client";
import { products } from "../src/lib/catalog";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();
const conditionMap: Record<string, Condition> = {
  "Novo": Condition.NOVO,
  "Novo Reembalado": Condition.NOVO,
  "Excelente": Condition.EXCELENTE,
  "Muito Bom": Condition.MUITO_BOM,
  "Bom": Condition.BOM,
  "Outlet": Condition.OUTLET,
};

async function main() {
  const brandFilter = await prisma.catalogFilter.upsert({
    where: { slug: "marca" },
    update: {},
    create: { name: "Marca", slug: "marca", position: 0 },
  });
  const typeFilter = await prisma.catalogFilter.upsert({
    where: { slug: "tipo-de-produto" },
    update: {},
    create: { name: "Tipo de produto", slug: "tipo-de-produto", position: 1 },
  });
  const smartphoneOption = await prisma.catalogFilterOption.upsert({
    where: { filterId_slug: { filterId: typeFilter.id, slug: "smartphones" } },
    update: {},
    create: { filterId: typeFilter.id, label: "Smartphones", slug: "smartphones", position: 0 },
  });
  for (const [index, item] of products.entries()) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name, description: item.description, brand: item.brand, active: true, featured: index < 8,
        specifications: {
          deleteMany: {},
          create: (item.specifications ?? []).map((specification, position) => ({ ...specification, position })),
        },
      },
      create: {
        id: item.id, slug: item.slug, name: item.name, description: item.description, brand: item.brand, featured: index < 8,
        variants: { create: { color: item.color.toLocaleUpperCase("pt-BR"), storage: item.storage, condition: conditionMap[item.condition], price: item.price, stock: item.stock } },
        specifications: { create: (item.specifications ?? []).map((specification, position) => ({ ...specification, position })) },
      },
    });
    const brandSlug = slugify(item.brand);
    const brandOption = await prisma.catalogFilterOption.upsert({
      where: { filterId_slug: { filterId: brandFilter.id, slug: brandSlug } },
      update: { label: item.brand },
      create: { filterId: brandFilter.id, label: item.brand, slug: brandSlug, position: index },
    });
    await prisma.productFilterSelection.createMany({
      data: [
        { productId: product.id, optionId: brandOption.id },
        { productId: product.id, optionId: smartphoneOption.id },
      ],
      skipDuplicates: true,
    });
  }
  await prisma.siteContent.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
  if (await prisma.navigationItem.count() === 0) {
    await prisma.navigationItem.createMany({ data: [
      { label: "Todos os celulares", href: "/celulares", position: 0 },
      { label: "Novos", href: "/celulares?condition=Novo", position: 1 },
      { label: "Seminovos", href: "/celulares?condition=Excelente", position: 2 },
      { label: "Samsung", href: "/celulares?brand=Samsung", position: 3 },
      { label: "Motorola", href: "/celulares?brand=Motorola", position: 4 },
      { label: "Xiaomi", href: "/celulares?brand=Xiaomi", position: 5 },
    ] });
  }
  const email = process.env.ADMIN_INITIAL_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_INITIAL_PASSWORD precisa ter pelo menos 12 caracteres.");
    await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, name: "Administrador", password: await bcrypt.hash(password, 12), role: Role.ADMIN },
    });
  }
}

main().finally(() => prisma.$disconnect());

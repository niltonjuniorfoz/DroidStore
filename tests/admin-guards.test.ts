import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

// Invariantes de segurança verificadas por análise estática dos arquivos.
// Não substituem testes de integração, mas pegam a regressão mais perigosa:
// alguém criar uma rota admin sem autorização ou vazar costPrice na vitrine.

const root = join(import.meta.dirname, "..");

function routeFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...routeFiles(full));
    else if (entry.name === "route.ts") results.push(full);
  }
  return results;
}

describe("guardas das rotas administrativas", () => {
  it("toda rota em /api/admin usa requireAdmin", () => {
    const routes = routeFiles(join(root, "app", "api", "admin"));
    assert.ok(routes.length >= 15, `esperava várias rotas admin, achei ${routes.length}`);
    for (const file of routes) {
      const source = readFileSync(file, "utf8");
      assert.ok(
        source.includes("requireAdmin"),
        `${file.slice(root.length)} não chama requireAdmin`,
      );
    }
  });

  it("rotas públicas e libs da vitrine nunca mencionam costPrice", () => {
    const publicSources = [
      ...routeFiles(join(root, "app", "api", "products")),
      ...routeFiles(join(root, "app", "api", "catalog-filters")),
      ...routeFiles(join(root, "app", "api", "site-content")),
      join(root, "src", "lib", "storefront.ts"),
      join(root, "src", "lib", "catalog.ts"),
    ];
    for (const file of publicSources) {
      const source = readFileSync(file, "utf8");
      assert.ok(
        !source.includes("costPrice"),
        `${file.slice(root.length)} menciona costPrice — risco de vazar custo para a vitrine`,
      );
    }
  });

  it("rotas admin que devolvem variantes tiram costPrice para quem não é ADMIN", () => {
    const sensitive = ["products/route.ts", "products/[id]/route.ts", "inventory/route.ts", "orders/route.ts"];
    for (const suffix of sensitive) {
      const source = readFileSync(join(root, "app", "api", "admin", ...suffix.split("/")), "utf8");
      assert.ok(source.includes("isOwnerAdmin"), `${suffix} não diferencia ADMIN de MANAGER`);
      assert.ok(source.includes("costPrice: _costPrice"), `${suffix} não remove costPrice na resposta de MANAGER`);
    }
  });

  it("cron de expiração exige CRON_SECRET quando configurado", () => {
    const source = readFileSync(join(root, "app", "api", "cron", "expire-orders", "route.ts"), "utf8");
    assert.ok(source.includes("CRON_SECRET"), "rota de cron sem verificação de segredo");
  });
});

describe("seleção em massa de produtos", () => {
  it("não deixa o clique no ícone do checkbox abrir o editor", () => {
    const source = readFileSync(join(root, "app", "admin", "produtos", "page.tsx"), "utf8");
    assert.match(source, /target instanceof Element/);
    assert.match(source, /event\.stopPropagation\(\); toggleSelectId/);
  });

  it("permite selecionar a página e uma família agrupada", () => {
    const source = readFileSync(join(root, "app", "admin", "produtos", "page.tsx"), "utf8");
    assert.match(source, /Selecionar todos os produtos desta página/);
    assert.match(source, /toggleSelectGroup\(group\.items\)/);
    assert.match(source, /index \+= 5/);
  });
});

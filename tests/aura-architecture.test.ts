import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("migration Aura é aditiva e não reseta dados existentes", async () => {
  const sql = await source("prisma/migrations/20260825090000_aura_catalog_import/migration.sql");
  assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM|UPDATE\s+"Variant"/i);
  assert.match(sql, /SupplierCatalogItem_supplierId_sku_key/);
  assert.match(sql, /AuraImportItem_jobId_status_idx/);
});

test("serviço Aura cria stock zero e nunca cria StockMovement", async () => {
  const process = await source("src/lib/aura/processService.ts");
  assert.match(process, /stock:\s*0/);
  assert.doesNotMatch(process, /StockMovement|stockMovement/);
  assert.match(process, /dropshipAvailable:\s*input\.source\.available/);
  assert.match(process, /productSpecification/);
  assert.match(process, /productFilterSelection/);
  assert.match(process, /take:\s*Math\.max\(1, Math\.min\(batchSize, 20\)\)/);
  assert.match(process, /status !== "PROCESSING"/);
  assert.match(process, /status: "CANCELLED"/);
  assert.match(process, /if \(policies\.updateCategories\)/);
  assert.match(process, /option: \{ filterId: \{ in: input\.computed\.managedFilterIds \} \}/);
  assert.match(process, /sourceCategory: input\.source\.sourceCategory/);
  assert.match(process, /sourceSubgroup: input\.source\.sourceSubgroup/);
  assert.match(process, /categoryPath: json\(input\.source\.categoryPath\)/);
});

test("rollback protege produtos que já receberam pedidos", async () => {
  const rollback = await source("src/lib/aura/rollbackService.ts");
  assert.match(rollback, /orderItems/);
  assert.match(rollback, /pedido associado/);
  assert.match(rollback, /PARTIAL_ROLLBACK/);
  assert.match(rollback, /price:\s*String\(beforeVariant\.price\)/);
  assert.match(rollback, /dropshipAvailable:\s*Boolean\(beforeVariant\.dropshipAvailable\)/);
});

test("XLSX operacional não altera conteúdo editorial", async () => {
  const sync = await source("src/lib/aura/supplierSync.ts");
  const processBlock = sync.slice(sync.indexOf("processSupplierSyncBatch"));
  assert.doesNotMatch(processBlock, /prisma\.product\.update\(|productImage|productSpecification|productFilterSelection/);
  assert.match(processBlock, /supplierPriceUsd/);
  assert.match(processBlock, /dropshipAvailable/);
  assert.doesNotMatch(processBlock, /supplierCatalogItem\.findUnique/);
  assert.match(processBlock, /supplierCatalogItem\.findMany/);
});

test("prévia oferece os filtros operacionais obrigatórios", async () => {
  const route = await source("app/api/admin/aura-import/[id]/preview/route.ts");
  for (const filter of ["action", "status", "availability", "brand", "group", "subgroup", "optionId", "condition", "identity", "q"]) {
    assert.match(route, new RegExp(`searchParams\\.get\\(\"${filter}\"\\)`), filter);
  }
  const service = await source("src/lib/aura/jobService.ts");
  assert.match(service, /sourceData:\s*\{ path: \["model"\], string_contains: query \}/);
});

test("imagens usam concorrência limitada, ordem estável e cache pela origem", async () => {
  const images = await source("src/lib/aura/images.ts");
  assert.match(images, /mapLimit\(uniqueUrls, 4/);
  assert.match(images, /supplierId_sourceUrl/);
  assert.match(images, /results\[index\]/);
});

test("todas as rotas novas usam guarda Admin", async () => {
  const routes = [
    "app/api/admin/aura-import/upload/route.ts",
    "app/api/admin/aura-import/[id]/configure/route.ts",
    "app/api/admin/aura-import/[id]/process-next/route.ts",
    "app/api/admin/aura-import/[id]/rollback/route.ts",
    "app/api/admin/supplier-sync/preview/route.ts",
    "app/api/admin/supplier-sync/configure/route.ts",
  ];
  for (const route of routes) assert.match(await source(route), /requireAdmin/);
});

test("upload Aura pequeno não depende do filesystem temporário da Vercel", async () => {
  const route = await source("app/api/admin/aura-import/upload/route.ts");
  const page = await source("app/admin/produtos/importar/page.tsx");
  assert.match(route, /multipart\/form-data/);
  assert.match(route, /Buffer\.from\(await file\.arrayBuffer\(\)\)/);
  assert.match(page, /file\.size <= 4 \* 1024 \* 1024/);
  assert.match(page, /form\.set\("file", file\)/);
});

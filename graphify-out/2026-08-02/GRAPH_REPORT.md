# Graph Report - Site Android  (2026-08-02)

## Corpus Check
- 141 files · ~622,105 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 644 nodes · 1136 edges · 39 communities (29 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `46df1299`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- AppChrome.tsx
- brazil.ts
- catalog.ts
- ProductPageClient.tsx
- devDependencies
- MegaMenu.tsx
- compilerOptions
- dependencies
- sendPaidOrderEmail
- produtos/page.tsx
- What You Must Do When Invoked
- ai-product/route.ts
- planilha/page.tsx
- admin/page.tsx
- estoque/page.tsx
- filtros/page.tsx
- vercel.json
- next.config.mjs
- next-env.d.ts
- { GET, POST }
- requireAdmin
- 2. Estrutura do Cabeçalho (Header STORE BR)
- app/page.tsx
- graphify reference: extra exports and benchmark
- DroidStore
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `requireAdmin()` - 51 edges
2. `isOwnerAdmin()` - 27 edges
3. `useSiteContent()` - 18 edges
4. `compilerOptions` - 15 edges
5. `formatBrazilPhone()` - 14 edges
6. `What You Must Do When Invoked` - 12 edges
7. `useCart()` - 12 edges
8. `previewProductsWorkbook()` - 12 edges
9. `CatalogProduct` - 11 edges
10. `getCatalogSection()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `DELETE()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/products/[id]/route.ts → src/lib/admin.ts
- `AdminConfiguracoes()` --calls--> `formatBrazilPhone()`  [EXTRACTED]
  app/admin/configuracoes/page.tsx → src/lib/brazil.ts
- `AdminPedidos()` --calls--> `formatBrazilPhone()`  [EXTRACTED]
  app/admin/pedidos/page.tsx → src/lib/brazil.ts
- `AdminProdutos()` --calls--> `calculateGrossProfit()`  [EXTRACTED]
  app/admin/produtos/page.tsx → src/lib/profit.ts
- `POST()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/ai-product/route.ts → src/lib/admin.ts

## Import Cycles
- None detected.

## Communities (39 total, 10 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.08
Nodes (16): favoriteSchema, GET(), POST(), userId(), icons, labels, icons, labels (+8 more)

### Community 1 - "AppChrome.tsx"
Cohesion: 0.22
Nodes (13): AdminPedidos(), money(), Order, OrderItem, statusLabels, AtendimentoPage(), emptyForm, SupportForm (+5 more)

### Community 2 - "brazil.ts"
Cohesion: 0.07
Nodes (35): AdminClientes(), Customer, money(), AdminConfiguracoes(), SettingsResponse, addressSchema, DELETE(), PATCH() (+27 more)

### Community 3 - "catalog.ts"
Cohesion: 0.10
Nodes (31): CatalogBanner, CatalogContent(), defaultBanner, PublicFilter, CatalogCarousel(), CatalogSlide, isVideoUrl(), accents (+23 more)

### Community 4 - "ProductPageClient.tsx"
Cohesion: 0.06
Nodes (47): CartPage(), CheckoutPage(), Favorite, FavoritosPage(), money(), metadata, parseStorageInMb(), ProductPageClient() (+39 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (36): autoprefixer, devDependencies, autoprefixer, prisma, tailwindcss, tsx, @types/bcryptjs, @types/node (+28 more)

### Community 6 - "MegaMenu.tsx"
Cohesion: 0.50
Nodes (4): DepartmentId, MegaMenu(), MegaMenuProps, TabletIcon()

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+19 more)

### Community 8 - "dependencies"
Cohesion: 0.06
Nodes (31): bcryptjs, exceljs, lucide-react, mercadopago, next, next-auth, dependencies, bcryptjs (+23 more)

### Community 9 - "sendPaidOrderEmail"
Cohesion: 0.52
Nodes (5): POST(), validSignature(), escapeHtml(), money(), sendPaidOrderEmail()

### Community 10 - "produtos/page.tsx"
Cohesion: 0.09
Nodes (36): AdminProduct, AdminProdutos(), AdminVariant, CatalogFilter, emptyImages(), FilterOption, getBaseModelName(), GroupedModel (+28 more)

### Community 11 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 12 - "ai-product/route.ts"
Cohesion: 0.27
Nodes (9): getOllamaUrl(), OllamaResponse, POST(), requestSchema, researchProduct(), SearchResult, generatedProductSchema, parseGeneratedProduct() (+1 more)

### Community 13 - "planilha/page.tsx"
Cohesion: 0.32
Nodes (7): ChangeItem, fieldLabels, fieldValue(), ImportHistory, money(), Preview, ProductSpreadsheetPage()

### Community 15 - "admin/page.tsx"
Cohesion: 0.40
Nodes (5): AdminDashboard(), DailySale, Dashboard, money(), statusLabel

### Community 27 - "requireAdmin"
Cohesion: 0.05
Nodes (58): GET(), GET(), SALES_STATUSES, DELETE(), PATCH(), patchSchema, createSchema, POST() (+50 more)

### Community 30 - "2. Estrutura do Cabeçalho (Header STORE BR)"
Cohesion: 0.20
Nodes (9): 1. Paleta de Cores e Tipografia, 2. Estrutura do Cabeçalho (Header STORE BR), 3. Padrões de Layout e Componentes da Página Inicial, A. Barra Superior (Top Utility Bar), B. Cabeçalho Principal (Main Header), C. Menu de Categorias (Sub-Header Navigation), Cores da Marca & Destaques, Design System: STORE BR (+1 more)

### Community 31 - "app/page.tsx"
Cohesion: 0.05
Nodes (57): AdminConteudo(), blankCatalogSlide(), blankSlide(), CatalogBanner, Content, defaultCatalogBanner(), initial, MenuItem (+49 more)

### Community 32 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 33 - "DroidStore"
Cohesion: 0.22
Nodes (8): Conteúdo de produtos com IA, DroidStore, Implantação, Login com Google, Pagamentos, Preparação, Qualidade, Segurança

### Community 35 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 36 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 37 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 38 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **252 isolated node(s):** `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)`, `Step 1 - Ensure graphify is installed`, `Step 2 - Detect files` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdmin()` connect `requireAdmin` to `produtos/page.tsx`, `brazil.ts`, `ai-product/route.ts`, `app/page.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `useSiteContent()` connect `ProductPageClient.tsx` to `AppChrome.tsx`, `catalog.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `CatalogProduct` connect `ProductPageClient.tsx` to `catalog.ts`, `app/page.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `brazil.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07180851063829788 - nodes in this community are weakly interconnected._
- **Should `catalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10128205128205128 - nodes in this community are weakly interconnected._
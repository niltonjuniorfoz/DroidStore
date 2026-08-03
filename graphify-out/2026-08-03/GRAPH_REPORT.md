# Graph Report - Site Android  (2026-08-03)

## Corpus Check
- 142 files · ~710,166 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 651 nodes · 1136 edges · 39 communities (29 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f691cd9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- SiteContentProvider.tsx
- brazil.ts
- AutoplayVideo.tsx
- catalog.ts
- devDependencies
- Header.tsx
- compilerOptions
- dependencies
- requireAdmin
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
- productSpreadsheet.ts
- 2. Estrutura do Cabeçalho (Header STORE BR)
- storefront.ts
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
1. `requireAdmin()` - 48 edges
2. `isOwnerAdmin()` - 26 edges
3. `useSiteContent()` - 17 edges
4. `compilerOptions` - 15 edges
5. `formatBrazilPhone()` - 14 edges
6. `previewProductsWorkbook()` - 12 edges
7. `What You Must Do When Invoked` - 12 edges
8. `useCart()` - 12 edges
9. `CatalogProduct` - 11 edges
10. `slugify()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `DELETE()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/products/[id]/route.ts → src/lib/admin.ts
- `main()` --calls--> `slugify()`  [EXTRACTED]
  prisma/seed.ts → src/lib/slug.ts
- `PUT()` --calls--> `readInstagramFromCatalogBanner()`  [EXTRACTED]
  app/api/admin/content/route.ts → src/lib/contact.ts
- `GET()` --calls--> `createProductsWorkbook()`  [EXTRACTED]
  app/api/admin/product-spreadsheet/export/route.ts → src/lib/productSpreadsheet.ts
- `AtendimentoPage()` --calls--> `useSiteContent()`  [EXTRACTED]
  app/atendimento/page.tsx → src/components/SiteContentProvider.tsx

## Import Cycles
- None detected.

## Communities (39 total, 10 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.08
Nodes (15): favoriteSchema, GET(), POST(), userId(), icons, labels, icons, labels (+7 more)

### Community 1 - "SiteContentProvider.tsx"
Cohesion: 0.08
Nodes (25): AdminPedidos(), money(), Order, OrderItem, statusLabels, AtendimentoPage(), emptyForm, SupportForm (+17 more)

### Community 2 - "brazil.ts"
Cohesion: 0.07
Nodes (35): AdminClientes(), Customer, money(), AdminConfiguracoes(), SettingsResponse, addressSchema, DELETE(), PATCH() (+27 more)

### Community 3 - "AutoplayVideo.tsx"
Cohesion: 0.33
Nodes (7): AutoplayVideo(), localPosterFor(), Props, RETRY_DELAYS, CatalogCarousel(), CatalogSlide, isVideoUrl()

### Community 4 - "catalog.ts"
Cohesion: 0.06
Nodes (57): CartPage(), CatalogBanner, CatalogContent(), defaultBanner, PublicFilter, CheckoutPage(), Favorite, FavoritosPage() (+49 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (36): autoprefixer, devDependencies, autoprefixer, prisma, tailwindcss, tsx, @types/bcryptjs, @types/node (+28 more)

### Community 6 - "Header.tsx"
Cohesion: 0.15
Nodes (11): defaultNavigation, MenuItem, mobileCategories, popularSearches, QuickBuyState, searchMoney, SearchProduct, DepartmentId (+3 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+19 more)

### Community 8 - "dependencies"
Cohesion: 0.06
Nodes (31): bcryptjs, exceljs, lucide-react, mercadopago, next, next-auth, dependencies, bcryptjs (+23 more)

### Community 9 - "requireAdmin"
Cohesion: 0.07
Nodes (43): GET(), GET(), SALES_STATUSES, DELETE(), PATCH(), patchSchema, createSchema, POST() (+35 more)

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

### Community 27 - "productSpreadsheet.ts"
Cohesion: 0.19
Nodes (17): GET(), runtime, cellText(), createProductsWorkbook(), decimal(), normalize(), parseCondition(), ParsedRow (+9 more)

### Community 30 - "2. Estrutura do Cabeçalho (Header STORE BR)"
Cohesion: 0.20
Nodes (9): 1. Paleta de Cores e Tipografia, 2. Estrutura do Cabeçalho (Header STORE BR), 3. Padrões de Layout e Componentes da Página Inicial, A. Barra Superior (Top Utility Bar), B. Cabeçalho Principal (Main Header), C. Menu de Categorias (Sub-Header Navigation), Cores da Marca & Destaques, Design System: STORE BR (+1 more)

### Community 31 - "storefront.ts"
Cohesion: 0.06
Nodes (55): AdminConteudo(), blankCatalogSlide(), blankSlide(), CatalogBanner, Content, defaultCatalogBanner(), initial, MenuItem (+47 more)

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
- **254 isolated node(s):** `MenuItem`, `CatalogBanner`, `Content`, `initial`, `DailySale` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdmin()` connect `requireAdmin` to `brazil.ts`, `produtos/page.tsx`, `ai-product/route.ts`, `productSpreadsheet.ts`, `storefront.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `useSiteContent()` connect `catalog.ts` to `SiteContentProvider.tsx`, `Header.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `CatalogProduct` connect `catalog.ts` to `storefront.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `MenuItem`, `CatalogBanner`, `Content` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07526881720430108 - nodes in this community are weakly interconnected._
- **Should `SiteContentProvider.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07827260458839407 - nodes in this community are weakly interconnected._
- **Should `brazil.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07180851063829788 - nodes in this community are weakly interconnected._
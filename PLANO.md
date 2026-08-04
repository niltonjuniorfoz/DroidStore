# PLANO — Aura Tech

> **Este arquivo é vivo.** Toda vez que um item for concluído, Claude marca `[x]`, move para o log de concluídos com a data, e adiciona itens novos descobertos no caminho. Regra registrada em [CLAUDE.md](CLAUDE.md).
>
> Base: [AVALIACAO.md](AVALIACAO.md) (commit `429efe2`).

**Última atualização:** 2026-08-03 · **Progresso:** 26/26 · **TODAS AS FASES CONCLUÍDAS** 🎉

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído · 🔴 bloqueador · 🟠 alto · 🟡 médio · ⚪ baixo

---

## FASE 0 — Parar o sangramento

- [x] 🔴 **0.1 Upload funcionando na Vercel** — Vercel Blob com upload direto do browser (até 100 MB, fora do limite de 4,5 MB); magic bytes validados no caminho multipart; fallback dev local mantido. **Requer criar um Blob Store no painel da Vercel** (Storage → Create → Blob; o token `BLOB_READ_WRITE_TOKEN` é injetado sozinho).
- [x] 🔴 **0.2 Cancelamento/estorno de pedido pago** — `REFUNDED` no enum; `PAID→CANCELLED/REFUNDED`, `SHIPPED/DELIVERED→REFUNDED`; webhook trata `refunded`/`charged_back` (dedupe por pagamento+status); estoque volta sozinho só se o aparelho não saiu (PENDING/PAID). Obs.: marcar REFUNDED **não** devolve o dinheiro — o estorno financeiro é feito no painel do Mercado Pago.
- [x] 🔴 **0.3 Matar estoque fantasma** — default(20)→0 em **3 lugares**: schema Prisma (+migration), zod do POST de produtos e valor inicial do formulário. Seed e planilha passam estoque explícito, não afetados.
- [x] 🟠 **0.4 Expiração de reserva** — PENDING além de 24h (`ORDER_RESERVATION_HOURS`) cancela automático com devolução de estoque e histórico. Varredura lazy (admin de pedidos + checkout) + cron diário 03h (`vercel.json` → `/api/cron/expire-orders`, protegido por `CRON_SECRET`). Índice novo em `Order(status, createdAt)`.
- [x] 🟠 **0.5 Decidir destino do rastreio IMEI** — **Decidido em 2026-08-03: remoção foi intencional, fica fora.** Se sentir falta (procedência, garantia por aparelho, laudo de bateria), reimplementar enxuto com `variant.stock` derivado — avisar quando quiser.

## FASE 1 — Operação segura

- [x] 🟠 **1.1 Gestão de usuários admin** — tela `/admin/usuarios` (só ADMIN vê no menu) + API: criar acesso, promover/rebaixar, desativar/reativar, redefinir senha. Proteções: não remove o próprio acesso, não remove o último ADMIN ativo. `User.active` novo; login recusa conta desativada; `requireAdmin` confere papel/ativo no banco — demissão vale na hora, sem esperar o token expirar.
- [x] 🟠 **1.2 Log de auditoria** — modelo `AdminAuditLog` (quem, ação, entidade, antes/depois, quando) registrando: produtos (criar/editar/desativar), pedidos (status/rastreio), equipe, configurações, vitrine, planilha (apply/rollback) e uploads. Tela `/admin/auditoria` (só ADMIN) com filtro por área. Auditoria nunca derruba a operação (falha só loga no console).
- [x] 🟡 **1.3 Rate limit** — login por conta (10/15min), cadastro por IP (5/15min), checkout por usuário+IP (10/10min), `ai-product` por usuário (15/h). Upstash Redis se `UPSTASH_REDIS_REST_*` existirem (contador global); sem elas, memória por instância (barra rajadas, teto não exato — suficiente pro tamanho atual). Rotas admin autenticadas comuns ficaram de fora de propósito.
- [x] 🟡 **1.4 E-mails que faltam** — "pedido recebido" (no checkout, com aviso do prazo de reserva) e "pedido enviado" (com código de rastreio destacado). Renderizador único no `orderEmail.ts`; idempotência por coluna (`createdEmailSentAt`/`shippedEmailSentAt`) com rollback se o envio falhar. Requer e-mail transacional ligado nas Configurações + `RESEND_API_KEY`.
- [x] 🟡 **1.5 Middleware real** — `middleware.ts` na raiz protegendo `/admin`, `/conta` e `/login` no edge via callback `authorized` (que era código morto). `requireAdmin` segue como segunda camada com checagem fresca no banco.

## FASE 2 — Vitrine vendendo (SEO + performance)

- [x] 🟠 **2.1 `generateMetadata` por produto** — title com modelo/capacidade/cor/condição, description com preço, OG image + Twitter card, canonical. Busca deduplicada com `cache()`. Bônus: sitemap agora puxa os produtos **do banco** (antes era só o catálogo estático — produto cadastrado no admin ficava fora).
- [x] 🟠 **2.2 JSON-LD `Product`+`Offer`** — preço, disponibilidade (InStock/OutOfStock), condição mapeada pro vocabulário schema.org (Novo→New, Reembalado/Outlet→Refurbished, usados→Used), marca e vendedor.
- [x] 🟡 **2.3 Catálogo server-side** — `/celulares` virou server component com ISR 60s: Google e primeira pintura recebem os produtos reais do banco; filtros e revalidação ao vivo continuam no client. Rota `/api/catalog-filters` e página compartilham a mesma lib.
- [x] 🟡 **2.4 Otimização de imagens** — `next/image` em toda a vitrine com allowlist de hosts (uploads locais, Vercel Blob, cdn.atacadoconnect.com, atlanticoshop.com.py); host desconhecido cai no `<img>` lazy. Dimensões visuais continuam 100% no CSS (zero mudança de layout). Verificado no preview: 80/81 imagens otimizadas na home, 31/31 no produto, zero quebradas. Host de CDN novo no futuro → adicionar em `next.config.mjs` + `ProductImage.tsx`.
- [x] ⚪ **2.5 Quebrar `storefront-theme.css`** — dividido em **8 módulos** em `app/styles/` (base/header, home/hero, menus, botões/prateleiras, conta/ajuda, produto, refinamentos, carrosséis); `storefront-theme.css` virou lista de `@import` na mesma ordem — cascata idêntica por construção. Removidas 204 linhas mortas (efeito fogo sem nenhuma referência). Divisão por rota descartada de propósito: cards/botões aparecem em todas as rotas e o App Router não descarrega CSS na navegação — ganho seria ilusório. Verificado no preview (home, catálogo, produto).
- [x] ⚪ **2.6 Carrinho: preço vivo** — preço revalidado contra a loja ao carregar o carrinho, com aviso discreto no drawer quando algum valor mudou; chave migrada `droidstore-cart` → `auratech-cart` (migração automática, sem perder carrinho salvo).

## FASE 3 — Escala do admin

- [x] 🟡 **3.1 Paginação/busca no servidor** — dashboard 100% agregado no banco (`$queryRaw` com SUM/GROUP BY, fuso de São Paulo no gráfico diário; queries validadas contra o banco real); pedidos filtram período+busca no servidor (o take de 250 não esconde mais pedido antigo procurado); clientes com busca servidor + take 200; produtos com `?q`/`?take`. Status das tabs de pedidos ficou no client de propósito (mantém as contagens). Índice `Order(status, createdAt)` já criado no 0.4.
- [x] 🟡 **3.2 Variações sem redigitar** — **decisão de arquitetura:** o catálogo já modela variação como produtos-irmãos agrupados por família (feature "seleção dinâmica" existente); N variantes dentro de um produto brigaria com vitrine/carrinho/checkout. Implementado o que resolve a dor real: botão **"Duplicar como variação"** (ícone de cópia nas 3 visualizações) — abre o cadastro pré-preenchido com fotos, especificações, filtros e preços do produto original; só trocar capacidade/cor e salvar. Estoque nasce zerado de propósito.
- [x] ⚪ **3.3 Higiene de UX (essencial)** — `error.tsx` + `loading.tsx` em `/admin`; `.catch` em **todas** as cargas iniciais (rede caiu → mensagem clara, nunca mais "Carregando..." eterno). O que sobrou virou o item 3.6.
- [x] ⚪ **3.4 Erros Prisma por código** — helper `isPrismaError` (`P2002`/`P2003`/`P2025`) substituindo `message.includes("Unique constraint")` nos filtros. DELETEs de filtro já eram cascade no schema — o 500 de FK previsto na avaliação não se aplicava.
- [x] 🟡 **3.5 Testes de guarda das rotas admin** — suíte estática: toda rota `/api/admin` chama `requireAdmin`; rotas públicas/libs da vitrine nunca mencionam `costPrice`; rotas sensíveis diferenciam ADMIN/MANAGER e removem custo; cron exige `CRON_SECRET`. Pegam a regressão perigosa sem precisar de banco. Máquina de estados, estorno, lockout e expiração já cobertos pelos testes de unidade das fases anteriores (51 testes no total). Integração HTTP real fica para quando houver harness de banco de teste.
- [x] ⚪ **3.6 Polimento visual do admin** — **13** `alert()`/`confirm()` nativos substituídos por toast empilhado + diálogo de confirmação próprios (`AdminFeedback`, com Esc/overlay, botão vermelho em ação destrutiva). `produtos/page.tsx`: tipos e helpers extraídos para `types.ts` (1.423→1.320 linhas). Extração do modal do editor **avaliada e descartada**: form uncontrolled com ~25 dependências de escopo — mover é reescrita de risco sem teste de UI; refazer quando houver testes de componente.

## FASE 4 — Financeiro real

- [x] 🟠 **4.1 Lote de compra multi-moeda** — tela `/admin/compras` (só ADMIN): fornecedor, moeda USD/USDT/BRL, custo na moeda, cotação do dia, quantidade, frete do lote, data. Registrar o lote **soma o estoque** (movimentação ENTRY) e **recalcula o custo médio ponderado** da variação em BRL — a cotação congela na compra, a margem não mente quando o dólar muda. Preview do custo em reais ao vivo no formulário. Auditado.
- [x] 🟠 **4.2 Margem verdadeira** — webhook captura a **taxa real** cobrada pelo Mercado Pago em cada pagamento (`fee_details` → `Order.gatewayFeeBrl`, sem configurar percentual); dashboard mostra **Lucro no mês = bruto − taxas MP** com as taxas discriminadas no card. Custo já vem do lote (média ponderada do 4.1). Frete de envio ainda não é rastreado por pedido — entra quando houver integração de frete.
- [x] 🟡 **4.3 Exportação contábil** — botão **"Exportar mês"** no dashboard (só ADMIN): XLSX com aba Vendas (data, pedido, cliente, status, bruto, taxa gateway, líquido, custo, lucro — uma linha por pedido, inclui REFUNDED para conferência) + aba **Produtos (ABC)** do mês. Pronto pra mandar pro contador e simular carga tributária sobre a margem real. `?month=YYYY-MM` exporta meses anteriores.
- [x] ⚪ **4.4 Relatórios em tela** — tela `/admin/relatorios` (só ADMIN): período livre (De/Até), cards de faturamento/lucro/taxas, **curva ABC** com % acumulado e classe A/B/C, **giro de estoque** com cobertura em dias (vermelho <15d, amarelo <45d, "parado" sem venda). Queries validadas contra o banco real. Atalho pro XLSX mensal.

---

## Concluídos

| Data | Item | Commit |
|------|------|--------|
| 2026-08-03 | 0.1 Upload na Vercel (Blob + magic bytes) | `14c903b` |
| 2026-08-03 | 0.2 Reembolso de pedido pago + chargeback no webhook | `c75f449` |
| 2026-08-03 | 0.3 Estoque fantasma (default 20→0 em 3 lugares) | `876a6c3` |
| 2026-08-03 | 0.4 Expiração de reserva PENDING (lazy + cron) | `773e3d7` |
| 2026-08-03 | 0.5 IMEI: decisão de manter fora (sem código) | — |
| 2026-08-03 | 1.1 Gestão de equipe (`/admin/usuarios`) | `fd08696` |
| 2026-08-03 | 1.2 Trilha de auditoria (`/admin/auditoria`) | `cda9ebd` |
| 2026-08-03 | 1.3 Rate limit (login, cadastro, checkout, IA) | `87c861d` |
| 2026-08-03 | 1.4 E-mails de pedido recebido e enviado | `37abe89` |
| 2026-08-03 | 1.5 Middleware de borda (`middleware.ts`) | `734712f` |
| 2026-08-03 | 2.1+2.2 SEO por produto (metadata, JSON-LD, sitemap) | `fadfefe` |
| 2026-08-03 | 2.3 Catálogo server-side (ISR 60s) | `286bde7` |
| 2026-08-03 | 2.4 (parcial: lazy+priority) e 2.6 Carrinho preço vivo | `18c463e` |
| 2026-08-03 | 2.4 next/image completo (allowlist de hosts) | `0f34a83` |
| 2026-08-03 | 2.5 CSS em 8 módulos + 204 linhas mortas removidas | `df83d3a` |
| 2026-08-03 | 3.1 Dashboard agregado + filtros no servidor | `90e3267` |
| 2026-08-03 | 3.2 Duplicar produto como variação | `76d96df` |
| 2026-08-03 | 3.3+3.4+3.5 Higiene, erros por código, testes de guarda | `13d2146` |
| 2026-08-03 | 4.1 Lotes de compra multi-moeda (`/admin/compras`) | `586d7b1` |
| 2026-08-03 | 4.2+4.3 Taxa real do MP + exportação contábil XLSX | `ade38c2` |
| 2026-08-03 | 4.4 Relatórios em tela (`/admin/relatorios`) | `8e4313a` |
| 2026-08-03 | 3.6 Toast+confirm próprios e tipos extraídos | `68e9788`, `3325787` |

## Descobertos no caminho (triagem pendente)

- Repo dentro do OneDrive já corrompeu `.git/refs` uma vez (2026-08-03, resolvido apagando `desktop.ini` de refs). Mover repo para fora do OneDrive.
- Webhook MP ignora eventos de estorno pós-PAID (incorporado no 0.2).

# PLANO — Aura Tech

> **Este arquivo é vivo.** Toda vez que um item for concluído, Claude marca `[x]`, move para o log de concluídos com a data, e adiciona itens novos descobertos no caminho. Regra registrada em [CLAUDE.md](CLAUDE.md).
>
> Base: [AVALIACAO.md](AVALIACAO.md) (commit `429efe2`).

**Última atualização:** 2026-08-03 · **Progresso:** 9/24 · **FASE 0 concluída**

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
- [ ] 🟡 **1.5 Middleware real** — criar `middleware.ts` usando o `authorized` que hoje é código morto; manter defesa em profundidade nas rotas.

## FASE 2 — Vitrine vendendo (SEO + performance)

- [ ] 🟠 **2.1 `generateMetadata` por produto** — title, description, OG image (foto do aparelho), preço. (`app/produto/[slug]/page.tsx`)
- [ ] 🟠 **2.2 JSON-LD `Product`+`Offer`** — preço, disponibilidade, condição; habilita rich results.
- [ ] 🟡 **2.3 Catálogo server-side** — `/celulares` renderizar lista inicial no servidor (filtros continuam client); avaliar `searchParams` como fonte de estado.
- [ ] 🟡 **2.4 `next/image` nos 18 `<img>`** — lazy, srcset, sizes; priorizar hero e cards do catálogo.
- [ ] ⚪ **2.5 Quebrar `storefront-theme.css`** (5.977 linhas) — por rota/componente; remover morto.
- [ ] ⚪ **2.6 Carrinho: preço vivo** — revalidar preço ao abrir carrinho/checkout e avisar mudança; renomear chave `droidstore-cart` → `auratech-cart` com migração.

## FASE 3 — Escala do admin

- [ ] 🟡 **3.1 Paginação/busca no servidor** — `products`, `orders` (cursor + filtro data/status), `customers`; dashboard com `aggregate`/`groupBy` + índices (`Order.createdAt`, `Order.status`).
- [ ] 🟡 **3.2 Multi-variante no admin** — criar/editar N variantes por produto (128GB/256GB, cores) sem duplicar produto.
- [ ] ⚪ **3.3 Higiene de UX** — trocar `alert()`/`confirm()` por toast+modal; `.catch` nos fetch; `error.tsx`/`loading.tsx`; quebrar `produtos/page.tsx`.
- [ ] ⚪ **3.4 Erros Prisma por código** — `P2002` em vez de `message.includes`; tratar FK em DELETE de filtros.
- [ ] 🟡 **3.5 Testes das rotas admin** — auth (CUSTOMER bloqueado), `costPrice` não vaza p/ MANAGER, máquina de estados, estorno devolve estoque, planilha apply/rollback.

## FASE 4 — Financeiro real

- [ ] 🟠 **4.1 Lote de compra multi-moeda** — modelo `PurchaseLot`: fornecedor, moeda (USD/USDT/BRL), valor, cotação, data, quantidade → custo unitário BRL real; vincular a variante/unidade.
- [ ] 🟠 **4.2 Margem verdadeira** — dashboard descontar taxa MP (por modalidade) e frete do lucro bruto; custo vindo do lote, não do campo manual.
- [ ] 🟡 **4.3 Exportação contábil** — CSV/XLSX mensal de vendas (data, valor, taxa, líquido) pronto para contador; base para simular carga tributária (Simples ~4% início) sobre margem real. Subsidia a decisão de regularização — conversar com contador.
- [ ] ⚪ **4.4 Relatórios** — vendas por período com filtro de data, curva ABC, giro de estoque.

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

## Descobertos no caminho (triagem pendente)

- Repo dentro do OneDrive já corrompeu `.git/refs` uma vez (2026-08-03, resolvido apagando `desktop.ini` de refs). Mover repo para fora do OneDrive.
- Webhook MP ignora eventos de estorno pós-PAID (incorporado no 0.2).

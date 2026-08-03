# PLANO — Aura Tech

> **Este arquivo é vivo.** Toda vez que um item for concluído, Claude marca `[x]`, move para o log de concluídos com a data, e adiciona itens novos descobertos no caminho. Regra registrada em [CLAUDE.md](CLAUDE.md).
>
> Base: [AVALIACAO.md](AVALIACAO.md) (commit `429efe2`).

**Última atualização:** 2026-08-03 · **Progresso:** 0/24

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído · 🔴 bloqueador · 🟠 alto · 🟡 médio · ⚪ baixo

---

## FASE 0 — Parar o sangramento

- [ ] 🔴 **0.1 Upload funcionando na Vercel** — trocar `writeFile` por Vercel Blob com upload direto do browser; validar magic bytes; ajustar limite real. (`app/api/admin/upload/route.ts`)
- [ ] 🔴 **0.2 Cancelamento/estorno de pedido pago** — adicionar `REFUNDED` ao enum `OrderStatus`; transições `PAID→CANCELLED/REFUNDED`; webhook tratar `refunded`/`charged_back`; estorno de estoque. Migration + testes.
- [ ] 🔴 **0.3 Matar estoque fantasma** — `Variant.stock @default(20)` → `@default(0)` + migration; conferir dependências no seed/planilha.
- [ ] 🟠 **0.4 Expiração de reserva** — pedido PENDING além de X horas (sugestão: 24h) cancela automático e devolve estoque (cron Vercel ou verificação lazy).
- [ ] 🟠 **0.5 Decidir destino do rastreio IMEI** — `DeviceUnit` foi removido em `20260802143000`. Confirmar com Wender: era intencional? Se voltar: modelo enxuto (IMEI, serial, bateria, laudo, lote de compra) com `variant.stock` derivado, sem os bugs da v1.

## FASE 1 — Operação segura

- [ ] 🟠 **1.1 Gestão de usuários admin** — tela + API: criar MANAGER, resetar senha, desativar, promover. Só ADMIN acessa.
- [ ] 🟠 **1.2 Log de auditoria** — modelo `AdminAuditLog` (quem, ação, entidade, antes/depois, quando); registrar em produtos, pedidos, config, upload, planilha.
- [ ] 🟡 **1.3 Rate limit** — nas rotas de mutação admin + `ai-product` + `/api/cadastro` + `/api/checkout` (Upstash Redis ou similar).
- [ ] 🟡 **1.4 E-mails que faltam** — "pedido criado" (com instrução Pix) e "pedido enviado" (com rastreio). Reaproveitar padrão idempotente do `orderEmail.ts`.
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
| — | — | — |

## Descobertos no caminho (triagem pendente)

- Repo dentro do OneDrive já corrompeu `.git/refs` uma vez (2026-08-03, resolvido apagando `desktop.ini` de refs). Mover repo para fora do OneDrive.
- Webhook MP ignora eventos de estorno pós-PAID (incorporado no 0.2).

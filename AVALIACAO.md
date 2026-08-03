# Avaliação completa — Aura Tech (vitrine + admin)

Commit avaliado: `429efe2` (2026-08-03) · Atualizada em: 2026-08-03
Escopo: `app/**`, `src/**`, `prisma/**`, auth, deploy Vercel.

> Plano de ação derivado desta avaliação: ver [PLANO.md](PLANO.md) — é lá que o progresso é marcado.

---

## 1. Resumo executivo

O sistema está **acima da média** para uma loja própria: checkout com preço calculado no servidor e reserva de estoque serializable, webhook Mercado Pago com assinatura HMAC validada e idempotência, e-mail transacional idempotente, planilha de produtos com preview/apply/histórico/rollback, dashboard com margem, máquina de estados de pedido com histórico auditado.

Os problemas se concentram em:
1. **2 bloqueadores de produção** (upload não funciona na Vercel; pedido pago sem caminho de cancelamento/estorno).
2. **Vitrine invisível para o Google** (sem SEO por produto, catálogo client-side, sem next/image).
3. **Financeiro cego** (custo em BRL fixo comprando em USD/USDT; margem ignora frete e taxa do gateway).
4. **Operação** (sem gestão de usuários admin, sem rate limit, sem log de auditoria, sem paginação no servidor).

---

## 2. BLOQUEADORES

### 2.1 Upload quebrado na Vercel — `app/api/admin/upload/route.ts:104`
Continua `writeFile` em `public/uploads`. Filesystem da Vercel é read-only; o que gravar em `/tmp` some. Todo upload de imagem/vídeo em produção falha ou desaparece no próximo deploy. Limite real de body na Vercel: ~4,5 MB (o código promete 50 MB). Tipo validado só por `file.type` (mentível).
**Fix:** Vercel Blob com upload direto do browser (presigned), validação de magic bytes.

### 2.2 Pedido pago não cancela/estorna
`transitions` em `app/api/admin/orders/[id]/route.ts`: `PAID -> [SHIPPED]` apenas. Enum sem `REFUNDED`. Cliente pagou e desistiu → beco sem saída. Agravante: o webhook ignora eventos `refunded`/`charged_back` — se o Mercado Pago estornar, o pedido continua PAID e o estoque não volta. Direito de arrependimento (CDC, 7 dias) não tem fluxo.
**Fix:** status `REFUNDED` (+ `RETURNED` opcional), transições `PAID→CANCELLED/REFUNDED`, `DELIVERED→RETURNED`, webhook tratando `refunded`/`charged_back`, estorno de estoque reaproveitando a lógica existente.

### 2.3 Estoque fantasma — `prisma/schema.prisma` `Variant.stock @default(20)`
Produto criado sem informar estoque nasce com **20 unidades à venda**. Para quem vende aparelho físico único, isso vende o que não existe. Cheiro de gambiarra de seed.
**Fix:** `@default(0)` + migration; conferir se a planilha/POST dependem do default.

---

## 3. VITRINE (loja)

### O que está bom
- Checkout: preço 100% servidor (carrinho local é só exibição), desconto Pix aplicado no servidor, reserva de estoque com `updateMany` condicional + Serializable, `stockMovement` de reserva. Bem feito.
- Webhook MP: HMAC + `timingSafeEqual`, idempotência por `providerEventId`, devolução de estoque em recusa. Bem feito.
- E-mail de pagamento aprovado: existe de verdade (Resend), claim idempotente com rollback. HTML com escape.
- Cadastro: senha mín. 10 chars com maiúscula/minúscula/dígito, bcrypt cost 12.
- `sitemap.ts` e `robots.ts` existem.
- Sem vazamento de `costPrice` em nenhuma API pública.
- Visualizador 3D (three.js), carrosséis, identidade Aura Tech consistente.

### Problemas — SEO (grave para vender)
| # | Problema | Efeito |
|---|---|---|
| V1 | `app/produto/[slug]/page.tsx` **sem `generateMetadata`** — único metadata é o do layout raiz | Todos os produtos com mesmo title/description no Google; sem OG image → link compartilhado no WhatsApp sem foto/preço |
| V2 | `/celulares` é `"use client"` inteiro (475 linhas) | Catálogo renderizado só no browser; indexação dependente de JS, mais lenta e falha |
| V3 | Zero JSON-LD (`Product`, `Offer`, `AggregateRating`) | Sem rich results de preço/estoque no Google Shopping/busca |
| V4 | Zero `next/image` — 18 `<img>` crus | Sem otimização, sem lazy, sem srcset; LCP ruim no mobile (onde está seu cliente) |

### Problemas — arquitetura/UX
| # | Problema |
|---|---|
| V5 | `storefront-theme.css` com **5.977 linhas** carregado em toda página; 9.374 linhas de CSS total |
| V6 | Carrinho no localStorage guarda `price` de quando adicionou — se preço mudar, cliente vê um valor no carrinho e outro no checkout, sem aviso. Chave ainda é `droidstore-cart` (marca antiga) |
| V7 | Sem e-mail de "pedido enviado" com rastreio, nem "pedido criado/aguardando pagamento" — só o de pago |
| V8 | Sem rate limit em `/api/cadastro` e `/api/checkout` — enumeração de e-mail e flood de pedidos PENDING (que reservam estoque!) |
| V9 | Pedido PENDING reserva estoque sem expiração — abandono de checkout segura estoque para sempre até alguém cancelar na mão |

---

## 4. ADMIN

### Resolvido desde a última avaliação (26 commits)
- ✅ Planilha `/admin/produtos/planilha`: export XLSX (exceljs), preview, apply transacional, histórico e **rollback**.
- ✅ E-mail transacional real + configuração no admin (from, reply-to, on/off).
- ✅ Dados da empresa (razão social, CNPJ, endereço) no SiteContent.
- ✅ Login de cliente ligável/desligável com textos configuráveis.
- ✅ `vercel.json` com `prisma migrate deploy` no build.
- ⚠️ `DeviceUnit`/IMEI **removido inteiro** (migration `20260802143000`). Matou os bloqueadores de estoque duplo e IMEI órfão — mas loja de seminovo sem rastreio de IMEI/serial perde: procedência, garantia por aparelho, laudo de bateria, endereçamento físico. **Confirmar se foi decisão ou efeito colateral.**

### Pendências (continuam da avaliação anterior)
| # | Item | Gravidade |
|---|---|---|
| A1 | Sem tela de usuários admin (criar MANAGER, resetar senha, desativar). Ex-funcionário continua entrando | Alta |
| A2 | Sem rate limit em rota nenhuma; `ai-product` chama API paga sem freio | Média |
| A3 | Sem log de auditoria (preço alterado, produto excluído, config mudada — sem rastro de quem) | Média |
| A4 | Sem paginação no servidor: `products` (tudo + relações), `orders` (`take: 250` fixo — pedido 251 some), `customers` (tudo), `dashboard` (soma em JS o que devia ser `aggregate`) | Média |
| A5 | Sem `middleware.ts` — callback `authorized` do auth.config é código morto; proteção real é layout + `requireAdmin` (funciona, mas o redirect de login logado não roda) | Baixa |
| A6 | Multi-variante: schema aceita N, admin cria/edita só a primeira. iPhone 128GB e 256GB = 2 produtos | Média |
| A7 | 11 `alert()`/`confirm()`; `fetch` sem `.catch` (rede caiu = "Carregando..." eterno); sem `error.tsx`/`loading.tsx` em `/admin` | Baixa |
| A8 | `produtos/page.tsx` ainda ~1.100 linhas num componente só | Baixa |
| A9 | Erro Prisma por `message.includes("Unique constraint")` em vez de `code === "P2002"`; DELETE de filtro com FK vira 500 cru | Baixa |
| A10 | Testes: 5 arquivos, zero cobrindo rotas admin (auth, costPrice não vazar p/ MANAGER, máquina de estados, estornos) | Média |

---

## 5. FINANCEIRO / NEGÓCIO (compra em USD/USDT, venda no BR)

Fatos, sem julgamento — decisão é sua:

### 5.1 O sistema é cego ao seu custo real
`costPrice` é um Decimal em BRL digitado à mão. Você compra em **USD e USDT** (EUA, Paraguai, China). Sem registrar moeda + cotação do dia da compra + lote, a margem do dashboard é chute. Dólar subiu 5% entre compra e venda → seu lucro real mudou e o painel não sabe.
**Feature:** cadastro de **lote de compra** (fornecedor, moeda, valor na moeda, cotação, data, custo unitário resultante em BRL) e margem calculada sobre o custo do lote. Serve para qualquer cenário fiscal.

### 5.2 Margem exibida está inflada
Lucro bruto = venda − costPrice. Faltam: taxa do Mercado Pago (~0,99–4,98% conforme modalidade), frete, embalagem. Com margem de seminovo (tipicamente 10–25%), a taxa do gateway come pedaço relevante e o painel esconde.

### 5.3 Riscos do arranjo atual (contas intermediadoras, sem imposto)
Riscos **operacionais** que afetam o sistema — independentes de opinião:
- **Congelamento de conta**: gateway pode reter saldo (comum: 180 dias) por verificação. Faturamento em conta de terceiro aumenta chance de flag por incompatibilidade CPF/CNPJ × volume. Sem conta reserva/multi-gateway, a loja para de vender no dia.
- **MED (golpe do Pix reverso) e chargeback**: sem NF-e e sem rastro fiscal, defender disputa é mais difícil — intermediador tende a devolver o dinheiro ao comprador.
- **Rastro de dados já existe**: Pix, marketplace e gateway reportam movimentação (e-Financeira/DIMP à Receita). O risco não é "se descobrem", é passivo acumulando retroativo com multa.
- **Garantia/CDC**: sem nota, o cliente ainda tem direitos (90 dias legais) — mas você não tem como exigir contrapartida do seu fornecedor.
- **Escala**: cada intermediador é um teto de volume. Crescer = multiplicar contas = multiplicar pontos de falha.

### 5.4 Caminhos de regularização (para conversar com contador — não sou consultor fiscal)
- **Simples Nacional** (comércio, Anexo I): alíquota efetiva começa ~4% da receita. Com margem real calculada (item 5.1), dá para simular quanto custaria "ficar limpo" e precificar isso.
- **Importação formal de celular** é o ponto duro (homologação Anatel, II/IPI/ICMS) — há regimes como Remessa Conforme/courier para volumes menores; fornecedor nacional com NF é alternativa parcial.
- O sistema pode ajudar **hoje**: exportação contábil de vendas (CSV mensal), custo real por lote, simulador de carga tributária sobre a margem real. Nada disso te compromete; te dá o número para decidir.

---

## 6. Notas de infraestrutura
- Repo dentro do OneDrive: já corrompeu `.git/refs` uma vez (`desktop.ini`). Recomendado mover para fora (ex.: `C:\dev`) ou ao menos excluir a pasta do sync.
- `desktop.ini` espalhado no repo (está no .gitignore, ok, mas aparece em `tests/`, `src/components/`).
- CSP com `unsafe-inline`/`unsafe-eval` em script-src.
- `lint` é só `tsc --noEmit`; sem ESLint.

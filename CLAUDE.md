# Aura Tech — regras do projeto

E-commerce de celulares (novos e seminovos). Next.js 16 + Prisma + PostgreSQL + NextAuth v5 + Mercado Pago. Deploy: Vercel (droid-store-nine.vercel.app). Idioma do projeto e do usuário: português (BR).

## Regra do PLANO (obrigatória)

O arquivo `PLANO.md` é o plano vivo de melhorias. **Sempre que concluir qualquer item de trabalho:**

1. Marcar o item como `[x]` em `PLANO.md`.
2. Mover para a tabela "Concluídos" com data e hash do commit.
3. Atualizar a linha "Última atualização" e o contador de progresso.
4. Problemas novos descobertos durante o trabalho: adicionar na seção "Descobertos no caminho" (ou direto na fase certa, com prioridade).
5. Ao iniciar um item, marcar `[~]`.

Isso vale para qualquer sessão, mesmo que o usuário não mencione o plano.

## Regras de sessão (ordem do Wender, 2026-08-03)

- **Nunca parar por compactação de contexto**: quando a janela encher, continuar o trabalho normalmente com o resumo — jamais encerrar ou pedir permissão para continuar por causa disso.
- Modelo esgotado é assunto do app (fallback automático / seletor de modelo); não interromper o trabalho antecipadamente por previsão de cota.

## Contexto de negócio

- Compra em USD/USDT (EUA, Paraguai, China), venda no Brasil. `costPrice` em BRL não reflete o custo real — ver Fase 4 do PLANO.
- Margens de seminovo são apertadas; taxa de gateway e frete importam.
- Avaliação técnica completa: `AVALIACAO.md`.

## Cuidados técnicos

- Filesystem da Vercel é read-only: nunca gravar upload em `public/` (ver PLANO 0.1).
- `requireAdmin()` em toda rota `/api/admin/**` nova; `costPrice` nunca vaza para MANAGER nem para APIs públicas.
- Dinheiro: cálculo sempre no servidor; nunca confiar em preço vindo do cliente.
- Migrations: sempre via `prisma/migrations` (o build da Vercel roda `migrate deploy`).
- Repo está dentro do OneDrive — se `git fetch` falhar com `bad object refs/...desktop.ini`, apagar os `desktop.ini` de `.git/refs`.
- Commits em português, mensagem curta no imperativo (padrão do histórico).

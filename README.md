# DroidStore

E-commerce brasileiro especializado em celulares Android. A aplicação utiliza Next.js, TypeScript, PostgreSQL, Prisma, Auth.js e Mercado Pago.

## Preparação

1. Instale Node.js 20 e Docker.
2. Copie `.env.example` para `.env`.
3. Crie um `AUTH_SECRET` longo e aleatório.
4. Inicie o PostgreSQL com `docker compose up -d database`.
5. Execute `npm ci`, `npm run db:migrate` e `npm run db:seed`.
6. Inicie com `npm run dev`.

O administrador inicial só é criado quando `ADMIN_INITIAL_EMAIL` e `ADMIN_INITIAL_PASSWORD` estão preenchidos. A senha deve ter pelo menos 12 caracteres.

## Login com Google

Crie um cliente OAuth do tipo **Aplicativo da Web** no Google Cloud e configure:

- `AUTH_GOOGLE_ID`: ID do cliente OAuth.
- `AUTH_GOOGLE_SECRET`: chave secreta do cliente OAuth.
- URI de redirecionamento local: `http://localhost:3000/api/auth/callback/google`.

Em produção, cadastre também `https://SEU-DOMINIO/api/auth/callback/google`. O botão do Google aparece automaticamente na tela de login quando as duas credenciais estiverem preenchidas.

## Conteúdo de produtos com IA

No painel em **Produtos**, informe o título completo e use **Gerar com IA** para preencher uma descrição e uma ficha técnica editável. A integração utiliza o Ollama Cloud. Configure no `.env`:

- `OLLAMA_API_KEY`: chave secreta criada em `ollama.com/settings/keys`.
- `OLLAMA_BASE_URL`: mantenha `https://ollama.com` para acesso direto à nuvem.
- `OLLAMA_MODEL`: mantenha `gpt-oss:120b` para o modelo cloud de 120 bilhões de parâmetros.

A chave fica somente no servidor e nunca é enviada ao navegador. Todo conteúdo gerado deve ser revisado antes de salvar.

## Pagamentos

Sem as credenciais do Mercado Pago, o checkout entra explicitamente em modo de demonstração e não aprova pagamentos. Para sandbox ou produção, configure:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `APP_URL`

Cadastre o webhook como `APP_URL/api/webhooks/mercadopago`. O servidor valida assinatura, ignora eventos repetidos e só atualiza pedidos após consultar o gateway.

## Segurança

Preços e estoque são recalculados no servidor. A reserva usa transação serializável e atualização condicional para impedir estoque negativo. Rotas administrativas exigem perfil administrativo no servidor. Senhas usam bcrypt e nenhum dado de cartão é armazenado.

Antes de uma operação comercial real, configure TLS, backups automatizados do PostgreSQL, monitoramento, e-mail transacional, gateway de frete e faça revisão jurídica dos textos marcados como provisórios.

## Qualidade

- `npm run lint`: valida TypeScript.
- `npm test`: executa testes automatizados.
- `npm run build`: gera a versão de produção.

## Implantação

O `Dockerfile` gera a aplicação de produção. Em Render, Railway ou VPS, forneça as variáveis do `.env.example`, execute `npm run db:migrate` antes da inicialização e mantenha o banco em rede privada. Faça backup diário e teste a restauração regularmente.

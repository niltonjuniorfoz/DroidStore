# Design System: STORE BR

Este documento define o sistema de design e os padrões visuais para o **STORE BR**, alinhados a um layout ultra-premium e interativo de e-commerce de tecnologia.

---

## 1. Paleta de Cores e Tipografia

### Cores da Marca & Destaques
- **Laranja Primário (STORE & Destaques)**: `#FF7900` (Hover: `#E66D00`)
- **Grafite / Slate Escuro (Textos & Marca)**: `#1E2229`
- **B em Verde Brasil**: `#00B040` (B do badge BR com efeito brilhante)
- **R em Azul Brasil**: `#0055D4` (R do badge BR com efeito brilhante)
- **Cinza de Apoio / Mutado**: `#6C757D`
- **Linhas e Bordas**: `#E5E7EB` / `#DEE2E6`
- **Fundo Secundário**: `#F8F9FA` / `#F1F3F5`

### Tipografia Premium
- **Base / UI**: `Plus Jakarta Sans`, system-ui, sans-serif
- **Marca / Títulos**: `Outfit`, sans-serif

---

## 2. Estrutura do Cabeçalho (Header STORE BR)

### A. Barra Superior (Top Utility Bar)
- **Fundo**: `#F8F9FA`, borda inferior sutil `#E5E7EB`.
- **Altura**: `36px`.
- **Conteúdo Esquerdo**: Anúncio (`"Especialistas em tecnologia!"`).
- **Conteúdo Direito**: Links úteis (Atendimento, Blog, Meus Pedidos, Redes sociais).

### B. Cabeçalho Principal (Main Header)
- **Fundo**: Branco puro (`#FFFFFF`) com sombra suave.
- **Logo STORE BR (Design Ouro & Bandeira do Brasil)**:
  - `STORE`: Tipografia em tom Ouro Metálico (`linear-gradient(#C59B27, #F5E598, #B8860B)`), com efeito de brilho suave e elegante (*subtle gold shine*).
  - `BR`: As letras **B** e **R** contêm a **Bandeira do Brasil** perfeitamente recortada em seu interior via máscara SVG vector (fundo verde `#009C3B`, losango amarelo `#FFDF00`, círculo azul `#002776` e faixa branca).
- **Barra de Pesquisa Centralizada**:
  - Borda arredondada suave (`23px`).
  - Placeholder: *"Encontre a sua tecnologia..."*
  - Botão integrado à direita em Laranja (`#FF7900`) com ícone de lupa branco.
- **Ações Interativas ("Vivas")**:
  - **Carrinho de Compras**: Ícone de carrinho de compras (`ShoppingCart`) com cápsula circular hover, badge com efeito pulse em Laranja.
  - **Minha Conta / Entrar**: Ícone de usuário (`UserRound`) em cápsula circular com micro-animação hover.

### C. Menu de Categorias (Sub-Header Navigation)
- Categorias organizadas: **Todos os celulares**, **iPhones**, **Samsung**, **Motorola**, **Seminovos**, **Ofertas**.
- Hover com linha inferior em Laranja (`#FF7900`).

---

## 3. Padrões de Layout e Componentes da Página Inicial

1. **Carrossel Hero / Banners Promocionais**:
   - Banners limpos com fundo gradiente suave e destaques para smartphones em promoção.
   - Botões de ação em Laranja (`#FF7900`).

2. **Barra de Benefícios & Garantias**:
   - 🔄 **Garantia de 90 dias** (Garantia e revisão de até 90 dias).
   - 🚚 **Frete Grátis** (Envio rápido para todo o Brasil).
   - 💳 **Pix com Desconto** (Desconto especial no pagamento via Pix).
   - 🛡️ **Aparelhos 100% Revisados** (Testados por especialistas).

3. **Cards de Produtos (Vitrine Trocafone)**:
   - Fundo branco com borda fina (`#E5E7EB`).
   - Tag de condição visível (ex: *"Seminovo - Excelente"*, *"Novo"*).
   - Foto do produto centralizada.
   - Nome do produto em destaque + Avaliação de estrelas.
   - Preço De / Por com valor em destaque e parcelamento (ex: *"12x de R$ 149,90"*).

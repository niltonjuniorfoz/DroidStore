import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { CircleDollarSign, PackageCheck, TrendingUp, AlertTriangle, Users } from "lucide-react";
import AdminShell from "../../src/components/admin/AdminShell";
import "../admin/admin-theme.css";

const adminFont = Inter({ subsets: ["latin"], variable: "--font-admin", display: "swap" });

// Galeria de componentes do tema do painel — SÓ EM DESENVOLVIMENTO.
// Permite conferir o design system sem login; em produção é 404.
export default function AdminThemePreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className={adminFont.variable}>
      <AdminShell user="Wender" role="ADMIN">
        <div className="admin-easy">
          <div className="dash-header-bar">
            <div>
              <span className="eyebrow">Central de Operações • Aura Tech</span>
              <h1>Visão Geral da Loja</h1>
              <p>Galeria do tema — todos os componentes do painel em um lugar.</p>
            </div>
            <div className="dash-quick-actions">
              <button className="button primary sm">Novo produto</button>
              <button className="button ghost sm">Exportar mês</button>
            </div>
          </div>

          <section className="metric-grid">
            <article className="metric-card accent">
              <span><CircleDollarSign /> Faturamento no mês</span>
              <strong>R$ 148.320,00</strong>
              <small className="positive"><TrendingUp /> 12,4% versus mês anterior</small>
            </article>
            <article className="metric-card profit">
              <span><TrendingUp /> Lucro no mês</span>
              <strong>R$ 31.980,00</strong>
              <small>21,6% de margem bruta • Taxas MP: R$ 1.470,00</small>
            </article>
            <article className="metric-card">
              <span><PackageCheck /> Pedidos pagos</span>
              <strong>164</strong>
              <small>Ticket Médio: R$ 904,39</small>
            </article>
            <article className="metric-card warning">
              <span><AlertTriangle /> Reposição de Estoque</span>
              <strong>7</strong>
              <small>Itens em nível crítico ou esgotados</small>
            </article>
            <article className="metric-card">
              <span><Users /> Clientes cadastrados</span>
              <strong>1.208</strong>
              <small>Base ativa de compradores</small>
            </article>
          </section>

          <div className="pro-tabs">
            <button className="pro-tab active">Todos (164)</button>
            <button className="pro-tab">🟡 Pendentes (3)</button>
            <button className="pro-tab">🔵 Pagos (12)</button>
            <button className="pro-tab">↩️ Reembolsados (1)</button>
          </div>

          <section className="admin-data-card">
            <div className="admin-toolbar">
              <label className="toolbar-search"><input placeholder="Buscar modelo, cor, IMEI, Serial..." /></label>
              <select className="pro-select"><option>Todo o período</option></select>
            </div>
            <table>
              <thead><tr><th>Produto</th><th>Condição</th><th>Status</th><th style={{ textAlign: "right" }}>Preço</th></tr></thead>
              <tbody>
                <tr><td><strong>iPhone 17 Pro Max — 1 TB Laranja</strong></td><td>Excelente</td><td><em className="status-chip paid">Pago</em></td><td style={{ textAlign: "right" }}>R$ 9.310,00</td></tr>
                <tr><td><strong>Galaxy S25 Ultra — 512 GB Titânio</strong></td><td>Novo</td><td><em className="status-chip shipped">Enviado</em></td><td style={{ textAlign: "right" }}>R$ 7.890,00</td></tr>
                <tr><td><strong>MacBook Pro M4 Pro — 1 TB</strong></td><td>Novo</td><td><em className="status-chip pending">Aguardando</em></td><td style={{ textAlign: "right" }}>R$ 16.065,00</td></tr>
                <tr><td><strong>Redmi Note 15 Pro 5G</strong></td><td>Novo</td><td><em className="status-chip refunded">Reembolsado</em></td><td style={{ textAlign: "right" }}>R$ 1.782,00</td></tr>
              </tbody>
            </table>
          </section>

          <section className="admin-panel">
            <header>
              <PackageCheck />
              <div><h2>Novo lote</h2><p>Formulários do painel com foco laranja e campos de 38px.</p></div>
            </header>
            <div className="admin-form-grid">
              <label>Fornecedor<input placeholder="Ex.: Atlantico PY" /></label>
              <label>Moeda<select><option>USD</option><option>USDT</option><option>BRL</option></select></label>
              <label>Custo unitário (USD)<input type="number" placeholder="520.00" /></label>
              <label>Cotação do dia<input type="number" placeholder="5.2000" /></label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button className="button primary">Registrar lote</button>
              <button className="button ghost">Cancelar</button>
              <button className="button danger">Excluir</button>
              <button className="button secondary">Secundário</button>
            </div>
          </section>

          <div className="admin-message">Configurações salvas com sucesso.</div>
          <div className="form-error">Falha de conexão. Recarregue a página.</div>
        </div>
      </AdminShell>
    </div>
  );
}

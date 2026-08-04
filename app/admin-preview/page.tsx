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

          <section className="action-queue">
            <a className="action-card urgent" href="#"><strong>4</strong><span>pedido(s) pagos para enviar</span><em>2 há mais de 24h — prioridade</em></a>
            <a className="action-card" href="#"><strong>3</strong><span>aguardando pagamento</span></a>
            <a className="action-card warn" href="#"><strong>7</strong><span>variações em estoque crítico</span></a>
            <a className="action-card warn" href="#"><strong>357</strong><span>produto(s) ativos sem foto</span></a>
          </section>

          <section className="today-strip">
            <div><span>Hoje</span><strong>R$ 4.310,00</strong><small>3 pedido(s) confirmado(s)</small></div>
            <div><span>Ontem</span><strong>R$ 2.980,00</strong><small>2 pedido(s)</small></div>
            <div className="today-methods"><span>Pagamento no mês</span><div><small><b>PIX</b> R$ 121.400,00 (139)</small><small><b>CARTAO</b> R$ 26.920,00 (25)</small></div></div>
          </section>

          <section className="list-stats">
            <div><span>Clientes</span><strong>1.208</strong></div>
            <div><span>Com recompra</span><strong className="good">214 (31%)</strong></div>
            <div><span>Envio atrasado (+24h)</span><strong className="bad">2</strong></div>
            <div><span>Segmentos</span><strong><span className="seg-badge champion">Campeão</span> <span className="seg-badge repeat">Recorrente</span> <span className="seg-badge new">Novo</span> <span className="seg-badge risk">Em risco</span> <span className="seg-badge inactive">Inativo</span></strong></div>
            <div><span>SLA</span><strong><span className="sla-badge late">pago há 31h — enviar!</span> <span className="sla-badge soon">pago há 14h</span></strong></div>
          </section>

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

          <div className="dash-columns">
            <div className="dash-main">
              <section className="admin-data-card">
                <header><div><h2>Mais vendidos no mês</h2><p>Participação no faturamento.</p></div></header>
                <div className="rank-list">
                  <div className="rank-row"><span className="rank-pos">1</span><div className="rank-info"><strong>iPhone 17 Pro Max — 1 TB</strong><div className="share-track"><div className="share-fill" style={{ width: "92%" }} /></div><small>14 unidade(s)</small></div><b>R$ 130.340,00</b></div>
                  <div className="rank-row"><span className="rank-pos">2</span><div className="rank-info"><strong>Galaxy S25 Ultra — 512 GB</strong><div className="share-track"><div className="share-fill" style={{ width: "48%" }} /></div><small>8 unidade(s)</small></div><b>R$ 63.120,00</b></div>
                </div>
              </section>
            </div>
            <aside className="dash-rail">
              <section className="admin-data-card rail-card">
                <header><div><h2>Pagamento no mês</h2></div></header>
                <div className="method-list">
                  <div className="method-row"><div className="method-head"><strong>PIX</strong><b>R$ 121.400,00</b></div><div className="share-track"><div className="share-fill" style={{ width: "82%" }} /></div><small>139 pedido(s) · 82% do faturamento</small></div>
                  <div className="method-row"><div className="method-head"><strong>CARTAO</strong><b>R$ 26.920,00</b></div><div className="share-track"><div className="share-fill" style={{ width: "18%" }} /></div><small>25 pedido(s) · 18%</small></div>
                </div>
              </section>
              <section className="admin-data-card rail-card">
                <header><div><h2>Atividade da equipe</h2></div></header>
                <div className="activity-feed">
                  <div className="activity-row"><span className="activity-dot" /><div><strong>Produto atualizado: iPhone 17 Pro (price, stock)</strong><small>wendder2@gmail.com · 03/08 14:22</small></div></div>
                  <div className="activity-row"><span className="activity-dot" /><div><strong>Pedido #A1B2C3D4: PAID → SHIPPED</strong><small>gerente@auratech.com · 03/08 13:57</small></div></div>
                </div>
              </section>
            </aside>
          </div>

          <section className="admin-data-card">
            <div className="stock-table-wrap">
              <table>
                <thead>
                  <tr><th className="cell-chk" /><th>Produto / Variação</th><th>Estoque</th><th>Mín.</th><th className="cell-num">Custo</th><th className="cell-num">Venda</th><th className="cell-num">Valor em estoque</th><th className="cell-action">Ação</th></tr>
                </thead>
                <tbody>
                  <tr className="stock-group-row has-critical">
                    <td className="cell-chk"><button className="checkbox-btn">☐</button></td>
                    <td><div className="stock-item-cell"><span className="group-caret open">▾</span><span className="mini-thumb">📱</span><div><strong className="stock-item-name">iPhone 17 Pro Max</strong><small className="cell-muted">Apple · 3 variação(ões) · 1 crítica(s)</small></div></div></td>
                    <td><span className="pill-stock low">21 un.</span></td>
                    <td className="cell-muted">—</td>
                    <td className="cell-num cell-muted">R$ 158.400,00</td>
                    <td className="cell-num cell-muted">—</td>
                    <td className="cell-num"><strong>R$ 196.300,00</strong></td>
                    <td className="cell-action cell-muted">recolher</td>
                  </tr>
                  <tr className="stock-variant-row">
                    <td className="cell-chk"><button className="checkbox-btn">☐</button></td>
                    <td><div className="stock-item-cell"><div><div className="item-subtags"><span className="tag-storage">256 GB</span><span className="tag-storage">Laranja</span><span className="tag-storage">Excelente</span></div></div></div></td>
                    <td><span className="pill-stock ok">12 un.</span></td>
                    <td className="cell-muted">5</td>
                    <td className="cell-num">R$ 6.900,00</td>
                    <td className="cell-num">R$ 9.310,00</td>
                    <td className="cell-num"><strong>R$ 111.720,00</strong></td>
                    <td className="cell-action"><button className="button ghost sm">Movimentar</button></td>
                  </tr>
                  <tr className="stock-variant-row row-selected">
                    <td className="cell-chk"><button className="checkbox-btn"><span className="checked-icon">☑</span></button></td>
                    <td><div className="stock-item-cell"><div><div className="item-subtags"><span className="tag-storage">1 TB</span><span className="tag-storage">Titânio</span><span className="tag-stale">sem giro</span></div></div></div></td>
                    <td><span className="pill-stock zero">Esgotado</span></td>
                    <td className="cell-muted">5</td>
                    <td className="cell-num">R$ 8.100,00</td>
                    <td className="cell-num">R$ 11.200,00</td>
                    <td className="cell-num"><strong>R$ 0,00</strong></td>
                    <td className="cell-action"><button className="button ghost sm">Movimentar</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="admin-message">Configurações salvas com sucesso.</div>
          <div className="form-error">Falha de conexão. Recarregue a página.</div>
        </div>
      </AdminShell>
    </div>
  );
}

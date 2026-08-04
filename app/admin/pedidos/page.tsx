"use client";

import { useEffect, useMemo, useState } from "react";
import { createWhatsAppUrl } from "../../../src/lib/contact";
import { formatBrazilPhone } from "../../../src/lib/brazil";
import { useAdminFeedback } from "../../../src/components/admin/AdminFeedback";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  History,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Search,
  Square,
  Truck,
  X,
  XCircle,
} from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: string;
  costPrice?: string;
  variant: {
    storage: string | null;
    color: string | null;
    product: { name: string; imageUrl: string | null };
  };
};

type Order = {
  id: string;
  status: string;
  totalAmount: string;
  paymentMethod: string;
  trackingCode: string | null;
  createdAt: string;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingComplement: string | null;
  shippingNeighborhood: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  costTotal?: number;
  grossProfit?: number;
  user: { id: string; name: string | null; email: string; phone: string | null };
  items: OrderItem[];
  statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>;
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusLabels: Record<string, string> = {
  ALL: "Todos",
  PENDING: "Aguardando pagamento",
  PAID: "Pago — embalar",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

// Horas desde a confirmação do pagamento (para o SLA de envio).
function hoursSincePaid(order: Order): number | null {
  if (order.status !== "PAID") return null;
  const paidAt = order.statusHistory.find((entry) => entry.toStatus === "PAID")?.createdAt;
  return paidAt ? (Date.now() - new Date(paidAt).getTime()) / 36e5 : null;
}

// Fila de trabalho: quem precisa de ação primeiro.
function urgencyScore(order: Order): number {
  const hours = hoursSincePaid(order);
  if (order.status === "PAID" && hours !== null && hours >= 24) return 0; // atrasado
  if (order.status === "PAID") return 1; // embalar
  if (order.status === "PENDING") return 2; // cobrança pendente
  if (order.status === "SHIPPED") return 3; // acompanhar
  return 4;
}

export default function AdminPedidos() {
  const { toast, confirmDialog } = useAdminFeedback();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "month">("all");
  const [sortMode, setSortMode] = useState<"urgency" | "recent" | "total" | "customer">("urgency");
  const [trackingCode, setTrackingCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function load(period: string = dateFilter, query: string = search) {
    setLoading(true);
    try {
      // Período e busca filtram no servidor: o limite de 250 não esconde
      // pedidos antigos quando se procura algo específico.
      const params = new URLSearchParams();
      if (period !== "all") params.set("period", period);
      if (query.trim()) params.set("q", query.trim());
      const suffix = params.size ? `?${params}` : "";
      const response = await fetch(`/api/admin/orders${suffix}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível carregar os pedidos.");
      else { setOrders(body); setError(""); }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => { void load(dateFilter, search); }, search.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [dateFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [search, status, dateFilter, pageSize]);

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();
    return orders.filter((order) => {
      const matchesStatus = status === "ALL" || order.status === status;
      const itemsStr = order.items.map((item) => item.variant.product.name).join(" ").toLowerCase();
      const matchesSearch = !term ||
        order.id.toLowerCase().includes(term) ||
        (order.user.name?.toLowerCase() ?? "").includes(term) ||
        order.user.email.toLowerCase().includes(term) ||
        (order.shippingCity?.toLowerCase() ?? "").includes(term) ||
        itemsStr.includes(term);
      return matchesStatus && matchesSearch;
    }).sort((a, b) => {
      if (sortMode === "urgency") {
        const scoreDiff = urgencyScore(a) - urgencyScore(b);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === "total") return Number(b.totalAmount) - Number(a.totalAmount);
      if (sortMode === "customer") return (a.user.name ?? a.user.email).localeCompare(b.user.name ?? b.user.email, "pt-BR");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [orders, search, status, sortMode]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(pageOrders: Order[]) {
    const pageIds = pageOrders.map((order) => order.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function bulkUpdateStatus(nextStatus: string) {
    if (selectedIds.size === 0) return;
    if (!(await confirmDialog({
      title: "Alterar em massa",
      message: `Alterar o status de ${selectedIds.size} pedido(s) para "${statusLabels[nextStatus]}"?`,
      confirmLabel: "Alterar",
      danger: nextStatus === "CANCELLED",
    }))) return;
    setSaving(true);
    const responses = await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }).catch(() => null),
      ),
    );
    const failed = responses.filter((response) => !response?.ok).length;
    setSelectedIds(new Set());
    await load();
    setSaving(false);
    if (failed) toast(`${failed} pedido(s) não puderam mudar de status (transição inválida?).`, "error");
    else toast("Status alterado em massa.", "success");
  }

  function copyShippingList() {
    const list = orders
      .filter((order) => selectedIds.has(order.id))
      .map((order) => `Pedido #${order.id.slice(0, 8).toUpperCase()} - ${order.user.name ?? order.user.email}\nEndereço: ${order.shippingStreet ?? ""} ${order.shippingNumber ?? ""}, ${order.shippingNeighborhood ?? ""} - ${order.shippingCity ?? ""}/${order.shippingState ?? ""} (CEP: ${order.shippingZipCode ?? ""})`)
      .join("\n\n---\n\n");
    void navigator.clipboard.writeText(list);
    toast("Lista de endereços copiada para a área de transferência.", "success");
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function open(order: Order) {
    setSelected(order);
    setTrackingCode(order.trackingCode ?? "");
    setError("");
  }

  async function updateOrder(nextStatus?: string) {
    if (!selected) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/orders/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextStatus === "SHIPPED" || !nextStatus ? { trackingCode } : {}),
      }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível atualizar o pedido.");
    else {
      await load();
      setSelected(null);
      toast(nextStatus ? `Pedido atualizado para ${statusLabels[nextStatus] ?? nextStatus}.` : "Rastreio salvo.", "success");
    }
    setSaving(false);
  }

  // MÉTRICAS DO RECORTE
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const paidCount = orders.filter((order) => order.status === "PAID").length;
  const shippedCount = orders.filter((order) => order.status === "SHIPPED").length;
  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;
  const confirmed = filteredOrders.filter((order) => ["PAID", "SHIPPED", "DELIVERED"].includes(order.status));
  const revenue = confirmed.reduce((total, order) => total + Number(order.totalAmount), 0);
  const profit = confirmed.reduce((total, order) => total + (order.grossProfit ?? 0), 0);
  const hasProfit = confirmed.some((order) => order.grossProfit !== undefined);
  const lateCount = filteredOrders.filter((order) => (hoursSincePaid(order) ?? 0) >= 24).length;

  const slaBadge = (order: Order) => {
    const hours = hoursSincePaid(order);
    if (hours === null) return null;
    if (hours >= 24) return <span className="sla-badge late">pago há {Math.floor(hours)}h — enviar!</span>;
    if (hours >= 12) return <span className="sla-badge soon">pago há {Math.floor(hours)}h</span>;
    return null;
  };

  return (
    <div className="admin-easy">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Vendas • {orders.length} pedido(s) no período carregado</span>
          <h1>Pedidos</h1>
          <p>Fila por urgência: atrasados primeiro, depois prontos para embalar, cobranças e envios.</p>
        </div>
        <button className="button ghost sm" onClick={() => void load()} title="Atualizar dados">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {error && !selected && <div className="form-error">{error}</div>}

      {/* RESUMO ÚNICO DO RECORTE */}
      <section className="list-stats" aria-label="Resumo dos pedidos filtrados">
        <div><span>No recorte</span><strong>{filteredOrders.length}</strong></div>
        <div><span>Receita confirmada</span><strong>{money(revenue)}</strong></div>
        {hasProfit && <div><span>Lucro</span><strong className="good">{money(profit)}</strong></div>}
        <div><span>Ticket médio</span><strong>{money(confirmed.length ? revenue / confirmed.length : 0)}</strong></div>
        <div><span>Envio atrasado (+24h)</span><strong className={lateCount > 0 ? "bad" : "good"}>{lateCount}</strong></div>
      </section>

      {/* CARD ÚNICO: TOOLBAR + TABELA + PAGINAÇÃO */}
      <div className="admin-data-card">
        <div className="admin-toolbar stock-toolbar">
          <label className="toolbar-search">
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código (#A1B2), cliente, e-mail, cidade ou produto..."
            />
          </label>
          <div className="pro-tabs">
            <button className={`pro-tab ${status === "ALL" ? "active" : ""}`} onClick={() => setStatus("ALL")}>Todos ({orders.length})</button>
            <button className={`pro-tab ${status === "PAID" ? "active" : ""}`} onClick={() => setStatus("PAID")}>Embalar ({paidCount})</button>
            <button className={`pro-tab ${status === "PENDING" ? "active" : ""}`} onClick={() => setStatus("PENDING")}>Aguardando ({pendingCount})</button>
            <button className={`pro-tab ${status === "SHIPPED" ? "active" : ""}`} onClick={() => setStatus("SHIPPED")}>Enviados ({shippedCount})</button>
            <button className={`pro-tab ${status === "DELIVERED" ? "active" : ""}`} onClick={() => setStatus("DELIVERED")}>Entregues ({deliveredCount})</button>
            <button className={`pro-tab ${status === "CANCELLED" ? "active" : ""}`} onClick={() => setStatus("CANCELLED")}>Cancelados ({orders.filter((order) => order.status === "CANCELLED").length})</button>
            <button className={`pro-tab ${status === "REFUNDED" ? "active" : ""}`} onClick={() => setStatus("REFUNDED")}>Reembolsados ({orders.filter((order) => order.status === "REFUNDED").length})</button>
          </div>
          <div className="pro-filters-bar">
            <select className="pro-select" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}>
              <option value="all">Todo o período</option>
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="month">Este mês</option>
            </select>
            <select className="pro-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
              <option value="urgency">Ordenar: mais urgentes</option>
              <option value="recent">Ordenar: mais recentes</option>
              <option value="total">Ordenar: maior valor</option>
              <option value="customer">Ordenar: cliente A-Z</option>
            </select>
          </div>
        </div>

        <div className="stock-table-wrap">
          <table>
            <thead>
              <tr>
                <th className="cell-chk">
                  <button onClick={() => toggleSelectAll(paginatedOrders)} className="checkbox-btn" aria-label="Selecionar página">
                    {paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedIds.has(order.id))
                      ? <CheckSquare size={15} className="checked-icon" />
                      : <Square size={15} />}
                  </button>
                </th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Itens / Destino</th>
                <th className="cell-num">Total</th>
                <th>Status</th>
                <th className="cell-action">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7}><div className="admin-loading">Carregando pedidos...</div></td></tr>
              )}

              {!loading && paginatedOrders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                const firstItem = order.items[0];
                const whatsappUrl = createWhatsAppUrl(order.user.phone, `Olá ${order.user.name ?? ""}, sobre seu pedido #${order.id.slice(0, 8).toUpperCase()}`);
                return (
                  <tr key={order.id} className={isSelected ? "row-selected" : ""}>
                    <td className="cell-chk">
                      <button onClick={() => toggleSelectId(order.id)} className="checkbox-btn" aria-label="Selecionar pedido">
                        {isSelected ? <CheckSquare size={15} className="checked-icon" /> : <Square size={15} />}
                      </button>
                    </td>
                    <td>
                      <strong className="order-code">#{order.id.slice(0, 8).toUpperCase()}</strong>
                      <small className="cell-muted" style={{ display: "block" }}>
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")} {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {order.paymentMethod}
                      </small>
                    </td>
                    <td>
                      <strong style={{ fontSize: "0.73rem", display: "block" }}>{order.user.name ?? "Sem nome"}</strong>
                      <small className="cell-muted">{order.user.email}</small>
                      {whatsappUrl && (
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="whatsapp-quick-link" title="Conversar no WhatsApp">
                          <MessageCircle size={11} /> WhatsApp
                        </a>
                      )}
                    </td>
                    <td>
                      <div className="stock-item-cell">
                        <span className="mini-thumb">
                          {firstItem?.variant.product.imageUrl ? <img src={firstItem.variant.product.imageUrl} alt="" loading="lazy" /> : <PackageCheck size={14} />}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <strong className="stock-item-name" style={{ maxWidth: 240 }}>{firstItem?.variant.product.name ?? "Produto"}</strong>
                          <small className="cell-muted" style={{ display: "block" }}>
                            {order.items.length > 1 ? `+${order.items.length - 1} item(ns) · ` : ""}
                            {order.shippingCity ? `${order.shippingCity}/${order.shippingState}` : "sem endereço"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="cell-num">
                      <strong>{money(Number(order.totalAmount))}</strong>
                      {order.grossProfit !== undefined && (
                        <small style={{ display: "block", color: "var(--a-success)" }}>lucro {money(order.grossProfit)}</small>
                      )}
                    </td>
                    <td>
                      <em className={`status-chip ${order.status.toLowerCase()}`}>{statusLabels[order.status] ?? order.status}</em>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                        {slaBadge(order)}
                        {order.trackingCode && (
                          <button className="tracking-code-btn" onClick={() => copyText(order.trackingCode!, order.id)} title="Copiar rastreio">
                            {copiedId === order.id ? "Copiado!" : order.trackingCode}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="cell-action">
                      <button className="button ghost sm" onClick={() => open(order)} title="Detalhes, rastreio e ações">
                        <Eye size={13} /> Abrir
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && paginatedOrders.length === 0 && (
                <tr><td colSpan={7}><p className="empty-inline" style={{ padding: "1.2rem" }}>Nenhum pedido com esses filtros. Limpe a busca ou troque a aba.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-toolbar stock-pagination">
          <span className="cell-muted">{paginatedOrders.length} de {filteredOrders.length} pedido(s) no recorte</span>
          <div className="pro-filters-bar">
            <select className="pro-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              <option value={25}>25 / página</option>
              <option value={50}>50 / página</option>
              <option value={100}>100 / página</option>
            </select>
            <div className="page-buttons">
              <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={15} /> Anterior</button>
              <span className="cell-muted">{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima <ChevronRight size={15} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA FLUTUANTE DE AÇÕES EM MASSA */}
      {selectedIds.size > 0 && (
        <div className="bulk-actions-floating-bar">
          <span className="bulk-count"><strong>{selectedIds.size}</strong> pedido(s) selecionado(s)</span>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={() => void bulkUpdateStatus("SHIPPED")}><Truck size={14} /> Marcar Enviados</button>
            <button className="bulk-btn" onClick={() => void bulkUpdateStatus("DELIVERED")}><PackageCheck size={14} /> Marcar Entregues</button>
            <button className="bulk-btn" onClick={copyShippingList}><Copy size={14} /> Copiar Endereços</button>
            <button className="bulk-btn danger" onClick={() => void bulkUpdateStatus("CANCELLED")}><XCircle size={14} /> Cancelar</button>
            <button className="bulk-close" onClick={() => setSelectedIds(new Set())}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* MODAL: DETALHE DO PEDIDO EM DUAS COLUNAS */}
      {selected && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="order-modal order-modal-wide">
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar"><X /></button>
            <div className="order-modal-head">
              <div>
                <span className="eyebrow">Pedido #{selected.id.slice(0, 8).toUpperCase()} · {new Date(selected.createdAt).toLocaleString("pt-BR")}</span>
                <h2>{statusLabels[selected.status] ?? selected.status}</h2>
              </div>
              <em className={`status-chip ${selected.status.toLowerCase()}`}>{statusLabels[selected.status] ?? selected.status}</em>
            </div>

            <div className="order-modal-grid">
              {/* COLUNA ESQUERDA: ITENS + LINHA DO TEMPO */}
              <div className="order-modal-main">
                <div className="order-items">
                  {selected.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <span className="mini-thumb" style={{ width: 42, height: 42 }}>
                        {item.variant.product.imageUrl ? <img src={item.variant.product.imageUrl} alt="" /> : <PackageCheck size={16} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: "0.76rem", display: "block" }}>{item.variant.product.name}</strong>
                        <small className="cell-muted">{[item.variant.storage, item.variant.color].filter(Boolean).join(" · ")} · {item.quantity} un.</small>
                      </div>
                      <b style={{ fontSize: "0.76rem", whiteSpace: "nowrap" }}>{money(Number(item.price) * item.quantity)}</b>
                    </div>
                  ))}
                </div>

                <div className="order-timeline">
                  <h3><History size={14} /> Linha do tempo</h3>
                  <div className="activity-feed" style={{ padding: 0 }}>
                    {[...selected.statusHistory].reverse().map((entry) => (
                      <div key={entry.id} className="activity-row">
                        <span className="activity-dot" />
                        <div>
                          <strong>
                            {entry.fromStatus ? `${statusLabels[entry.fromStatus] ?? entry.fromStatus} → ` : ""}
                            {statusLabels[entry.toStatus] ?? entry.toStatus}
                          </strong>
                          <small>{entry.note ? `${entry.note} · ` : ""}{new Date(entry.createdAt).toLocaleString("pt-BR")}</small>
                        </div>
                      </div>
                    ))}
                    {selected.statusHistory.length === 0 && <p className="empty-inline">Sem eventos registrados.</p>}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: CLIENTE, ENDEREÇO, FINANCEIRO, AÇÕES */}
              <aside className="order-modal-side">
                <div className="order-side-block">
                  <small>Cliente</small>
                  <strong>{selected.user.name ?? selected.user.email}</strong>
                  <span>{selected.user.email}{selected.user.phone ? ` · ${formatBrazilPhone(selected.user.phone)}` : ""}</span>
                  {selected.user.phone && (
                    <a
                      href={createWhatsAppUrl(selected.user.phone, `Olá ${selected.user.name ?? ""}, sobre seu pedido #${selected.id.slice(0, 8).toUpperCase()}`) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="button ghost sm"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  )}
                </div>

                <div className="order-side-block">
                  <small>Entrega</small>
                  <strong>{selected.shippingCity ? `${selected.shippingCity}/${selected.shippingState}` : "Não informada"}</strong>
                  <span>
                    {selected.shippingStreet} {selected.shippingNumber}{selected.shippingComplement ? `, ${selected.shippingComplement}` : ""}<br />
                    {selected.shippingNeighborhood} · CEP {selected.shippingZipCode}
                  </span>
                  <button
                    type="button"
                    className="button ghost sm"
                    onClick={() => copyText(`${selected.shippingStreet} ${selected.shippingNumber}, ${selected.shippingNeighborhood} - ${selected.shippingCity}/${selected.shippingState} - CEP: ${selected.shippingZipCode}`, "address-copy")}
                  >
                    <Copy size={12} /> {copiedId === "address-copy" ? "Copiado!" : "Copiar endereço"}
                  </button>
                </div>

                <div className="order-side-block">
                  <small>Financeiro</small>
                  <strong>{money(Number(selected.totalAmount))}</strong>
                  <span>
                    Pagamento: {selected.paymentMethod}
                    {selected.grossProfit !== undefined && (
                      <><br />Custo {money(selected.costTotal ?? 0)} · Lucro <b style={{ color: "var(--a-success)" }}>{money(selected.grossProfit)}</b></>
                    )}
                  </span>
                </div>

                {(selected.status === "PAID" || selected.status === "SHIPPED") && (
                  <label className="tracking-field">
                    <span>Código de rastreio</span>
                    <input
                      value={trackingCode}
                      onChange={(event) => setTrackingCode(event.target.value)}
                      placeholder="Ex.: BR123456789BR"
                    />
                  </label>
                )}

                {error && <div className="form-error">{error}</div>}

                <div className="order-actions order-actions-column">
                  {selected.status === "PENDING" && (
                    <>
                      <button disabled={saving} className="button primary" onClick={() => void updateOrder("PAID")}>
                        <Check size={15} /> Confirmar pagamento
                      </button>
                      <button disabled={saving} className="button danger" onClick={() => void updateOrder("CANCELLED")}>
                        <XCircle size={15} /> Cancelar pedido
                      </button>
                    </>
                  )}

                  {selected.status === "PAID" && (
                    <>
                      <button disabled={saving} className="button primary" onClick={() => void updateOrder("SHIPPED")}>
                        <Truck size={15} /> Marcar como enviado
                      </button>
                      <button
                        disabled={saving}
                        className="button danger"
                        onClick={() => {
                          void confirmDialog({ title: "Reembolsar pedido", message: "O estoque volta e o pedido sai do faturamento. A devolução do dinheiro deve ser feita no painel do Mercado Pago.", confirmLabel: "Reembolsar", danger: true }).then((accepted) => { if (accepted) void updateOrder("REFUNDED"); });
                        }}
                      >
                        <XCircle size={15} /> Reembolsar
                      </button>
                    </>
                  )}

                  {selected.status === "SHIPPED" && (
                    <>
                      <button disabled={saving} className="button primary" onClick={() => void updateOrder("DELIVERED")}>
                        <PackageCheck size={15} /> Marcar como entregue
                      </button>
                      <button disabled={saving} className="button ghost" onClick={() => void updateOrder()}>
                        <Truck size={15} /> Salvar rastreio
                      </button>
                      <button
                        disabled={saving}
                        className="button danger"
                        onClick={() => {
                          void confirmDialog({ title: "Reembolsar pedido enviado", message: "O aparelho já foi enviado: o estoque NÃO volta sozinho — lance a devolução no estoque após conferir o aparelho.", confirmLabel: "Reembolsar", danger: true }).then((accepted) => { if (accepted) void updateOrder("REFUNDED"); });
                        }}
                      >
                        <XCircle size={15} /> Reembolsar
                      </button>
                    </>
                  )}

                  {selected.status === "DELIVERED" && (
                    <button
                      disabled={saving}
                      className="button danger"
                      onClick={() => {
                        void confirmDialog({ title: "Reembolsar (devolução)", message: "Devolução/arrependimento: o estoque NÃO volta sozinho — lance a devolução no estoque após conferir o aparelho.", confirmLabel: "Reembolsar", danger: true }).then((accepted) => { if (accepted) void updateOrder("REFUNDED"); });
                      }}
                    >
                      <XCircle size={15} /> Reembolsar
                    </button>
                  )}

                  <button className="button ghost" onClick={() => setSelected(null)}>Fechar</button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

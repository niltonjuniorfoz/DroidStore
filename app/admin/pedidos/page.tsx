"use client";

import { useEffect, useMemo, useState } from "react";
import { createWhatsAppUrl } from "../../../src/lib/contact";
import { formatBrazilPhone } from "../../../src/lib/brazil";
import { useAdminFeedback } from "../../../src/components/admin/AdminFeedback";
import {
  ArrowUpDown,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  MessageCircle,
  PackageCheck,
  PackageX,
  Receipt,
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
  PAID: "Pago (Pronto para embalar)",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export default function AdminPedidos() {
  const { toast, confirmDialog } = useAdminFeedback();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "month">("all");
  const [trackingCode, setTrackingCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // PAGINAÇÃO E ORDENAÇÃO
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<"date" | "total" | "status" | "customer">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
    // Debounce só quando há busca digitada; troca de período recarrega na hora.
    const timer = setTimeout(() => { void load(dateFilter, search); }, search.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [dateFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [search, status, dateFilter, pageSize]);

  // FILTRAGEM E ORDENAÇÃO
  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders.filter((order) => {
      const matchesStatus = status === "ALL" || order.status === status;
      const orderDate = new Date(order.createdAt);
      const matchesDate =
        dateFilter === "all" ? true :
        dateFilter === "today" ? orderDate.toISOString().split("T")[0] === todayStr :
        dateFilter === "7days" ? orderDate >= sevenDaysAgo :
        dateFilter === "month" ? orderDate >= monthStart : true;

      const itemsStr = order.items.map((i) => i.variant.product.name).join(" ").toLowerCase();
      const matchesSearch = !term ||
        order.id.toLowerCase().includes(term) ||
        (order.user.name?.toLowerCase() ?? "").includes(term) ||
        order.user.email.toLowerCase().includes(term) ||
        (order.shippingCity?.toLowerCase() ?? "").includes(term) ||
        itemsStr.includes(term);

      return matchesStatus && matchesDate && matchesSearch;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === "date") comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === "total") comp = Number(a.totalAmount) - Number(b.totalAmount);
      else if (sortField === "status") comp = a.status.localeCompare(b.status);
      else if (sortField === "customer") comp = (a.user.name ?? a.user.email).localeCompare(b.user.name ?? b.user.email);
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [orders, search, status, dateFilter, sortField, sortDirection]);

  // PAGINAÇÃO
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // SELEÇÃO EM MASSA
  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(pageOrders: Order[]) {
    const pageIds = pageOrders.map((o) => o.id);
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
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        })
      )
    );
    setSelectedIds(new Set());
    await load();
    setSaving(false);
  }

  function copyShippingList() {
    const list = orders
      .filter((o) => selectedIds.has(o.id))
      .map((o) => `Pedido #${o.id.slice(0, 8).toUpperCase()} - ${o.user.name ?? o.user.email}\nEndereço: ${o.shippingStreet ?? ""} ${o.shippingNumber ?? ""}, ${o.shippingNeighborhood ?? ""} - ${o.shippingCity ?? ""}/${o.shippingState ?? ""} (CEP: ${o.shippingZipCode ?? ""})`)
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
    }
    setSaving(false);
  }

  function handleSort(field: "date" | "total" | "status" | "customer") {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  // CÁLCULOS KPI
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const paidCount = orders.filter((o) => o.status === "PAID").length;
  const shippedCount = orders.filter((o) => o.status === "SHIPPED").length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const totalRevenue = orders
    .filter((o) => ["PAID", "SHIPPED", "DELIVERED"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="admin-easy">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Gestão de Vendas • {orders.length} pedido(s) registrado(s)</span>
          <h1>Central de Pedidos</h1>
          <p>Confirme pagamentos, emita notas, informe rastreio e acompanhe entregas em lote.</p>
        </div>
        <button className="button ghost" onClick={() => void load()} title="Atualizar dados">
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {error && !selected && <div className="form-error">{error}</div>}

      {/* --- CARDS DE KPI EXECUTIVOS DE PEDIDOS --- */}
      <section className="catalog-kpi-grid">
        <div className="kpi-card warning">
          <span><Receipt size={16} /> Aguardando Pagamento</span>
          <strong>{pendingCount}</strong>
          <small>PIX / Boletos pendentes</small>
        </div>

        <div className="kpi-card profit">
          <span><PackageCheck size={16} /> Prontos p/ Embalar (Pagos)</span>
          <strong>{paidCount}</strong>
          <small>Aguardando código de rastreio</small>
        </div>

        <div className="kpi-card">
          <span><Truck size={16} /> Em Trânsito (Enviados)</span>
          <strong>{shippedCount}</strong>
          <small>{deliveredCount} já entregues ao cliente</small>
        </div>

        <div className="kpi-card profit">
          <span><CreditCard size={16} /> Faturamento Confirmado</span>
          <strong>{money(totalRevenue)}</strong>
          <small>Pedidos pagos no período</small>
        </div>
      </section>

      {/* --- TOOLBAR AVANÇADA DE PEDIDOS --- */}
      {(() => {
        // Resumo do conjunto filtrado (período/busca ativos): visão de pregão.
        const confirmed = filteredOrders.filter((order) => ["PAID", "SHIPPED", "DELIVERED"].includes(order.status));
        const revenue = confirmed.reduce((total, order) => total + Number(order.totalAmount), 0);
        const late = filteredOrders.filter((order) => {
          if (order.status !== "PAID") return false;
          const paidAt = order.statusHistory.find((entry) => entry.toStatus === "PAID")?.createdAt;
          return paidAt ? Date.now() - new Date(paidAt).getTime() > 24 * 36e5 : false;
        }).length;
        return (
          <section className="list-stats" aria-label="Resumo dos pedidos filtrados">
            <div><span>Pedidos no recorte</span><strong>{filteredOrders.length}</strong></div>
            <div><span>Receita confirmada</span><strong>{money(revenue)}</strong></div>
            <div><span>Ticket médio</span><strong>{money(confirmed.length ? revenue / confirmed.length : 0)}</strong></div>
            <div><span>Envio atrasado (+24h)</span><strong className={late > 0 ? "bad" : "good"}>{late}</strong></div>
          </section>
        );
      })()}

      <div className="product-toolbar-pro">
        <div className="pro-tabs">
          <button className={`pro-tab ${status === "ALL" ? "active" : ""}`} onClick={() => setStatus("ALL")}>
            Todos ({orders.length})
          </button>
          <button className={`pro-tab ${status === "PENDING" ? "active" : ""}`} onClick={() => setStatus("PENDING")}>
            🟡 Pendentes ({pendingCount})
          </button>
          <button className={`pro-tab ${status === "PAID" ? "active" : ""}`} onClick={() => setStatus("PAID")}>
            🔵 Pagos ({paidCount})
          </button>
          <button className={`pro-tab ${status === "SHIPPED" ? "active" : ""}`} onClick={() => setStatus("SHIPPED")}>
            🟣 Enviados ({shippedCount})
          </button>
          <button className={`pro-tab ${status === "DELIVERED" ? "active" : ""}`} onClick={() => setStatus("DELIVERED")}>
            🟢 Entregues ({deliveredCount})
          </button>
          <button className={`pro-tab ${status === "CANCELLED" ? "active" : ""}`} onClick={() => setStatus("CANCELLED")}>
            🔴 Cancelados ({orders.filter((o) => o.status === "CANCELLED").length})
          </button>
          <button className={`pro-tab ${status === "REFUNDED" ? "active" : ""}`} onClick={() => setStatus("REFUNDED")}>
            ↩️ Reembolsados ({orders.filter((o) => o.status === "REFUNDED").length})
          </button>
        </div>

        <div className="pro-filters-bar">
          <select className="pro-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
            <option value="all">Todo o período</option>
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="month">Este Mês</option>
          </select>

          <label className="pro-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID (#A1B2), nome do cliente, e-mail ou cidade..."
            />
          </label>
        </div>
      </div>

      {/* --- BARRA FLUTUANTE DE AÇÕES EM MASSA --- */}
      {selectedIds.size > 0 && (
        <div className="bulk-actions-floating-bar">
          <span className="bulk-count">
            <strong>{selectedIds.size}</strong> pedido(s) selecionado(s)
          </span>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={() => void bulkUpdateStatus("SHIPPED")}>
              <Truck size={14} /> Marcar como Enviados
            </button>
            <button className="bulk-btn" onClick={() => void bulkUpdateStatus("DELIVERED")}>
              <PackageCheck size={14} /> Marcar como Entregues
            </button>
            <button className="bulk-btn" onClick={copyShippingList}>
              <Copy size={14} /> Copiar Lista de Endereços
            </button>
            <button className="bulk-btn danger" onClick={() => void bulkUpdateStatus("CANCELLED")}>
              <XCircle size={14} /> Cancelar Selecionados
            </button>
            <button className="bulk-close" onClick={() => setSelectedIds(new Set())}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* --- TABELA DENSA DE PEDIDOS --- */}
      <div className="pro-table-container table-mode-comfortable">
        <div className="pro-table-header order-table-cols">
          <div className="col-chk">
            <button onClick={() => toggleSelectAll(paginatedOrders)} className="checkbox-btn">
              {paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.has(o.id)) ? (
                <CheckSquare size={16} className="checked-icon" />
              ) : (
                <Square size={16} />
              )}
            </button>
          </div>
          <div className="col-order sortable" onClick={() => handleSort("date")}>
            <span>Pedido & Data</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-customer sortable" onClick={() => handleSort("customer")}>
            <span>Cliente</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-details">Produtos & Destino</div>
          <div className="col-total sortable" onClick={() => handleSort("total")}>
            <span>Total & Lucro</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-status sortable" onClick={() => handleSort("status")}>
            <span>Status</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-actions">Ação</div>
        </div>

        <div className="pro-table-body">
          {loading ? (
            <div className="admin-loading">Carregando pedidos...</div>
          ) : (
            paginatedOrders.map((order) => {
              const isSelected = selectedIds.has(order.id);
              const firstItem = order.items[0];
              const firstImage = firstItem?.variant.product.imageUrl;
              const whatsappUrl = createWhatsAppUrl(order.user.phone, `Olá ${order.user.name ?? ""}, sobre seu pedido #${order.id.slice(0, 8).toUpperCase()}`);

              return (
                <div key={order.id} className={`pro-table-row order-table-cols ${isSelected ? "row-selected" : ""}`}>
                  <div className="col-chk">
                    <button onClick={() => toggleSelectId(order.id)} className="checkbox-btn">
                      {isSelected ? <CheckSquare size={16} className="checked-icon" /> : <Square size={16} />}
                    </button>
                  </div>

                  {/* Pedido & Data */}
                  <div className="col-order">
                    <div className="order-id-block">
                      <strong className="order-code">#{order.id.slice(0, 8).toUpperCase()}</strong>
                      <span className="order-date-time">{new Date(order.createdAt).toLocaleDateString("pt-BR")} às {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="payment-method-chip">{order.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="col-customer">
                    <div className="customer-block">
                      <strong className="customer-name">{order.user.name ?? "Sem nome"}</strong>
                      <small className="customer-email">{order.user.email}</small>
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="whatsapp-quick-link"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Produtos & Destino */}
                  <div className="col-details">
                    <div className="order-items-preview">
                      <div className="order-first-thumb">
                        {firstImage ? <img src={firstImage} alt="" /> : <PackageCheck size={16} />}
                      </div>
                      <div className="order-item-info">
                        <span className="order-item-title" title={firstItem?.variant.product.name}>
                          {firstItem?.variant.product.name ?? "Produto"}
                        </span>
                        <small className="order-item-more">
                          {order.items.length > 1 ? `+${order.items.length - 1} outro(s) item(ns)` : `${firstItem?.variant.storage ?? ""} ${firstItem?.variant.color ?? ""}`}
                        </small>
                        <small className="order-city-tag">
                          📍 {order.shippingCity ? `${order.shippingCity}/${order.shippingState}` : "Retirada/Não informado"}
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Total & Lucro */}
                  <div className="col-total">
                    <strong className="order-total-val">{money(Number(order.totalAmount))}</strong>
                    {order.grossProfit !== undefined && (
                      <span className="profit-green">Lucro: {money(order.grossProfit)}</span>
                    )}
                  </div>

                  {/* Status & Rastreio */}
                  <div className="col-status">
                    <div className="order-status-block">
                      <em className={`status-chip ${order.status.toLowerCase()}`}>
                        {statusLabels[order.status] ?? order.status}
                      </em>
                      {(() => {
                        // SLA de envio: pago há +12h/+24h sem despachar chama atenção.
                        if (order.status !== "PAID") return null;
                        const paidAt = order.statusHistory.find((entry) => entry.toStatus === "PAID")?.createdAt;
                        if (!paidAt) return null;
                        const hours = (Date.now() - new Date(paidAt).getTime()) / 36e5;
                        if (hours >= 24) return <span className="sla-badge late">pago há {Math.floor(hours)}h — enviar!</span>;
                        if (hours >= 12) return <span className="sla-badge soon">pago há {Math.floor(hours)}h</span>;
                        return null;
                      })()}
                      {order.trackingCode && (
                        <button
                          className="tracking-code-btn"
                          onClick={() => copyText(order.trackingCode!, order.id)}
                          title="Clique para copiar rastreio"
                        >
                          🚚 {copiedId === order.id ? "Copiado!" : order.trackingCode}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="col-actions">
                    <button className="button primary sm" onClick={() => open(order)} title="Ver detalhes do pedido">
                      <Eye size={14} /> Ver
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {!loading && paginatedOrders.length === 0 && (
            <div className="empty-table-state">
              <p>Nenhum pedido encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- CONTROLE DE PAGINAÇÃO --- */}
      <div className="pro-pagination-bar">
        <div className="pagination-info">
          Exibindo <strong>{paginatedOrders.length}</strong> de <strong>{filteredOrders.length}</strong> pedido(s)
          (Total loja: {orders.length})
        </div>

        <div className="pagination-controls">
          <label className="page-size-selector">
            Exibir por página:
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <div className="page-buttons">
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL DE DETALHES DO PEDIDO --- */}
      {selected && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="order-modal">
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar"><X /></button>
            <span className="eyebrow">Pedido #{selected.id.slice(0, 8).toUpperCase()}</span>
            <h2>{statusLabels[selected.status] ?? selected.status}</h2>

            <div className="order-summary-grid">
              <div>
                <small>Cliente</small>
                <strong>{selected.user.name ?? selected.user.email}</strong>
                <span>
                  {selected.user.email}
                  <br />
                  {selected.user.phone ? `WhatsApp: ${formatBrazilPhone(selected.user.phone)}` : ""}
                </span>
                {selected.user.phone && (
                  <a
                    href={createWhatsAppUrl(selected.user.phone, `Olá ${selected.user.name ?? ""}, sobre seu pedido #${selected.id.slice(0, 8).toUpperCase()}`) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="button ghost sm text-xs mt-2"
                    style={{ display: "inline-flex", gap: "4px" }}
                  >
                    <MessageCircle size={13} /> Abrir WhatsApp
                  </a>
                )}
              </div>

              <div>
                <small>Endereço de Entrega</small>
                <strong>{selected.shippingCity ? `${selected.shippingCity}/${selected.shippingState}` : "Não informada"}</strong>
                <span>
                  {selected.shippingStreet} {selected.shippingNumber}{selected.shippingComplement ? `, ${selected.shippingComplement}` : ""}
                  <br />
                  {selected.shippingNeighborhood} • CEP {selected.shippingZipCode}
                </span>
                <button
                  type="button"
                  className="button ghost sm text-xs mt-2"
                  onClick={() => copyText(`${selected.shippingStreet} ${selected.shippingNumber}, ${selected.shippingNeighborhood} - ${selected.shippingCity}/${selected.shippingState} - CEP: ${selected.shippingZipCode}`, "address-copy")}
                >
                  <Copy size={12} /> {copiedId === "address-copy" ? "Copiado!" : "Copiar Endereço"}
                </button>
              </div>

              <div>
                <small>Resumo Financeiro</small>
                <strong>{money(Number(selected.totalAmount))}</strong>
                {selected.grossProfit !== undefined && (
                  <span>Custo {money(selected.costTotal ?? 0)} • Lucro {money(selected.grossProfit)}</span>
                )}
                <span className="mt-1 font-bold text-xs" style={{ color: "#087c25" }}>
                  Pagamento: {selected.paymentMethod}
                </span>
              </div>
            </div>

            <div className="order-items">
              {selected.items.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <div className="mini-thumb" style={{ width: "42px", height: "42px" }}>
                    {item.variant.product.imageUrl ? <img src={item.variant.product.imageUrl} alt="" /> : <PackageCheck size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{item.variant.product.name}</strong>
                    <span>{item.variant.storage} {item.variant.color} • {item.quantity} un.</span>
                  </div>
                  <b>{money(Number(item.price) * item.quantity)}</b>
                </div>
              ))}
            </div>

            {(selected.status === "PAID" || selected.status === "SHIPPED") && (
              <label className="tracking-field">
                <span>Código de rastreio (Correios / Loggi / Transportadora)</span>
                <input
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  placeholder="Ex.: BR123456789BR"
                />
              </label>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="order-actions">
              {selected.status === "PENDING" && (
                <>
                  <button disabled={saving} className="button danger" onClick={() => void updateOrder("CANCELLED")}>
                    <XCircle size={15} /> Cancelar pedido
                  </button>
                  <button disabled={saving} className="button primary" onClick={() => void updateOrder("PAID")}>
                    <Check size={15} /> Confirmar pagamento
                  </button>
                </>
              )}

              {selected.status === "PAID" && (
                <>
                  <button
                    disabled={saving}
                    className="button danger"
                    onClick={() => {
                      void confirmDialog({ title: "Reembolsar pedido", message: "O estoque volta e o pedido sai do faturamento. A devolução do dinheiro deve ser feita no painel do Mercado Pago.", confirmLabel: "Reembolsar", danger: true }).then((accepted) => { if (accepted) void updateOrder("REFUNDED"); });
                    }}
                  >
                    <XCircle size={15} /> Reembolsar
                  </button>
                  <button disabled={saving} className="button primary" onClick={() => void updateOrder("SHIPPED")}>
                    <Truck size={15} /> Marcar como enviado
                  </button>
                </>
              )}

              {selected.status === "SHIPPED" && (
                <>
                  <button
                    disabled={saving}
                    className="button danger"
                    onClick={() => {
                      void confirmDialog({ title: "Reembolsar pedido enviado", message: "O aparelho já foi enviado: o estoque NÃO volta sozinho — lance a devolução no estoque após conferir o aparelho.", confirmLabel: "Reembolsar", danger: true }).then((accepted) => { if (accepted) void updateOrder("REFUNDED"); });
                    }}
                  >
                    <XCircle size={15} /> Reembolsar
                  </button>
                  <button disabled={saving} className="button ghost" onClick={() => void updateOrder()}>
                    <Truck size={15} /> Salvar rastreio
                  </button>
                  <button disabled={saving} className="button primary" onClick={() => void updateOrder("DELIVERED")}>
                    <PackageCheck size={15} /> Marcar como entregue
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

              {["DELIVERED", "CANCELLED", "REFUNDED"].includes(selected.status) && (
                <button className="button ghost" onClick={() => setSelected(null)}>
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

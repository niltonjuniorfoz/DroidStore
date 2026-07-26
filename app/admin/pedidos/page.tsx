"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, PackageCheck, Search, Truck, X, XCircle } from "lucide-react";

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
  user: { name: string | null; email: string; phone: string | null };
  items: Array<{
    id: string; quantity: number; price: string; costPrice?: string;
    variant: { storage: string | null; color: string | null; product: { name: string; imageUrl: string | null } };
  }>;
  statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>;
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const labels: Record<string, string> = {
  ALL: "Todos", PENDING: "Aguardando pagamento", PAID: "Pago", SHIPPED: "Enviado", DELIVERED: "Entregue", CANCELLED: "Cancelado",
};

export default function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [trackingCode, setTrackingCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível carregar os pedidos.");
    else { setOrders(body); setError(""); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return orders.filter((order) =>
      (status === "ALL" || order.status === status) &&
      (!term || order.id.toLowerCase().includes(term) || order.user.name?.toLowerCase().includes(term) || order.user.email.toLowerCase().includes(term)),
    );
  }, [orders, search, status]);

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

  return <div className="admin-easy">
    <div className="admin-title"><div><span className="eyebrow">Vendas</span><h1>Pedidos</h1><p>Confirme pagamentos, informe rastreio e acompanhe cada etapa.</p></div></div>
    {error && !selected && <div className="form-error">{error}</div>}
    <section className="admin-data-card">
      <div className="admin-toolbar">
        <label className="toolbar-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por pedido, cliente ou e-mail" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status">
          {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {loading ? <div className="admin-loading">Carregando pedidos...</div> : <div className="responsive-table">
        <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>{filtered.map((order) => <tr key={order.id}>
            <td><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><small>{order.items.length} item(ns) • {order.paymentMethod}</small></td>
            <td><strong>{order.user.name ?? "Sem nome"}</strong><small>{order.user.email}</small></td>
            <td>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
            <td><strong>{money(Number(order.totalAmount))}</strong>{order.grossProfit !== undefined && <small>Lucro {money(order.grossProfit)}</small>}</td>
            <td><em className={`status-chip ${order.status.toLowerCase()}`}>{labels[order.status]}</em></td>
            <td><button className="icon-action" onClick={() => open(order)} aria-label="Ver pedido"><Eye /></button></td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <div className="empty-inline">Nenhum pedido encontrado.</div>}
      </div>}
    </section>

    {selected && <div className="admin-modal" role="dialog" aria-modal="true">
      <div className="order-modal">
        <button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar"><X /></button>
        <span className="eyebrow">Pedido #{selected.id.slice(0, 8).toUpperCase()}</span>
        <h2>{labels[selected.status]}</h2>
        <div className="order-summary-grid">
          <div><small>Cliente</small><strong>{selected.user.name ?? selected.user.email}</strong><span>{selected.user.email}<br />{selected.user.phone ?? ""}</span></div>
          <div><small>Entrega</small><strong>{selected.shippingCity ? `${selected.shippingCity}/${selected.shippingState}` : "Não informada"}</strong><span>{selected.shippingStreet} {selected.shippingNumber}{selected.shippingComplement ? `, ${selected.shippingComplement}` : ""}<br />{selected.shippingNeighborhood} • CEP {selected.shippingZipCode}</span></div>
          <div><small>Total</small><strong>{money(Number(selected.totalAmount))}</strong>{selected.grossProfit !== undefined && <span>Custo {money(selected.costTotal ?? 0)} • lucro {money(selected.grossProfit)}</span>}</div>
        </div>
        <div className="order-items">{selected.items.map((item) => <div key={item.id}>
          <div><strong>{item.variant.product.name}</strong><span>{item.variant.storage} {item.variant.color} • {item.quantity} un.</span></div><b>{money(Number(item.price) * item.quantity)}</b>
        </div>)}</div>
        {(selected.status === "PAID" || selected.status === "SHIPPED") && <label className="tracking-field"><span>Código de rastreio</span><input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Ex.: BR123456789BR" /></label>}
        {error && <div className="form-error">{error}</div>}
        <div className="order-actions">
          {selected.status === "PENDING" && <>
            <button disabled={saving} className="button danger" onClick={() => void updateOrder("CANCELLED")}><XCircle /> Cancelar pedido</button>
            <button disabled={saving} className="button primary" onClick={() => void updateOrder("PAID")}><Check /> Confirmar pagamento</button>
          </>}
          {selected.status === "PAID" && <button disabled={saving} className="button primary" onClick={() => void updateOrder("SHIPPED")}><Truck /> Marcar como enviado</button>}
          {selected.status === "SHIPPED" && <>
            <button disabled={saving} className="button ghost" onClick={() => void updateOrder()}><Truck /> Salvar rastreio</button>
            <button disabled={saving} className="button primary" onClick={() => void updateOrder("DELIVERED")}><PackageCheck /> Marcar como entregue</button>
          </>}
          {["DELIVERED", "CANCELLED"].includes(selected.status) && <button className="button ghost" onClick={() => setSelected(null)}>Fechar</button>}
        </div>
      </div>
    </div>}
  </div>;
}

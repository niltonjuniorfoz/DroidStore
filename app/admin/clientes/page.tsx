"use client";

import { formatBrazilPhone } from "../../../src/lib/brazil";
import { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Search, ShoppingBag, Users } from "lucide-react";

type Customer = {
  id: string; name: string | null; email: string; phone: string | null; cpf: string | null; createdAt: string;
  orderCount: number; totalSpent: number;
  addresses: Array<{ id: string; city: string; state: string }>;
  orders: Array<{ id: string; status: string; totalAmount: string; createdAt: string }>;
};
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CONFIRMED = ["PAID", "SHIPPED", "DELIVERED"];
const DAY = 24 * 60 * 60 * 1000;

// Segmentação RFM simplificada: recência manda; depois, frequência.
// Referência: em e-commerce, ~65% da receita vem de clientes recorrentes.
function segmentOf(customer: Customer): { key: string; label: string; days: number | null } {
  const confirmed = customer.orders.filter((order) => CONFIRMED.includes(order.status));
  if (!confirmed.length) return { key: "inactive", label: "Sem compra", days: null };
  const last = Math.max(...confirmed.map((order) => new Date(order.createdAt).getTime()));
  const days = Math.floor((Date.now() - last) / DAY);
  if (days > 120) return { key: "inactive", label: "Inativo", days };
  if (days > 60) return { key: "risk", label: "Em risco", days };
  if (confirmed.length >= 3) return { key: "champion", label: "Campeão", days };
  if (confirmed.length === 2) return { key: "repeat", label: "Recorrente", days };
  return { key: "new", label: "Novo", days };
}

export default function AdminClientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    // Busca no servidor com debounce: com muitos clientes, o take não esconde ninguém.
    const timer = setTimeout(() => {
      const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      void fetch(`/api/admin/customers${suffix}`, { cache: "no-store" })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) setError(body.error ?? "Não foi possível carregar os clientes.");
          else { setCustomers(body); setError(""); }
        })
        .catch(() => setError("Falha de conexão. Tente novamente."))
        .finally(() => setLoading(false));
    }, search.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [search]);
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return customers.filter((customer) => !term || `${customer.name} ${customer.email} ${customer.phone} ${customer.cpf}`.toLowerCase().includes(term));
  }, [customers, search]);
  const totalSpent = customers.reduce((total, customer) => total + customer.totalSpent, 0);

  return <div className="admin-easy">
    <div className="admin-title"><div><span className="eyebrow">Relacionamento</span><h1>Clientes</h1><p>Contas, histórico de compras e dados de contato.</p></div></div>
    {(() => {
      const buyers = customers.filter((customer) => customer.orderCount > 0);
      const repeatBuyers = buyers.filter((customer) => customer.orders.filter((order) => CONFIRMED.includes(order.status)).length >= 2);
      const repeatRevenue = repeatBuyers.reduce((total, customer) => total + customer.totalSpent, 0);
      const new30d = customers.filter((customer) => Date.now() - new Date(customer.createdAt).getTime() <= 30 * DAY).length;
      return (
        <section className="list-stats" aria-label="Resumo da base de clientes">
          <div><span>Clientes</span><strong>{customers.length}</strong></div>
          <div><span>Novos (30 dias)</span><strong>{new30d}</strong></div>
          <div><span>Compraram</span><strong>{buyers.length}</strong></div>
          <div><span>Com recompra</span><strong className="good">{repeatBuyers.length} ({buyers.length ? Math.round((repeatBuyers.length / buyers.length) * 100) : 0}%)</strong></div>
          <div><span>Receita de recorrentes</span><strong>{money(repeatRevenue)} {totalSpent ? `(${Math.round((repeatRevenue / totalSpent) * 100)}%)` : ""}</strong></div>
          <div><span>Total confirmado</span><strong>{money(totalSpent)}</strong></div>
        </section>
      );
    })()}
    {error && <div className="form-error">{error}</div>}
    <section className="admin-data-card">
      <div className="admin-toolbar"><label className="toolbar-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail, telefone ou CPF" /></label></div>
      {loading ? <div className="admin-loading">Carregando clientes...</div> : <div className="customer-grid">
        {filtered.map((customer) => <article key={customer.id}>
          <div className="customer-avatar">{(customer.name ?? customer.email).slice(0, 1).toUpperCase()}</div>
          <div className="customer-info"><h2>{customer.name ?? "Cliente sem nome"}</h2><span><Mail /> {customer.email}</span>{customer.phone && <span>{formatBrazilPhone(customer.phone)}</span>}{customer.addresses[0] && <span><MapPin /> {customer.addresses[0].city}/{customer.addresses[0].state}</span>}</div>
          <div className="customer-stats">
            {(() => { const seg = segmentOf(customer); return <span className={`seg-badge ${seg.key}`}>{seg.label}</span>; })()}
            <span><strong>{customer.orderCount}</strong> pedidos · <strong>{money(customer.totalSpent)}</strong></span>
            {(() => { const seg = segmentOf(customer); return seg.days !== null ? <small>última compra há {seg.days} dia(s)</small> : <small>nunca comprou</small>; })()}
            <small>desde {new Date(customer.createdAt).toLocaleDateString("pt-BR")}</small>
          </div>
        </article>)}
        {!filtered.length && <p className="empty-inline">Nenhum cliente encontrado.</p>}
      </div>}
    </section>
  </div>;
}

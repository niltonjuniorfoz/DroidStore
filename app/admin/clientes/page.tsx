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

export default function AdminClientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/admin/customers", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível carregar os clientes.");
      else setCustomers(body);
      setLoading(false);
    });
  }, []);
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return customers.filter((customer) => !term || `${customer.name} ${customer.email} ${customer.phone} ${customer.cpf}`.toLowerCase().includes(term));
  }, [customers, search]);
  const totalSpent = customers.reduce((total, customer) => total + customer.totalSpent, 0);

  return <div className="admin-easy">
    <div className="admin-title"><div><span className="eyebrow">Relacionamento</span><h1>Clientes</h1><p>Contas, histórico de compras e dados de contato.</p></div></div>
    <section className="inventory-summary"><div><Users /><span><strong>{customers.length}</strong> clientes cadastrados</span></div><div><ShoppingBag /><span><strong>{money(totalSpent)}</strong> em compras confirmadas</span></div></section>
    {error && <div className="form-error">{error}</div>}
    <section className="admin-data-card">
      <div className="admin-toolbar"><label className="toolbar-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail, telefone ou CPF" /></label></div>
      {loading ? <div className="admin-loading">Carregando clientes...</div> : <div className="customer-grid">
        {filtered.map((customer) => <article key={customer.id}>
          <div className="customer-avatar">{(customer.name ?? customer.email).slice(0, 1).toUpperCase()}</div>
          <div className="customer-info"><h2>{customer.name ?? "Cliente sem nome"}</h2><span><Mail /> {customer.email}</span>{customer.phone && <span>{formatBrazilPhone(customer.phone)}</span>}{customer.addresses[0] && <span><MapPin /> {customer.addresses[0].city}/{customer.addresses[0].state}</span>}</div>
          <div className="customer-stats"><span><strong>{customer.orderCount}</strong> pedidos</span><span><strong>{money(customer.totalSpent)}</strong> total pago</span><small>Cliente desde {new Date(customer.createdAt).toLocaleDateString("pt-BR")}</small></div>
        </article>)}
        {!filtered.length && <p className="empty-inline">Nenhum cliente encontrado.</p>}
      </div>}
    </section>
  </div>;
}

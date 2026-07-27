"use client";

import { FormEvent, useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { BRAZIL_STATES } from "../../../src/lib/brazil";

type Address = { id: string; zipCode: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string };
const emptyAddress = { zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

export default function EnderecosPage() {
  const [items, setItems] = useState<Address[]>([]);
  const [form, setForm] = useState<Omit<Address, "id"> & { id?: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/account/addresses", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setItems(body); else setError(body.error);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    const response = await fetch(form.id ? `/api/account/addresses/${form.id}` : "/api/account/addresses", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível salvar.");
    else { setForm(null); await load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Remover este endereço?")) return;
    const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) await load(); else setError("Não foi possível remover o endereço.");
  }

  return <section className="profile-card">
    <header><div><span className="eyebrow">Entrega</span><h2>Meus endereços</h2><p>Cadastre endereços do Brasil para receber seus pedidos.</p></div><button className="button primary" onClick={() => setForm({ ...emptyAddress, complement: null })}><Plus /> Novo endereço</button></header>
    {error && <div className="form-error account-alert">{error}</div>}
    <div className="address-grid">{items.map((address) => <article key={address.id}><MapPin /><div><strong>{address.street}, {address.number}</strong><span>{address.complement ? `${address.complement} • ` : ""}{address.neighborhood}<br />{address.city}/{address.state} • Brasil • CEP {address.zipCode}</span></div><div><button onClick={() => setForm({ ...address })}><Pencil /></button><button className="danger-text" onClick={() => void remove(address.id)}><Trash2 /></button></div></article>)}{!items.length && <p className="empty-inline">Você ainda não cadastrou endereços.</p>}</div>

    {form && <div className="admin-modal"><form className="address-modal" onSubmit={submit}>
      <button type="button" className="modal-close" onClick={() => setForm(null)}><X /></button>
      <h2>{form.id ? "Editar endereço" : "Novo endereço"}</h2>
      <div className="admin-form-grid">
        <label>País<input value="Brasil" readOnly aria-readonly="true" /></label>
        <label>Estado
          <select value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required>
            <option value="">Selecione o estado</option>
            {BRAZIL_STATES.map((state) => <option key={state.value} value={state.value}>{state.label} ({state.value})</option>)}
          </select>
        </label>
        <label>CEP<input value={form.zipCode} onChange={(event) => setForm({ ...form, zipCode: event.target.value })} inputMode="numeric" placeholder="00000-000" required /></label>
        <label className="wide">Rua/Avenida<input value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} required /></label>
        <label>Número<input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} required /></label>
        <label>Complemento<input value={form.complement ?? ""} onChange={(event) => setForm({ ...form, complement: event.target.value })} /></label>
        <label>Bairro<input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} required /></label>
        <label>Cidade<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setForm(null)}>Cancelar</button><button disabled={saving} className="button primary">{saving ? "Salvando..." : "Salvar endereço"}</button></div>
    </form></div>}
  </section>;
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";

type FilterOption = {
  id: string; label: string; slug: string; active: boolean;
  _count: { productSelections: number };
};
type CatalogFilter = {
  id: string; name: string; slug: string; active: boolean;
  options: FilterOption[];
};

export default function AdminFiltros() {
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/filters", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setFilters(body); else setError(body.error ?? "Não foi possível carregar os filtros.");
  }
  useEffect(() => { void load(); }, []);

  async function request(url: string, method: string, body?: unknown) {
    setBusy(true); setError(""); setMessage("");
    const response = await fetch(url, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) setError(result?.error ?? "Não foi possível concluir.");
    else await load();
    setBusy(false);
    return response.ok;
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (await request("/api/admin/filters", "POST", { name: newGroup })) {
      setNewGroup(""); setMessage("Novo filtro criado.");
    }
  }
  async function addOption(event: FormEvent, filterId: string) {
    event.preventDefault();
    const label = optionDrafts[filterId] ?? "";
    if (await request(`/api/admin/filters/${filterId}/options`, "POST", { label })) {
      setOptionDrafts((current) => ({ ...current, [filterId]: "" }));
      setMessage("Opção adicionada.");
    }
  }
  async function saveName() {
    if (!editing) return;
    if (await request(`/api/admin/filters/${editing.id}`, "PATCH", { name: editing.name })) {
      setEditing(null); setMessage("Nome atualizado.");
    }
  }
  async function removeFilter(filter: CatalogFilter) {
    const linked = filter.options.reduce((total, option) => total + option._count.productSelections, 0);
    if (!confirm(`Excluir o filtro “${filter.name}”? ${linked ? `Ele está ligado a ${linked} produto(s) e essas ligações serão removidas.` : ""}`)) return;
    if (await request(`/api/admin/filters/${filter.id}`, "DELETE")) setMessage("Filtro excluído.");
  }
  async function removeOption(filter: CatalogFilter, option: FilterOption) {
    if (!confirm(`Excluir “${option.label}” de ${filter.name}? ${option._count.productSelections ? `A opção será removida de ${option._count.productSelections} produto(s).` : ""}`)) return;
    if (await request(`/api/admin/filter-options/${option.id}`, "DELETE")) setMessage("Opção excluída.");
  }

  async function moveFilter(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= filters.length) return;
    const reordered = [...filters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setFilters(reordered);
    const response = await fetch("/api/admin/filters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((filter) => filter.id) }),
    });
    if (!response.ok) {
      setError((await response.json()).error ?? "Não foi possível alterar a ordem.");
      await load();
    } else {
      setMessage("Ordem dos filtros atualizada.");
    }
  }

  return <div className="admin-easy">
    <div className="admin-title"><div><span className="eyebrow">Organização do catálogo</span><h1>Filtros e categorias</h1><p>Crie marcas, tipos de produto ou qualquer outro agrupamento que seus clientes possam usar.</p></div></div>
    {message && <div className="admin-message">{message}</div>}
    {error && <div className="form-error">{error}</div>}

    <section className="filter-create-card">
      <div><SlidersHorizontal /><span><strong>Criar novo filtro</strong><small>Exemplos: Marca, Tipo de produto, Linha ou Memória RAM.</small></span></div>
      <form onSubmit={createGroup}><input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} aria-label="Nome do novo filtro" required /><button disabled={busy || newGroup.trim().length < 2} className="button primary"><Plus /> Criar filtro</button></form>
    </section>

    <section className="filter-admin-grid">
      {filters.map((filter, index) => <article key={filter.id} className={!filter.active ? "filter-hidden" : ""}>
        <header>
          <div>{editing?.id === filter.id
            ? <div className="inline-edit"><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} autoFocus /><button onClick={() => void saveName()}>Salvar</button><button onClick={() => setEditing(null)}><X /></button></div>
            : <><span className="filter-icon"><SlidersHorizontal /></span><div><h2>{filter.name}</h2><small>{filter.options.length} opção(ões) • identificador: {filter.slug}</small></div></>}
          </div>
          <div className="filter-actions">
            <button disabled={index === 0} title="Mover para cima" onClick={() => void moveFilter(index, -1)}><ArrowUp /></button>
            <button disabled={index === filters.length - 1} title="Mover para baixo" onClick={() => void moveFilter(index, 1)}><ArrowDown /></button>
            <button title="Renomear" onClick={() => setEditing({ id: filter.id, name: filter.name })}><Pencil /></button>
            <button title={filter.active ? "Ocultar dos clientes" : "Mostrar aos clientes"} onClick={() => void request(`/api/admin/filters/${filter.id}`, "PATCH", { active: !filter.active })}>{filter.active ? <Eye /> : <EyeOff />}</button>
            <button className="danger-text" title="Excluir filtro" onClick={() => void removeFilter(filter)}><Trash2 /></button>
          </div>
        </header>
        <div className="filter-options-list">
          {filter.options.map((option) => <div key={option.id} className={!option.active ? "option-hidden" : ""}>
            <span><strong>{option.label}</strong><small>{option._count.productSelections} produto(s) associado(s)</small></span>
            <div>
              <button title={option.active ? "Ocultar opção" : "Mostrar opção"} onClick={() => void request(`/api/admin/filter-options/${option.id}`, "PATCH", { active: !option.active })}>{option.active ? <Eye /> : <EyeOff />}</button>
              <button className="danger-text" title="Excluir opção" onClick={() => void removeOption(filter, option)}><Trash2 /></button>
            </div>
          </div>)}
          {!filter.options.length && <p>Nenhuma opção cadastrada.</p>}
        </div>
        <form className="add-filter-option" onSubmit={(event) => void addOption(event, filter.id)}>
          <input value={optionDrafts[filter.id] ?? ""} onChange={(event) => setOptionDrafts((current) => ({ ...current, [filter.id]: event.target.value }))} aria-label={`Nova opção para ${filter.name}`} required />
          <button disabled={busy || !(optionDrafts[filter.id] ?? "").trim()}><Plus /> Adicionar opção</button>
        </form>
      </article>)}
    </section>
  </div>;
}

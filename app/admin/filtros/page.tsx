"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAdminFeedback } from "../../../src/components/admin/AdminFeedback";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";

type FilterOption = {
  id: string;
  label: string;
  slug: string;
  active: boolean;
  _count: { productSelections: number };
};

type CatalogFilter = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  options: FilterOption[];
};

export default function AdminFiltros() {
  const { toast, confirmDialog } = useAdminFeedback();
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [optionSearch, setOptionSearch] = useState("");
  const [sortMode, setSortMode] = useState<"count" | "alpha" | "manual">("count");
  const [newGroup, setNewGroup] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [optionDraft, setOptionDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [editingOption, setEditingOption] = useState<{ id: string; label: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/filters", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setFilters(body);
    else setError(body.error ?? "Não foi possível carregar os filtros.");
  }

  useEffect(() => {
    void load().catch(() => setError("Falha de conexão. Recarregue a página."));
  }, []);

  // Seleção padrão: primeiro filtro da lista.
  useEffect(() => {
    if (!selectedId && filters.length) setSelectedId(filters[0].id);
    if (selectedId && filters.length && !filters.some((filter) => filter.id === selectedId)) {
      setSelectedId(filters[0]?.id ?? null);
    }
  }, [filters, selectedId]);

  // Busca global: acha a opção em QUALQUER filtro e foca nele.
  const term = globalSearch.toLowerCase().trim();
  const matchesByFilter = useMemo(() => {
    const map = new Map<string, number>();
    if (!term) return map;
    for (const filter of filters) {
      const count = filter.name.toLowerCase().includes(term)
        ? filter.options.length
        : filter.options.filter((option) => option.label.toLowerCase().includes(term) || option.slug.includes(term)).length;
      if (count > 0) map.set(filter.id, count);
    }
    return map;
  }, [filters, term]);

  useEffect(() => {
    if (!term || matchesByFilter.size === 0) return;
    if (!selectedId || !matchesByFilter.has(selectedId)) {
      setSelectedId([...matchesByFilter.keys()][0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, matchesByFilter]);

  const visibleFilters = term ? filters.filter((filter) => matchesByFilter.has(filter.id)) : filters;
  const selected = filters.find((filter) => filter.id === selectedId) ?? null;

  async function request(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
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
      setNewGroup("");
      setShowNewGroup(false);
      toast("Novo filtro criado.", "success");
    }
  }

  async function addOptions(event: FormEvent) {
    event.preventDefault();
    if (!selected || !optionDraft.trim()) return;
    const labels = optionDraft.split(",").map((label) => label.trim()).filter(Boolean);
    setBusy(true);
    let successCount = 0;
    for (const label of labels) {
      const response = await fetch(`/api/admin/filters/${selected.id}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      }).catch(() => null);
      if (response?.ok) successCount += 1;
    }
    setOptionDraft("");
    await load();
    setBusy(false);
    if (successCount) toast(`${successCount} opção(ões) adicionada(s) em ${selected.name}.`, "success");
    if (successCount < labels.length) toast(`${labels.length - successCount} já existiam ou falharam.`, "error");
  }

  async function saveName() {
    if (!editing) return;
    if (await request(`/api/admin/filters/${editing.id}`, "PATCH", { name: editing.name })) {
      setEditing(null);
      toast("Nome do filtro atualizado.", "success");
    }
  }

  async function saveOptionLabel() {
    if (!editingOption) return;
    if (await request(`/api/admin/filter-options/${editingOption.id}`, "PATCH", { label: editingOption.label })) {
      setEditingOption(null);
      toast("Opção renomeada.", "success");
    }
  }

  async function removeFilter(filter: CatalogFilter) {
    const linked = filter.options.reduce((total, option) => total + option._count.productSelections, 0);
    if (!(await confirmDialog({ title: "Excluir filtro", message: `Excluir o filtro "${filter.name}"?${linked ? ` Ele está ligado a ${linked} produto(s) e essas ligações serão removidas.` : ""}`, confirmLabel: "Excluir", danger: true }))) return;
    if (await request(`/api/admin/filters/${filter.id}`, "DELETE")) toast("Filtro excluído.", "success");
  }

  async function removeOption(filter: CatalogFilter, option: FilterOption) {
    if (!(await confirmDialog({ title: "Excluir opção", message: `Excluir "${option.label}" de ${filter.name}?${option._count.productSelections ? ` A opção será removida de ${option._count.productSelections} produto(s).` : ""}`, confirmLabel: "Excluir", danger: true }))) return;
    if (await request(`/api/admin/filter-options/${option.id}`, "DELETE")) toast("Opção excluída.", "success");
  }

  async function purgeUnusedOptions(filter: CatalogFilter) {
    const unused = filter.options.filter((option) => option._count.productSelections === 0);
    if (unused.length === 0) {
      toast("Não há opções com 0 produtos neste filtro.", "info");
      return;
    }
    if (!(await confirmDialog({ title: "Limpar opções sem uso", message: `Excluir todas as ${unused.length} opções sem produtos em "${filter.name}"?`, confirmLabel: "Excluir todas", danger: true }))) return;
    setBusy(true);
    await Promise.all(unused.map((option) => fetch(`/api/admin/filter-options/${option.id}`, { method: "DELETE" }).catch(() => null)));
    await load();
    setBusy(false);
    toast(`${unused.length} opção(ões) sem produtos removidas.`, "success");
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
    }).catch(() => null);
    if (!response?.ok) {
      setError("Não foi possível alterar a ordem.");
      await load();
    }
  }

  // Opções do filtro selecionado (busca global OU interna + ordenação)
  const options = useMemo(() => {
    if (!selected) return [];
    const inner = (term || optionSearch.toLowerCase().trim());
    let list = [...selected.options];
    if (inner && !selected.name.toLowerCase().includes(inner)) {
      list = list.filter((option) => option.label.toLowerCase().includes(inner) || option.slug.includes(inner));
    }
    if (sortMode === "count") list.sort((a, b) => b._count.productSelections - a._count.productSelections || a.label.localeCompare(b.label, "pt-BR"));
    else if (sortMode === "alpha") list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return list;
  }, [selected, term, optionSearch, sortMode]);

  const totalOptions = filters.reduce((acc, filter) => acc + filter.options.length, 0);
  const optionsWithProducts = filters.reduce((acc, filter) => acc + filter.options.filter((option) => option._count.productSelections > 0).length, 0);
  const optionsUnused = totalOptions - optionsWithProducts;
  const selectedUnused = selected ? selected.options.filter((option) => option._count.productSelections === 0).length : 0;

  return (
    <div className="admin-easy">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Organização do Catálogo</span>
          <h1>Filtros e Categorias</h1>
          <p>Escolha um filtro à esquerda para trabalhar nele — ou busque uma opção e a tela acha onde ela mora.</p>
        </div>
      </div>

      {message && <div className="admin-message">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      <section className="metric-grid">
        <article className="metric-card accent">
          <span><Filter /> Filtros do catálogo</span>
          <strong>{filters.length}</strong>
          <small>{filters.filter((filter) => filter.active).length} visíveis para os clientes</small>
        </article>
        <article className="metric-card">
          <span><Tag /> Opções</span>
          <strong>{totalOptions}</strong>
          <small>{optionsWithProducts} vinculadas a produtos</small>
        </article>
        <article className="metric-card profit">
          <span><CheckCircle2 /> Em uso</span>
          <strong>{totalOptions ? Math.round((optionsWithProducts / totalOptions) * 100) : 0}%</strong>
          <small>das opções têm pelo menos 1 aparelho</small>
        </article>
        <article className={`metric-card ${optionsUnused > 0 ? "warning" : ""}`}>
          <span><Layers /> Sem produtos</span>
          <strong>{optionsUnused}</strong>
          <small>opções órfãs — candidatas à limpeza</small>
        </article>
      </section>

      {/* MASTER-DETAIL */}
      <div className="admin-data-card">
        <div className="admin-toolbar">
          <label className="toolbar-search">
            <Search />
            <input
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder='Busca global: digite uma opção (ex.: "256 GB", "Xiaomi") e a tela acha o filtro dela...'
            />
            {globalSearch && <button onClick={() => setGlobalSearch("")} className="checkbox-btn" aria-label="Limpar busca"><X size={14} /></button>}
          </label>
        </div>

        <div className="filter-master">
          {/* COLUNA ESQUERDA: LISTA DE FILTROS */}
          <aside className="filter-nav">
            {visibleFilters.map((filter) => {
              const index = filters.indexOf(filter);
              const unused = filter.options.filter((option) => option._count.productSelections === 0).length;
              return (
                <button
                  key={filter.id}
                  className={`filter-nav-item ${filter.id === selectedId ? "active" : ""} ${!filter.active ? "muted" : ""}`}
                  onClick={() => { setSelectedId(filter.id); setOptionSearch(""); }}
                >
                  <div className="filter-nav-info">
                    <strong>
                      {filter.name}
                      {!filter.active && <em> · oculto</em>}
                    </strong>
                    <small>
                      {filter.options.length} opção(ões)
                      {term && matchesByFilter.get(filter.id) ? ` · ${matchesByFilter.get(filter.id)} encontrada(s)` : ""}
                      {!term && unused > 0 ? ` · ${unused} órfã(s)` : ""}
                    </small>
                  </div>
                  <span className="filter-nav-arrows" onClick={(event) => event.stopPropagation()}>
                    <span role="button" tabIndex={0} aria-label="Mover para cima" className={index === 0 ? "disabled" : ""} onClick={() => index > 0 && void moveFilter(index, -1)}><ArrowUp size={13} /></span>
                    <span role="button" tabIndex={0} aria-label="Mover para baixo" className={index === filters.length - 1 ? "disabled" : ""} onClick={() => index < filters.length - 1 && void moveFilter(index, 1)}><ArrowDown size={13} /></span>
                  </span>
                </button>
              );
            })}
            {visibleFilters.length === 0 && <p className="empty-inline" style={{ padding: "1rem" }}>Nada encontrado.</p>}

            <div className="filter-nav-footer">
              {showNewGroup ? (
                <form onSubmit={createGroup} className="filter-new-form">
                  <input
                    value={newGroup}
                    onChange={(event) => setNewGroup(event.target.value)}
                    placeholder="Nome (ex.: Memória RAM)"
                    autoFocus
                    required
                    minLength={2}
                  />
                  <button disabled={busy || newGroup.trim().length < 2} className="button primary sm">Criar</button>
                  <button type="button" className="button ghost sm" onClick={() => setShowNewGroup(false)}><X size={13} /></button>
                </form>
              ) : (
                <button className="button ghost sm" style={{ width: "100%" }} onClick={() => setShowNewGroup(true)}>
                  <Plus size={14} /> Novo filtro
                </button>
              )}
            </div>
          </aside>

          {/* COLUNA DIREITA: DETALHE DO FILTRO */}
          <section className="filter-detail">
            {!selected && <p className="empty-inline" style={{ padding: "2rem" }}>Selecione um filtro à esquerda ou crie o primeiro.</p>}
            {selected && (
              <>
                <header className="filter-detail-head">
                  <div>
                    {editing?.id === selected.id ? (
                      <div className="inline-edit">
                        <input
                          value={editing.name}
                          onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveName(); } }}
                          autoFocus
                        />
                        <button onClick={() => void saveName()} className="button primary sm">Salvar</button>
                        <button className="button ghost sm" onClick={() => setEditing(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <h2><SlidersHorizontal size={16} /> {selected.name}</h2>
                        <small>{selected.options.length} opção(ões) · slug: {selected.slug}{selectedUnused ? ` · ${selectedUnused} sem produtos` : ""}</small>
                      </>
                    )}
                  </div>
                  <div className="filter-detail-actions">
                    <button className="button ghost sm" onClick={() => setEditing({ id: selected.id, name: selected.name })}><Pencil size={13} /> Renomear</button>
                    <button className="button ghost sm" onClick={() => void request(`/api/admin/filters/${selected.id}`, "PATCH", { active: !selected.active })}>
                      {selected.active ? <><EyeOff size={13} /> Ocultar da loja</> : <><Eye size={13} /> Mostrar na loja</>}
                    </button>
                    <button className="button danger sm" onClick={() => void removeFilter(selected)}><Trash2 size={13} /> Excluir</button>
                  </div>
                </header>

                {/* ADIÇÃO EM DESTAQUE */}
                <form className="filter-add-bar" onSubmit={(event) => void addOptions(event)}>
                  <input
                    value={optionDraft}
                    onChange={(event) => setOptionDraft(event.target.value)}
                    placeholder={`Adicionar opções em ${selected.name} — separe por vírgula (ex.: Motorola, Xiaomi, Realme)`}
                  />
                  <button disabled={busy || !optionDraft.trim()} className="button primary sm"><Plus size={14} /> Adicionar</button>
                </form>

                {/* TOOLBAR DO DETALHE */}
                <div className="filter-detail-toolbar">
                  <label className="toolbar-search">
                    <Search />
                    <input
                      value={optionSearch}
                      onChange={(event) => setOptionSearch(event.target.value)}
                      placeholder={`Filtrar as ${selected.options.length} opções...`}
                    />
                  </label>
                  <select className="pro-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
                    <option value="count">Mais produtos primeiro</option>
                    <option value="alpha">A → Z</option>
                    <option value="manual">Ordem de cadastro</option>
                  </select>
                  {selectedUnused > 0 && (
                    <button className="button ghost sm" onClick={() => void purgeUnusedOptions(selected)}>
                      <Trash2 size={13} /> Limpar {selectedUnused} órfã(s)
                    </button>
                  )}
                </div>

                {/* GRADE DE OPÇÕES */}
                <div className="option-grid">
                  {options.map((option) => (
                    <div key={option.id} className={`option-chip ${!option.active ? "muted" : ""} ${option._count.productSelections === 0 ? "orphan" : ""}`}>
                      {editingOption?.id === option.id ? (
                        <div className="inline-edit">
                          <input
                            value={editingOption.label}
                            onChange={(event) => setEditingOption({ ...editingOption, label: event.target.value })}
                            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveOptionLabel(); } }}
                            autoFocus
                          />
                          <button className="button primary sm" onClick={() => void saveOptionLabel()}>OK</button>
                          <button className="button ghost sm" onClick={() => setEditingOption(null)}><X size={13} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="option-chip-info">
                            <strong>{option.label}</strong>
                            <small>{option._count.productSelections} produto(s){!option.active ? " · oculta" : ""}</small>
                          </div>
                          <div className="option-chip-actions">
                            <button title="Renomear" onClick={() => setEditingOption({ id: option.id, label: option.label })}><Pencil size={13} /></button>
                            <button title={option.active ? "Ocultar da loja" : "Mostrar na loja"} onClick={() => void request(`/api/admin/filter-options/${option.id}`, "PATCH", { active: !option.active })}>
                              {option.active ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                            <button className="danger-text" title="Excluir" onClick={() => void removeOption(selected, option)}><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {options.length === 0 && <p className="empty-inline" style={{ padding: "1rem" }}>Nenhuma opção {optionSearch || term ? "encontrada com essa busca" : "cadastrada ainda — adicione acima"}.</p>}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

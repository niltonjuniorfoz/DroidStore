"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [searchByFilter, setSearchByFilter] = useState<Record<string, string>>({});
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [editingOption, setEditingOption] = useState<{ id: string; label: string } | null>(null);
  const [sortBy, setSortBy] = useState<Record<string, "count" | "alpha" | "manual">>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/filters", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setFilters(body);
    else setError(body.error ?? "Não foi possível carregar os filtros.");
  }

  useEffect(() => { void load(); }, []);

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
      setMessage("Novo filtro criado com sucesso.");
    }
  }

  async function addOption(event: FormEvent, filterId: string) {
    event.preventDefault();
    const rawInput = optionDrafts[filterId] ?? "";
    if (!rawInput.trim()) return;

    // Suporte para múltiplos nomes separados por vírgula
    const labels = rawInput.split(",").map((l) => l.trim()).filter((l) => l.length > 0);
    setBusy(true);

    let successCount = 0;
    for (const label of labels) {
      const ok = await fetch(`/api/admin/filters/${filterId}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (ok.ok) successCount++;
    }

    setOptionDrafts((current) => ({ ...current, [filterId]: "" }));
    setMessage(`${successCount} opção(ões) adicionada(s).`);
    await load();
    setBusy(false);
  }

  async function saveName() {
    if (!editing) return;
    if (await request(`/api/admin/filters/${editing.id}`, "PATCH", { name: editing.name })) {
      setEditing(null);
      setMessage("Nome do filtro atualizado.");
    }
  }

  async function saveOptionLabel() {
    if (!editingOption) return;
    if (await request(`/api/admin/filter-options/${editingOption.id}`, "PATCH", { label: editingOption.label })) {
      setEditingOption(null);
      setMessage("Nome da opção atualizado.");
    }
  }

  async function removeFilter(filter: CatalogFilter) {
    const linked = filter.options.reduce((total, option) => total + option._count.productSelections, 0);
    if (!confirm(`Excluir o filtro "${filter.name}"? ${linked ? `Ele está ligado a ${linked} produto(s) e essas ligações serão removidas.` : ""}`)) return;
    if (await request(`/api/admin/filters/${filter.id}`, "DELETE")) setMessage("Filtro excluído.");
  }

  async function removeOption(filter: CatalogFilter, option: FilterOption) {
    if (!confirm(`Excluir "${option.label}" de ${filter.name}? ${option._count.productSelections ? `A opção será removida de ${option._count.productSelections} produto(s).` : ""}`)) return;
    if (await request(`/api/admin/filter-options/${option.id}`, "DELETE")) setMessage("Opção excluída.");
  }

  async function purgeUnusedOptions(filter: CatalogFilter) {
    const unused = filter.options.filter((o) => o._count.productSelections === 0);
    if (unused.length === 0) {
      alert("Não há opções com 0 produtos neste filtro.");
      return;
    }
    if (!confirm(`Excluir todas as ${unused.length} opções sem produtos em "${filter.name}"?`)) return;

    setBusy(true);
    await Promise.all(unused.map((o) => fetch(`/api/admin/filter-options/${o.id}`, { method: "DELETE" })));
    setMessage(`${unused.length} opção(ões) sem produtos foram removidas.`);
    await load();
    setBusy(false);
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

  function getProcessedOptions(filter: CatalogFilter) {
    const sortMode = sortBy[filter.id] ?? "count";
    const term = (searchByFilter[filter.id] ?? "").toLowerCase().trim();

    let list = [...filter.options];

    // Busca interna por termo
    if (term) {
      list = list.filter((o) => o.label.toLowerCase().includes(term) || o.slug.toLowerCase().includes(term));
    }

    // Ordenação
    if (sortMode === "count") {
      list.sort((a, b) => b._count.productSelections - a._count.productSelections || a.label.localeCompare(b.label, "pt-BR"));
    } else if (sortMode === "alpha") {
      list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    }

    return list;
  }

  // MÉTRICAS KPI
  const totalOptions = filters.reduce((acc, f) => acc + f.options.length, 0);
  const optionsWithProducts = filters.reduce((acc, f) => acc + f.options.filter((o) => o._count.productSelections > 0).length, 0);
  const optionsUnused = totalOptions - optionsWithProducts;

  return (
    <div className="admin-easy">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Organização do Catálogo</span>
          <h1>Filtros e Categorias</h1>
          <p>Gerencie marcas, tipos de produto e especificações para a busca da sua loja.</p>
        </div>
      </div>

      {message && <div className="admin-message">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      {/* --- CARDS DE KPI DE FILTROS --- */}
      <section className="catalog-kpi-grid">
        <div className="kpi-card">
          <span><Filter size={16} /> Filtros Ativos</span>
          <strong>{filters.length}</strong>
          <small>Categorias e marcas criadas</small>
        </div>

        <div className="kpi-card">
          <span><Tag size={16} /> Total de Opções</span>
          <strong>{totalOptions}</strong>
          <small>{optionsWithProducts} vinculadas a produtos</small>
        </div>

        <div className="kpi-card profit">
          <span><CheckCircle2 size={16} /> Opções em Uso</span>
          <strong>{optionsWithProducts}</strong>
          <small>Com aparelhos no catálogo</small>
        </div>

        <div className="kpi-card warning">
          <span><Layers size={16} /> Opções sem Produtos</span>
          <strong>{optionsUnused}</strong>
          <small>Com 0 aparelhos associados</small>
        </div>
      </section>

      {/* CARD PARA CRIAR NOVO FILTRO */}
      <section className="filter-create-card">
        <div>
          <SlidersHorizontal />
          <span>
            <strong>Criar novo agrupamento/filtro</strong>
            <small>Exemplos: Marca, Tipo de produto, Armazenamento ou Processador.</small>
          </span>
        </div>
        <form onSubmit={createGroup}>
          <input
            value={newGroup}
            onChange={(event) => setNewGroup(event.target.value)}
            placeholder="Nome do filtro (ex: Memória RAM)"
            aria-label="Nome do novo filtro"
            required
          />
          <button disabled={busy || newGroup.trim().length < 2} className="button primary">
            <Plus /> Criar filtro
          </button>
        </form>
      </section>

      {/* GRADE DE BLOCOS DE FILTROS */}
      <section className="filter-admin-grid">
        {filters.map((filter, index) => {
          const processedOptions = getProcessedOptions(filter);
          const isExpanded = expandedFilters[filter.id] ?? false;
          const displayLimit = isExpanded ? processedOptions.length : 12;
          const visibleOptions = processedOptions.slice(0, displayLimit);
          const hasMore = processedOptions.length > 12;

          return (
            <article key={filter.id} className={!filter.active ? "filter-hidden" : ""}>
              <header>
                <div>
                  {editing?.id === filter.id ? (
                    <div className="inline-edit">
                      <input
                        value={editing.name}
                        onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                        autoFocus
                      />
                      <button onClick={() => void saveName()} className="button primary">Salvar</button>
                      <button onClick={() => setEditing(null)}><X size={15} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="filter-icon"><SlidersHorizontal /></span>
                      <div>
                        <h2>{filter.name}</h2>
                        <small>{filter.options.length} opção(ões) • slug: {filter.slug}</small>
                      </div>
                    </>
                  )}
                </div>

                <div className="filter-actions">
                  <button disabled={index === 0} title="Mover para cima" onClick={() => void moveFilter(index, -1)}>
                    <ArrowUp />
                  </button>
                  <button disabled={index === filters.length - 1} title="Mover para baixo" onClick={() => void moveFilter(index, 1)}>
                    <ArrowDown />
                  </button>
                  <button title="Renomear filtro" onClick={() => setEditing({ id: filter.id, name: filter.name })}>
                    <Pencil />
                  </button>
                  <button title={filter.active ? "Ocultar dos clientes" : "Mostrar aos clientes"} onClick={() => void request(`/api/admin/filters/${filter.id}`, "PATCH", { active: !filter.active })}>
                    {filter.active ? <Eye /> : <EyeOff />}
                  </button>
                  <button className="danger-text" title="Excluir filtro" onClick={() => void removeFilter(filter)}>
                    <Trash2 />
                  </button>
                </div>
              </header>

              {/* TOOLBAR INTERNA DO FILTRO: BUSCA + ORDENAÇÃO + LIMPEZA */}
              <div className="filter-card-toolbar">
                <div className="filter-card-search">
                  <Search size={14} />
                  <input
                    value={searchByFilter[filter.id] ?? ""}
                    onChange={(e) => setSearchByFilter({ ...searchByFilter, [filter.id]: e.target.value })}
                    placeholder={`Buscar em ${filter.name}...`}
                  />
                  {searchByFilter[filter.id] && (
                    <button onClick={() => setSearchByFilter({ ...searchByFilter, [filter.id]: "" })} className="clear-search">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="filter-sort-bar-inner">
                  <select
                    aria-label={`Ordenar opções de ${filter.name}`}
                    value={sortBy[filter.id] ?? "count"}
                    onChange={(event) => setSortBy((current) => ({ ...current, [filter.id]: event.target.value as any }))}
                  >
                    <option value="count">🔥 Mais produtos</option>
                    <option value="alpha">🔤 A → Z</option>
                    <option value="manual">↕️ Cadastro</option>
                  </select>

                  <button
                    className="purge-btn"
                    onClick={() => void purgeUnusedOptions(filter)}
                    title="Excluir todas as opções com 0 produtos neste grupo"
                  >
                    Limpar 0 prod.
                  </button>
                </div>
              </div>

              {/* LISTA DE OPÇÕES */}
              <div className="filter-options-list">
                {visibleOptions.map((option) => (
                  <div key={option.id} className={!option.active ? "option-hidden" : ""}>
                    {editingOption?.id === option.id ? (
                      <div className="inline-edit" style={{ width: "100%" }}>
                        <input
                          value={editingOption.label}
                          onChange={(event) => setEditingOption({ ...editingOption, label: event.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") void saveOptionLabel(); }}
                          autoFocus
                        />
                        <button onClick={() => void saveOptionLabel()}>Salvar</button>
                        <button onClick={() => setEditingOption(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option._count.productSelections} produto(s) associado(s)</small>
                        </span>
                        <div className="option-row-actions">
                          <button title="Editar nome da opção" onClick={() => setEditingOption({ id: option.id, label: option.label })}>
                            <Pencil size={14} />
                          </button>
                          <button title={option.active ? "Ocultar opção" : "Mostrar opção"} onClick={() => void request(`/api/admin/filter-options/${option.id}`, "PATCH", { active: !option.active })}>
                            {option.active ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button className="danger-text" title="Excluir opção" onClick={() => void removeOption(filter, option)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {visibleOptions.length === 0 && (
                  <p className="spec-empty">Nenhuma opção encontrada com estes termos.</p>
                )}
              </div>

              {/* BOTÃO RETRÁTIL "VER MAIS" */}
              {hasMore && (
                <div className="filter-expand-bar">
                  <button
                    onClick={() => setExpandedFilters({ ...expandedFilters, [filter.id]: !isExpanded })}
                    className="expand-btn"
                  >
                    {isExpanded ? (
                      <>Mostrar menos <ChevronUp size={14} /></>
                    ) : (
                      <>Ver todas as {processedOptions.length} opções (+{processedOptions.length - 12}) <ChevronDown size={14} /></>
                    )}
                  </button>
                </div>
              )}

              {/* FORMULÁRIO DE ADIÇÃO (SUPORTA SEPARAÇÃO POR VÍRGULA) */}
              <form className="add-filter-option" onSubmit={(event) => void addOption(event, filter.id)}>
                <input
                  value={optionDrafts[filter.id] ?? ""}
                  onChange={(event) => setOptionDrafts((current) => ({ ...current, [filter.id]: event.target.value }))}
                  placeholder="Adicionar (ex: Motorola, Xiaomi, Realme)"
                  aria-label={`Nova opção para ${filter.name}`}
                  required
                />
                <button disabled={busy || !(optionDrafts[filter.id] ?? "").trim()}>
                  <Plus size={14} /> Adicionar
                </button>
              </form>
            </article>
          );
        })}
      </section>
    </div>
  );
}

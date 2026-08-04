"use client";

import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  PackagePlus,
  RefreshCw,
  Search,
  Square,
  X,
} from "lucide-react";
import { useAdminFeedback } from "../../../src/components/admin/AdminFeedback";

type Variant = {
  id: string;
  storage: string | null;
  color: string | null;
  condition: string;
  price: string;
  costPrice?: string;
  stock: number;
  lowStockThreshold: number;
  updatedAt: string;
  product: { id: string; name: string; brand: string; active: boolean; imageUrl: string | null };
  stockMovements: Array<{ id: string; type: string; quantity: number; note: string | null; createdAt: string }>;
};

type Group = {
  key: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  active: boolean;
  variants: Variant[];
  totalStock: number;
  totalValue: number;
  totalCost: number;
  critical: number;
  stale: boolean;
};

const movementLabels: Record<string, string> = {
  ENTRY: "Entrada de Lote",
  ADJUSTMENT: "Ajuste Manual",
  SALE: "Venda na Loja",
  RETURN: "Devolução",
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function isStale(item: Variant) {
  return item.stock > 0 && !item.stockMovements.some((movement) => movement.type === "SALE");
}

export default function AdminEstoque() {
  const { toast } = useAdminFeedback();
  const [items, setItems] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Variant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "outOfStock" | "lowStock" | "inStock" | "stale">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [bulkAdjustmentModal, setBulkAdjustmentModal] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [bulkNote, setBulkNote] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<"value" | "stock" | "name" | "critical">("value");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível carregar o estoque.");
    else { setItems(body); setError(""); }
    setLoading(false);
  }

  useEffect(() => {
    void load().catch(() => { setError("Falha de conexão. Recarregue a página."); setLoading(false); });
  }, []);
  useEffect(() => { setPage(1); }, [search, stockStatusFilter, brandFilter, conditionFilter, pageSize, viewMode]);

  const brands = useMemo(
    () => Array.from(new Set(items.map((item) => item.product.brand).filter(Boolean))).sort(),
    [items],
  );
  const conditions = useMemo(
    () => Array.from(new Set(items.map((item) => item.condition))).sort(),
    [items],
  );

  // FILTRO (por variação)
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchesSearch = !term || `${item.product.name} ${item.product.brand} ${item.storage} ${item.color} ${item.condition}`.toLowerCase().includes(term);
      const matchesBrand = brandFilter === "all" || item.product.brand.toLowerCase() === brandFilter.toLowerCase();
      const matchesCondition = conditionFilter === "all" || item.condition === conditionFilter;
      const matchesStatus =
        stockStatusFilter === "all" ? true :
        stockStatusFilter === "outOfStock" ? item.stock === 0 :
        stockStatusFilter === "lowStock" ? item.stock > 0 && item.stock <= item.lowStockThreshold :
        stockStatusFilter === "inStock" ? item.stock > item.lowStockThreshold :
        stockStatusFilter === "stale" ? isStale(item) : true;
      return matchesSearch && matchesBrand && matchesCondition && matchesStatus;
    });
  }, [items, search, stockStatusFilter, brandFilter, conditionFilter]);

  // AGRUPAMENTO POR PRODUTO (achabilidade: procura o modelo, expande as variações)
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const item of filtered) {
      const key = item.product.id;
      const group = map.get(key) ?? {
        key,
        name: item.product.name,
        brand: item.product.brand,
        imageUrl: item.product.imageUrl,
        active: item.product.active,
        variants: [],
        totalStock: 0,
        totalValue: 0,
        totalCost: 0,
        critical: 0,
        stale: false,
      };
      group.variants.push(item);
      group.totalStock += item.stock;
      group.totalValue += Number(item.price ?? 0) * item.stock;
      group.totalCost += Number(item.costPrice ?? 0) * item.stock;
      if (item.stock <= item.lowStockThreshold) group.critical += 1;
      if (isStale(item)) group.stale = true;
      map.set(key, group);
    }
    const list = [...map.values()];
    for (const group of list) {
      group.variants.sort((a, b) => `${a.storage}${a.color}`.localeCompare(`${b.storage}${b.color}`, "pt-BR"));
    }
    list.sort((a, b) => {
      if (sortField === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sortField === "stock") return b.totalStock - a.totalStock;
      if (sortField === "critical") return b.critical - a.critical;
      return b.totalValue - a.totalValue; // "value": onde o capital está
    });
    return list;
  }, [filtered, sortField]);

  // Lista plana ordenada (modo alternativo)
  const flatSorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sortField === "name") return a.product.name.localeCompare(b.product.name, "pt-BR");
      if (sortField === "stock") return b.stock - a.stock;
      if (sortField === "critical") return (a.stock <= a.lowStockThreshold ? 0 : 1) - (b.stock <= b.lowStockThreshold ? 0 : 1);
      return Number(b.price) * b.stock - Number(a.price) * a.stock;
    });
    return list;
  }, [filtered, sortField]);

  // PAGINAÇÃO (sobre grupos no modo agrupado; sobre variações no plano)
  const totalPages = Math.ceil((viewMode === "grouped" ? groups.length : flatSorted.length) / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const pagedGroups = groups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pagedFlat = flatSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectGroup(group: Group) {
    const ids = group.variants.map((variant) => variant.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function submitBulkAdjustment(event: FormEvent) {
    event.preventDefault();
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");
    const responses = await Promise.all(
      Array.from(selectedIds).map((variantId) =>
        fetch("/api/admin/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity: bulkQuantity, type: bulkQuantity > 0 ? "ENTRY" : "ADJUSTMENT", note: bulkNote || "Ajuste em lote" }),
        }).catch(() => null),
      ),
    );
    const failed = responses.filter((response) => !response?.ok).length;
    setSelectedIds(new Set());
    setBulkAdjustmentModal(false);
    setBulkNote("");
    setBulkQuantity(1);
    await load();
    setSaving(false);
    if (failed) toast(`${failed} item(ns) não puderam ser ajustados (estoque insuficiente?).`, "error");
    else toast("Movimentação em lote registrada.", "success");
  }

  function open(item: Variant) {
    setSelected(item);
    setQuantity(1);
    setNote("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: selected.id, quantity, type: quantity > 0 ? "ENTRY" : "ADJUSTMENT", note }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível ajustar o estoque.");
    else { setSelected(null); await load(); toast("Movimentação registrada.", "success"); }
    setSaving(false);
  }

  // MÉTRICAS
  const totalUnits = items.reduce((total, item) => total + item.stock, 0);
  const outOfStockCount = items.filter((item) => item.stock === 0).length;
  const lowItemsCount = items.filter((item) => item.stock > 0 && item.stock <= item.lowStockThreshold).length;
  const staleCount = items.filter(isStale).length;
  const staleValue = items.filter(isStale).reduce((total, item) => total + Number(item.price ?? 0) * item.stock, 0);
  const totalInventoryCost = items.reduce((acc, item) => acc + Number(item.costPrice ?? 0) * item.stock, 0);
  const totalInventoryRetail = items.reduce((acc, item) => acc + Number(item.price ?? 0) * item.stock, 0);
  const hasCost = items.some((item) => item.costPrice !== undefined);

  const variantTags = (item: Variant) => [item.storage, item.color, item.condition.replaceAll("_", " ")].filter(Boolean) as string[];

  const renderVariantRow = (item: Variant, grouped: boolean) => {
    const low = item.stock > 0 && item.stock <= item.lowStockThreshold;
    const zero = item.stock === 0;
    const isSelected = selectedIds.has(item.id);
    const value = Number(item.price ?? 0) * item.stock;
    return (
      <tr key={item.id} className={`${grouped ? "stock-variant-row" : ""} ${isSelected ? "row-selected" : ""}`}>
        <td className="cell-chk">
          <button onClick={() => toggleSelectId(item.id)} className="checkbox-btn" aria-label="Selecionar variação">
            {isSelected ? <CheckSquare size={15} className="checked-icon" /> : <Square size={15} />}
          </button>
        </td>
        <td>
          <div className="stock-item-cell">
            {!grouped && (
              <span className="mini-thumb">
                {item.product.imageUrl ? <img src={item.product.imageUrl} alt="" loading="lazy" /> : <Boxes size={14} />}
              </span>
            )}
            <div>
              {!grouped && <strong className="stock-item-name">{item.product.name}</strong>}
              <div className="item-subtags">
                {variantTags(item).map((tag) => <span key={tag} className="tag-storage">{tag}</span>)}
                {isStale(item) && <span className="tag-stale">sem giro</span>}
                {!item.product.active && <span className="tag-stale">oculto</span>}
              </div>
            </div>
          </div>
        </td>
        <td>
          <span className={`pill-stock ${zero ? "zero" : low ? "low" : "ok"}`}>
            {zero ? "Esgotado" : `${item.stock} un.`}
          </span>
        </td>
        <td className="cell-muted">{item.lowStockThreshold}</td>
        {hasCost && <td className="cell-num">{item.costPrice !== undefined ? money(Number(item.costPrice)) : "—"}</td>}
        <td className="cell-num">{money(Number(item.price ?? 0))}</td>
        <td className="cell-num"><strong>{money(value)}</strong></td>
        <td className="cell-action">
          <button className="button ghost sm" onClick={() => open(item)} title="Entrada, baixa e histórico">
            <ArrowDownToLine size={13} /> Movimentar
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="admin-easy">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Inventário • {items.length} variações · {totalUnits} peças físicas</span>
          <h1>Estoque</h1>
          <p>Procure o modelo, expanda as variações, movimente. Entrada oficial de mercadoria com custo é pela tela de Compras.</p>
        </div>
        <div className="dash-quick-actions">
          <a href="/admin/compras" className="button primary sm"><PackagePlus size={15} /> Registrar lote (compra)</a>
          <button className="button ghost sm" onClick={() => void load()} title="Atualizar estoque"><RefreshCw size={15} /></button>
        </div>
      </div>

      {error && !selected && <div className="form-error">{error}</div>}

      {/* KPIs ENXUTOS */}
      <section className="metric-grid">
        <article className="metric-card accent">
          <span><Boxes /> Capital em estoque</span>
          <strong>{money(totalInventoryRetail)}</strong>
          <small>{hasCost ? `custo ${money(totalInventoryCost)} · margem potencial ${money(totalInventoryRetail - totalInventoryCost)}` : `${totalUnits} unidades físicas`}</small>
        </article>
        <article className={`metric-card ${outOfStockCount + lowItemsCount > 0 ? "warning" : ""}`}>
          <span><AlertTriangle /> Reposição crítica</span>
          <strong>{outOfStockCount + lowItemsCount}</strong>
          <small>{outOfStockCount} esgotadas · {lowItemsCount} no nível mínimo</small>
        </article>
        <article className={`metric-card ${staleCount > 0 ? "warning" : ""}`}>
          <span><History /> Sem giro</span>
          <strong>{staleCount}</strong>
          <small>{money(staleValue)} parados sem venda recente</small>
        </article>
        <article className="metric-card">
          <span><PackagePlus /> Peças físicas</span>
          <strong>{totalUnits} un.</strong>
          <small>em {groups.length || "—"} produto(s) no recorte atual</small>
        </article>
      </section>

      {/* TOOLBAR ÚNICA: BUSCA GRANDE + STATUS + REFINOS */}
      <div className="admin-data-card">
        <div className="admin-toolbar stock-toolbar">
          <label className="toolbar-search">
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar modelo, marca, capacidade (256GB), cor, condição..."
            />
          </label>
          <div className="pro-tabs">
            <button className={`pro-tab ${stockStatusFilter === "all" ? "active" : ""}`} onClick={() => setStockStatusFilter("all")}>Todos ({items.length})</button>
            <button className={`pro-tab ${stockStatusFilter === "outOfStock" ? "active" : ""}`} onClick={() => setStockStatusFilter("outOfStock")}>Esgotados ({outOfStockCount})</button>
            <button className={`pro-tab ${stockStatusFilter === "lowStock" ? "active" : ""}`} onClick={() => setStockStatusFilter("lowStock")}>Baixo ({lowItemsCount})</button>
            <button className={`pro-tab ${stockStatusFilter === "stale" ? "active" : ""}`} onClick={() => setStockStatusFilter("stale")}>Sem giro ({staleCount})</button>
            <button className={`pro-tab ${stockStatusFilter === "inStock" ? "active" : ""}`} onClick={() => setStockStatusFilter("inStock")}>OK ({items.length - outOfStockCount - lowItemsCount})</button>
          </div>
          <div className="pro-filters-bar">
            <select className="pro-select" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
              <option value="all">Todas as marcas</option>
              {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
            <select className="pro-select" value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
              <option value="all">Todas as condições</option>
              {conditions.map((condition) => <option key={condition} value={condition}>{condition.replaceAll("_", " ")}</option>)}
            </select>
            <select className="pro-select" value={sortField} onChange={(event) => setSortField(event.target.value as typeof sortField)}>
              <option value="value">Ordenar: maior capital</option>
              <option value="stock">Ordenar: mais estoque</option>
              <option value="critical">Ordenar: mais críticos</option>
              <option value="name">Ordenar: nome A-Z</option>
            </select>
            <div className="pro-tabs">
              <button className={`pro-tab ${viewMode === "grouped" ? "active" : ""}`} onClick={() => setViewMode("grouped")}>Agrupado</button>
              <button className={`pro-tab ${viewMode === "flat" ? "active" : ""}`} onClick={() => setViewMode("flat")}>Lista</button>
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="stock-table-wrap">
          <table>
            <thead>
              <tr>
                <th className="cell-chk" />
                <th>Produto / Variação</th>
                <th>Estoque</th>
                <th>Mín.</th>
                {hasCost && <th className="cell-num">Custo</th>}
                <th className="cell-num">Venda</th>
                <th className="cell-num">Valor em estoque</th>
                <th className="cell-action">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={hasCost ? 8 : 7}><div className="admin-loading">Carregando estoque...</div></td></tr>
              )}

              {!loading && viewMode === "grouped" && pagedGroups.map((group) => {
                const isOpen = expanded.has(group.key);
                const groupSelected = group.variants.every((variant) => selectedIds.has(variant.id));
                return (
                  <Fragment key={group.key}>
                    <tr className={`stock-group-row ${group.critical > 0 ? "has-critical" : ""}`} onClick={() => toggleGroup(group.key)}>
                      <td className="cell-chk" onClick={(event) => event.stopPropagation()}>
                        <button onClick={() => toggleSelectGroup(group)} className="checkbox-btn" aria-label="Selecionar produto inteiro">
                          {groupSelected ? <CheckSquare size={15} className="checked-icon" /> : <Square size={15} />}
                        </button>
                      </td>
                      <td>
                        <div className="stock-item-cell">
                          <ChevronDown size={15} className={`group-caret ${isOpen ? "open" : ""}`} />
                          <span className="mini-thumb">
                            {group.imageUrl ? <img src={group.imageUrl} alt="" loading="lazy" /> : <Boxes size={14} />}
                          </span>
                          <div>
                            <strong className="stock-item-name">{group.name}</strong>
                            <small className="cell-muted">{group.brand} · {group.variants.length} variação(ões){group.critical > 0 ? ` · ${group.critical} crítica(s)` : ""}{group.stale ? " · sem giro" : ""}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`pill-stock ${group.totalStock === 0 ? "zero" : group.critical > 0 ? "low" : "ok"}`}>
                          {group.totalStock === 0 ? "Esgotado" : `${group.totalStock} un.`}
                        </span>
                      </td>
                      <td className="cell-muted">—</td>
                      {hasCost && <td className="cell-num cell-muted">{group.totalCost ? money(group.totalCost) : "—"}</td>}
                      <td className="cell-num cell-muted">—</td>
                      <td className="cell-num"><strong>{money(group.totalValue)}</strong></td>
                      <td className="cell-action cell-muted">{isOpen ? "recolher" : "expandir"}</td>
                    </tr>
                    {isOpen && group.variants.map((item) => renderVariantRow(item, true))}
                  </Fragment>
                );
              })}

              {!loading && viewMode === "flat" && pagedFlat.map((item) => renderVariantRow(item, false))}

              {!loading && (viewMode === "grouped" ? pagedGroups.length === 0 : pagedFlat.length === 0) && (
                <tr><td colSpan={hasCost ? 8 : 7}><p className="empty-inline" style={{ padding: "1.2rem" }}>Nada encontrado com esses filtros. Limpe a busca ou troque a aba de status.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="admin-toolbar stock-pagination">
          <span className="cell-muted">
            {viewMode === "grouped"
              ? `${pagedGroups.length} de ${groups.length} produto(s) · ${filtered.length} variação(ões) no recorte`
              : `${pagedFlat.length} de ${flatSorted.length} variação(ões)`}
          </span>
          <div className="pro-filters-bar">
            {viewMode === "grouped" && (
              <button className="button ghost sm" onClick={() => setExpanded(expanded.size ? new Set() : new Set(pagedGroups.map((group) => group.key)))}>
                {expanded.size ? "Recolher tudo" : "Expandir página"}
              </button>
            )}
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

      {/* BARRA FLUTUANTE DE LOTE */}
      {selectedIds.size > 0 && (
        <div className="bulk-actions-floating-bar">
          <span className="bulk-count"><strong>{selectedIds.size}</strong> variação(ões) selecionada(s)</span>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={() => setBulkAdjustmentModal(true)}>
              <PackagePlus size={14} /> Entrada / Baixa em Lote
            </button>
            <button className="bulk-close" onClick={() => setSelectedIds(new Set())}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* MODAL DE MOVIMENTAÇÃO INDIVIDUAL */}
      {selected && (
        <div className="admin-modal">
          <form className="stock-modal" onSubmit={submit}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)}><X /></button>
            <span className="eyebrow">Movimentação de Estoque</span>
            <h2>{selected.product.name}</h2>
            <p>{[selected.storage, selected.color, selected.condition.replaceAll("_", " ")].filter(Boolean).join(" · ")} · Estoque atual: <strong>{selected.stock} un.</strong></p>

            <label>
              <span>Quantidade de ajuste</span>
              <input type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
              <small>Positivo dá entrada; negativo dá baixa. Compra de fornecedor com custo entra pela tela de Compras.</small>
            </label>

            <label>
              <span>Motivo da movimentação</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: correção de contagem, venda presencial, defeito..."
                required
                minLength={3}
              />
            </label>

            {error && <div className="form-error">{error}</div>}

            <div className="movement-history">
              <h3><History size={16} /> Histórico recente</h3>
              {selected.stockMovements.length ? (
                selected.stockMovements.map((movement) => (
                  <div key={movement.id}>
                    <span className={movement.quantity >= 0 ? "positive" : "negative"}>
                      {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                    </span>
                    <p>
                      <strong>{movementLabels[movement.type] ?? movement.type}</strong>
                      <small>{movement.note ?? "Sem observação"} • {new Date(movement.createdAt).toLocaleString("pt-BR")}</small>
                    </p>
                  </div>
                ))
              ) : (
                <p className="empty-inline">Nenhuma movimentação registrada.</p>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setSelected(null)}>Cancelar</button>
              <button disabled={saving || quantity === 0} className="button primary">
                {saving ? "Salvando..." : "Confirmar movimentação"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE AJUSTE EM LOTE */}
      {bulkAdjustmentModal && (
        <div className="admin-modal">
          <form className="stock-modal" onSubmit={submitBulkAdjustment}>
            <button type="button" className="modal-close" onClick={() => setBulkAdjustmentModal(false)}><X /></button>
            <span className="eyebrow">Operação em Lote</span>
            <h2>Movimentar {selectedIds.size} variações selecionadas</h2>

            <label>
              <span>Quantidade para aplicar a TODOS os selecionados</span>
              <input type="number" value={bulkQuantity} onChange={(event) => setBulkQuantity(Number(event.target.value))} required />
              <small>Ex.: 10 adiciona +10 unidades em cada um dos {selectedIds.size} itens.</small>
            </label>

            <label>
              <span>Observação / motivo</span>
              <textarea value={bulkNote} onChange={(event) => setBulkNote(event.target.value)} placeholder="Ex.: contagem geral de inventário" required />
            </label>

            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setBulkAdjustmentModal(false)}>Cancelar</button>
              <button disabled={saving || bulkQuantity === 0} className="button primary">
                {saving ? "Processando lote..." : `Aplicar em ${selectedIds.size} itens`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

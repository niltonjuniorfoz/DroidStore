"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpDown,
  Boxes,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  History,
  PackagePlus,
  RefreshCw,
  Search,
  Square,
  TrendingUp,
  X,
} from "lucide-react";

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

const movementLabels: Record<string, string> = {
  ENTRY: "Entrada de Lote",
  ADJUSTMENT: "Ajuste Manual",
  SALE: "Venda na Loja",
  RETURN: "Devolução",
};

export default function AdminEstoque() {
  const [items, setItems] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Variant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "outOfStock" | "lowStock" | "inStock">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // BULK ADJUSTMENT MODAL / STATE
  const [bulkAdjustmentModal, setBulkAdjustmentModal] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [bulkNote, setBulkNote] = useState("");

  // PAGINAÇÃO E ORDENAÇÃO
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<"name" | "stock" | "price" | "cost">("stock");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
  useEffect(() => { setPage(1); }, [search, stockStatusFilter, brandFilter, pageSize]);

  // BRANDS DÁ LOJA
  const brands = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.product.brand).filter(Boolean))).sort();
  }, [items]);

  // FILTRAGEM E ORDENAÇÃO
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchesSearch = !term || `${item.product.name} ${item.product.brand} ${item.storage} ${item.color}`.toLowerCase().includes(term);
      const matchesBrand = brandFilter === "all" || item.product.brand.toLowerCase() === brandFilter.toLowerCase();
      const matchesStatus =
        stockStatusFilter === "all" ? true :
        stockStatusFilter === "outOfStock" ? item.stock === 0 :
        stockStatusFilter === "lowStock" ? item.stock > 0 && item.stock <= item.lowStockThreshold :
        stockStatusFilter === "inStock" ? item.stock > item.lowStockThreshold : true;

      return matchesSearch && matchesBrand && matchesStatus;
    }).sort((a, b) => {
      const priceA = Number(a.price ?? 0);
      const priceB = Number(b.price ?? 0);
      const costA = Number(a.costPrice ?? 0);
      const costB = Number(b.costPrice ?? 0);

      let comp = 0;
      if (sortField === "name") comp = a.product.name.localeCompare(b.product.name, "pt-BR");
      else if (sortField === "stock") comp = a.stock - b.stock;
      else if (sortField === "price") comp = priceA - priceB;
      else if (sortField === "cost") comp = costA - costB;

      return sortDirection === "asc" ? comp : -comp;
    });
  }, [items, search, stockStatusFilter, brandFilter, sortField, sortDirection]);

  // PAGINAÇÃO
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // SELEÇÃO EM MASSA
  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(pageItems: Variant[]) {
    const pageIds = pageItems.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function submitBulkAdjustment(event: FormEvent) {
    event.preventDefault();
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");

    await Promise.all(
      Array.from(selectedIds).map((variantId) =>
        fetch("/api/admin/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity: bulkQuantity, type: bulkQuantity > 0 ? "ENTRY" : "ADJUSTMENT", note: bulkNote || "Ajuste em lote" }),
        })
      )
    );

    setSelectedIds(new Set());
    setBulkAdjustmentModal(false);
    setBulkNote("");
    setBulkQuantity(1);
    await load();
    setSaving(false);
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
    else { setSelected(null); await load(); }
    setSaving(false);
  }

  function handleSort(field: "name" | "stock" | "price" | "cost") {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // MÉTRICAS KPI
  const totalUnits = items.reduce((total, item) => total + item.stock, 0);
  const outOfStockCount = items.filter((item) => item.stock === 0).length;
  const lowItemsCount = items.filter((item) => item.stock > 0 && item.stock <= item.lowStockThreshold).length;
  const totalInventoryCost = items.reduce((acc, i) => acc + (Number(i.costPrice ?? 0) * i.stock), 0);
  const totalInventoryRetail = items.reduce((acc, i) => acc + (Number(i.price ?? 0) * i.stock), 0);
  const totalPotentialProfit = totalInventoryRetail - totalInventoryCost;

  return (
    <div className="admin-easy">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Gestão de Inventário • {items.length} variações registradas</span>
          <h1>Controle de Estoque Pro</h1>
          <p>Gerencie entradas de lote, reposição de aparelhos e histórico de movimentações.</p>
        </div>
        <button className="button ghost" onClick={() => void load()} title="Atualizar estoque">
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {error && !selected && <div className="form-error">{error}</div>}

      {/* --- CARDS DE KPI DE INVENTÁRIO --- */}
      <section className="catalog-kpi-grid">
        <div className="kpi-card">
          <span><PackagePlus size={16} /> Total de Peças Físicas</span>
          <strong>{totalUnits} un.</strong>
          <small>Unidades em estoque no momento</small>
        </div>

        <div className="kpi-card warning">
          <span><AlertTriangle size={16} /> Reposição Crítica</span>
          <strong>{outOfStockCount + lowItemsCount}</strong>
          <small>{outOfStockCount} zerados • {lowItemsCount} em nível mínimo</small>
        </div>

        <div className="kpi-card">
          <span><Boxes size={16} /> Capital em Custo</span>
          <strong>R$ {totalInventoryCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          <small>Preço de custo x quantidade</small>
        </div>

        <div className="kpi-card profit">
          <span><TrendingUp size={16} /> Lucro Potencial Físico</span>
          <strong>R$ {totalPotentialProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          <small>Soma do valor de venda esperada</small>
        </div>

        {(() => {
          // Capital parado: tem estoque, mas nenhuma venda nas últimas movimentações.
          const stale = items.filter((item) =>
            item.stock > 0 && !item.stockMovements.some((movement) => movement.type === "SALE"),
          );
          const staleValue = stale.reduce((total, item) => total + Number(item.price ?? 0) * item.stock, 0);
          return (
            <div className={`kpi-card ${stale.length ? "warning" : ""}`}>
              <span><Boxes size={16} /> Capital Sem Giro</span>
              <strong>{stale.length} variações</strong>
              <small>R$ {staleValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} parados sem venda recente</small>
            </div>
          );
        })()}
      </section>

      {/* --- TOOLBAR DE FILTROS DO ESTOQUE --- */}
      <div className="product-toolbar-pro">
        <div className="pro-tabs">
          <button className={`pro-tab ${stockStatusFilter === "all" ? "active" : ""}`} onClick={() => setStockStatusFilter("all")}>
            Todos ({items.length})
          </button>
          <button className={`pro-tab ${stockStatusFilter === "outOfStock" ? "active" : ""}`} onClick={() => setStockStatusFilter("outOfStock")}>
            <span className="stock-status-dot zero" /> Esgotados ({outOfStockCount})
          </button>
          <button className={`pro-tab ${stockStatusFilter === "lowStock" ? "active" : ""}`} onClick={() => setStockStatusFilter("lowStock")}>
            <span className="stock-status-dot low" /> Estoque Baixo ({lowItemsCount})
          </button>
          <button className={`pro-tab ${stockStatusFilter === "inStock" ? "active" : ""}`} onClick={() => setStockStatusFilter("inStock")}>
            <span className="stock-status-dot ok" /> Estoque OK ({items.length - outOfStockCount - lowItemsCount})
          </button>
        </div>

        <div className="pro-filters-bar">
          <select className="pro-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">Todas as marcas</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <label className="pro-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aparelho, marca, capacidade (ex: 256GB), cor..."
            />
          </label>
        </div>
      </div>

      {/* --- BARRA FLUTUANTE DE AJUSTE EM LOTE --- */}
      {selectedIds.size > 0 && (
        <div className="bulk-actions-floating-bar">
          <span className="bulk-count">
            <strong>{selectedIds.size}</strong> variação(ões) selecionada(s)
          </span>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={() => setBulkAdjustmentModal(true)}>
              <PackagePlus size={14} /> Entrada / Baixa em Lote
            </button>
            <button className="bulk-close" onClick={() => setSelectedIds(new Set())}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* --- TABELA DENSA DE ESTOQUE PRO --- */}
      <div className="pro-table-container table-mode-comfortable">
        <div className="pro-table-header inventory-table-cols">
          <div className="col-chk">
            <button onClick={() => toggleSelectAll(paginatedItems)} className="checkbox-btn">
              {paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.has(i.id)) ? (
                <CheckSquare size={16} className="checked-icon" />
              ) : (
                <Square size={16} />
              )}
            </button>
          </div>
          <div className="col-item sortable" onClick={() => handleSort("name")}>
            <span>Aparelho / Variação</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-storage">Capacidade & Cor</div>
          <div className="col-stock-qty sortable" onClick={() => handleSort("stock")}>
            <span>Disponível</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-threshold">Mínimo</div>
          <div className="col-prices sortable" onClick={() => handleSort("price")}>
            <span>Valores (Custo / Venda)</span>
            <ArrowUpDown size={12} />
          </div>
          <div className="col-last-mov">Última Movimentação</div>
          <div className="col-actions">Ação</div>
        </div>

        <div className="pro-table-body">
          {loading ? (
            <div className="admin-loading">Carregando estoque...</div>
          ) : (
            paginatedItems.map((item) => {
              const low = item.stock <= item.lowStockThreshold;
              const isSelected = selectedIds.has(item.id);
              const lastMovement = item.stockMovements[0];
              const cost = Number(item.costPrice ?? 0);
              const price = Number(item.price ?? 0);

              return (
                <div key={item.id} className={`pro-table-row inventory-table-cols ${!item.product.active ? "inactive-row" : ""} ${isSelected ? "row-selected" : ""}`}>
                  <div className="col-chk">
                    <button onClick={() => toggleSelectId(item.id)} className="checkbox-btn">
                      {isSelected ? <CheckSquare size={16} className="checked-icon" /> : <Square size={16} />}
                    </button>
                  </div>

                  {/* Aparelho */}
                  <div className="col-item">
                    <div className="mini-thumb">
                      {item.product.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} /> : <span>Sem foto</span>}
                    </div>
                    <div className="item-title-block">
                      <span className="item-name" title={item.product.name}>{item.product.name}</span>
                      <small className="tag-brand">{item.product.brand}{!item.product.active ? " (Oculto)" : ""}</small>
                    </div>
                  </div>

                  {/* Variação */}
                  <div className="col-storage">
                    <div className="item-subtags">
                      {item.storage && <span className="tag-storage">{item.storage}</span>}
                      {item.color && <span className="tag-storage">{item.color}</span>}
                      <span className="tag-condition">{item.condition.replaceAll("_", " ")}</span>
                    </div>
                  </div>

                  {/* Disponível */}
                  <div className="col-stock-qty">
                    <span className={`pill-stock ${item.stock === 0 ? "zero" : low ? "low" : "ok"}`}>
                      <span className={`stock-status-dot ${item.stock === 0 ? "zero" : low ? "low" : "ok"}`} />
                      {item.stock === 0 ? "Esgotado" : `${item.stock} un.`}
                    </span>
                  </div>

                  {/* Mínimo */}
                  <div className="col-threshold">
                    <small className="text-muted">{item.lowStockThreshold} un.</small>
                  </div>

                  {/* Valores */}
                  <div className="col-prices">
                    <strong className="text-sm">R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                    {cost > 0 && <small className="text-muted">Custo R$ {cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</small>}
                  </div>

                  {/* Última Movimentação */}
                  <div className="col-last-mov">
                    {lastMovement ? (
                      <div className="last-mov-cell">
                        <strong className={lastMovement.quantity >= 0 ? "positive" : "negative"}>
                          {movementLabels[lastMovement.type] ?? lastMovement.type} ({lastMovement.quantity > 0 ? "+" : ""}{lastMovement.quantity})
                        </strong>
                        <small>{new Date(lastMovement.createdAt).toLocaleDateString("pt-BR")} {new Date(lastMovement.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                      </div>
                    ) : (
                      <small className="text-muted">Sem registro</small>
                    )}
                  </div>

                  {/* Ação */}
                  <div className="col-actions">
                    <button className="button ghost sm" onClick={() => open(item)} title="Ajustar estoque">
                      <ArrowDownToLine size={14} /> Movimentar
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {!loading && paginatedItems.length === 0 && (
            <div className="empty-table-state">
              <p>Nenhum item de estoque encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- PAGINAÇÃO DE ALTA PERFORMANCE --- */}
      <div className="pro-pagination-bar">
        <div className="pagination-info">
          Exibindo <strong>{paginatedItems.length}</strong> de <strong>{filtered.length}</strong> variação(ões)
          (Total catálogo: {items.length})
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

      {/* --- MODAL DE MOVIMENTAÇÃO INDIVIDUAL --- */}
      {selected && (
        <div className="admin-modal">
          <form className="stock-modal" onSubmit={submit}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)}><X /></button>
            <span className="eyebrow">Movimentação de Estoque</span>
            <h2>{selected.product.name}</h2>
            <p>{selected.storage} • {selected.color} • Estoque atual: <strong>{selected.stock} un.</strong></p>

            <label>
              <span>Quantidade de ajuste</span>
              <input
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                required
              />
              <small>Use número positivo para dar entrada e negativo para saída/ajuste.</small>
            </label>

            <label>
              <span>Motivo da movimentação</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: recebimento do fornecedor, correção de contagem, venda presencial..."
                required
                minLength={3}
              />
            </label>

            {error && <div className="form-error">{error}</div>}

            <div className="movement-history">
              <h3><History size={16} /> Histórico recente de movimentações</h3>
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

      {/* --- MODAL DE AJUSTE EM LOTE --- */}
      {bulkAdjustmentModal && (
        <div className="admin-modal">
          <form className="stock-modal" onSubmit={submitBulkAdjustment}>
            <button type="button" className="modal-close" onClick={() => setBulkAdjustmentModal(false)}><X /></button>
            <span className="eyebrow">Operação em Lote</span>
            <h2>Movimentar {selectedIds.size} Variações Selecionadas</h2>

            <label>
              <span>Quantidade para aplicar a TODOS os selecionados</span>
              <input
                type="number"
                value={bulkQuantity}
                onChange={(event) => setBulkQuantity(Number(event.target.value))}
                required
              />
              <small>Exemplo: digite 10 para adicionar +10 unidades em cada um dos {selectedIds.size} itens selecionados.</small>
            </label>

            <label>
              <span>Observação / Motivo da remessa</span>
              <textarea
                value={bulkNote}
                onChange={(event) => setBulkNote(event.target.value)}
                placeholder="Ex.: Recebimento de Lote de Fornecedor #4821"
                required
              />
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

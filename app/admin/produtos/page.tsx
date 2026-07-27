"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Grid,
  ImagePlus,
  Layers,
  LayoutList,
  Link2,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

type AdminVariant = {
  id: string;
  price: string;
  costPrice?: string;
  stock: number;
  lowStockThreshold: number;
  storage?: string;
  color?: string;
  condition: string;
};

type Specification = { id?: string; label: string; value: string };
type ProductImage = { id?: string; url: string; position?: number };
type FilterOption = { id: string; label: string; active: boolean };
type CatalogFilter = { id: string; name: string; slug: string; active: boolean; options: FilterOption[] };
type AdminProduct = {
  id: string;
  name: string;
  brand: string;
  description?: string;
  active: boolean;
  featured: boolean;
  imageUrl?: string;
  images?: ProductImage[];
  specifications?: Specification[];
  filterSelections?: Array<{ option: { id: string; filterId: string; label: string; filter: { id: string; name: string; slug: string } } }>;
  variants: AdminVariant[];
};

const emptyImages = () => ["", "", "", ""];

export default function AdminProdutos() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(emptyImages);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [ownerView, setOwnerView] = useState(false);

  // --- RECURSOS PARA ESCALA (3.000+ PRODUTOS) ---
  const [viewMode, setViewMode] = useState<"compact" | "comfortable" | "grid">("compact");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "lowStock" | "outOfStock">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "price" | "stock" | "profit" | "brand">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function load() {
    const [response, filtersResponse] = await Promise.all([
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/filters", { cache: "no-store" }),
    ]);
    if (response.ok) {
      const products: AdminProduct[] = await response.json();
      setItems(products);
      setOwnerView(response.headers.get("X-Owner-View") === "true");
    }
    if (filtersResponse.ok) setFilters(await filtersResponse.json());
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { setSearch(searchParams.get("q") ?? ""); }, [searchParams]);
  useEffect(() => { setPage(1); }, [search, statusFilter, stockFilter, brandFilter, conditionFilter, pageSize]);

  function newProduct() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setImageUrls(emptyImages());
    setSpecifications([]);
    setSelectedFilters({});
    setMessage("");
    setOpen(true);
  }

  function editProduct(item: AdminProduct) {
    const savedImages = item.images?.map((image) => image.url) ?? [];
    const initialImages = savedImages.length ? savedImages : item.imageUrl ? [item.imageUrl] : [];
    setEditing(item);
    setTitle(item.name);
    setDescription(item.description ?? "");
    setImageUrls([...initialImages, "", "", "", ""].slice(0, 4));
    setSpecifications(item.specifications?.map(({ label, value }) => ({ label, value })) ?? []);
    setSelectedFilters(Object.fromEntries(
      (item.filterSelections ?? []).map((selection) => [selection.option.filterId, selection.option.id]),
    ));
    setMessage("");
    setOpen(true);
  }

  function updateImage(index: number, value: string) {
    setImageUrls((current) => current.map((url, position) => position === index ? value : url));
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const result = await response.json();
    if (response.ok) {
      setImageUrls((current) => {
        const next = [...current];
        const position = next.findIndex((url) => !url);
        next[position < 0 ? 0 : position] = result.url;
        return next;
      });
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function generateWithAI() {
    if (title.trim().length < 5) {
      setMessage("Digite o título completo do produto antes de usar a IA.");
      return;
    }
    setAiBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/ai-product", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const result = await response.json();
    if (response.ok) {
      setDescription(result.description);
      setSpecifications(result.specifications);
      setMessage(result.researchUsed
        ? "Ficha técnica pesquisada e preenchida. Revise antes de salvar."
        : "Ficha preenchida sem pesquisa externa. Revise os campos antes de salvar.");
    } else {
      setMessage(result.error);
    }
    setAiBusy(false);
  }

  function updateSpecification(index: number, key: "label" | "value", value: string) {
    setSpecifications((current) => current.map((item, position) =>
      position === index ? { ...item, [key]: value } : item
    ));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(data.entries());
    const selectedBrandGroup = filters.find((filter) => filter.slug === "marca");
    const selectedBrandOption = selectedBrandGroup?.options.find((option) => option.id === selectedFilters[selectedBrandGroup.id]);
    const payload = {
      ...values,
      brand: selectedBrandOption?.label ?? editing?.brand ?? "Sem marca",
      description,
      imageUrls: imageUrls.map((url) => url.trim()).filter(Boolean),
      specifications: specifications
        .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
        .filter((item) => item.label && item.value),
      price: Number(values.price),
      ...(ownerView ? { costPrice: Number(values.costPrice) } : {}),
      stock: Number(values.stock),
      lowStockThreshold: Number(values.lowStockThreshold),
      filterOptionIds: Object.values(selectedFilters).filter(Boolean),
      featured: data.get("featured") === "on",
      ...(editing ? { active: editing.active } : { active: true }),
    };
    const response = await fetch(editing ? `/api/admin/products/${editing.id}` : "/api/admin/products", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (response.ok) {
      setOpen(false);
      setEditing(null);
      setMessage(editing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
      await load();
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function removeProduct(item: AdminProduct) {
    if (!confirm(`Tem certeza que deseja excluir "${item.name}"? Esta ação não pode ser desfeita.`)) return;
    const response = await fetch(`/api/admin/products/${item.id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Produto excluído com sucesso.");
      await load();
    } else {
      setMessage("Não foi possível excluir o produto.");
    }
  }

  async function toggle(item: AdminProduct, key: "active" | "featured") {
    await fetch(`/api/admin/products/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: !item[key] }),
    });
    await load();
  }

  // --- SELEÇÃO EM MASSA (BULK ACTIONS) ---
  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(pageProducts: AdminProduct[]) {
    const pageIds = pageProducts.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function bulkToggleActive(active: boolean) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active }),
        })
      )
    );
    setSelectedIds(new Set());
    setMessage(`${selectedIds.size} produto(s) ${active ? "visível(is)" : "ocultado(s)"}.`);
    await load();
    setBusy(false);
  }

  async function bulkToggleFeatured(featured: boolean) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ featured }),
        })
      )
    );
    setSelectedIds(new Set());
    setMessage(`${selectedIds.size} produto(s) ${featured ? "adicionado(s) à capa" : "removido(s) da capa"}.`);
    await load();
    setBusy(false);
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir os ${selectedIds.size} produto(s) selecionados? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    await Promise.all(
      Array.from(selectedIds).map((id) => fetch(`/api/admin/products/${id}`, { method: "DELETE" }))
    );
    setSelectedIds(new Set());
    setMessage(`${selectedIds.size} produto(s) excluído(s).`);
    await load();
    setBusy(false);
  }

  function handleSort(field: "name" | "price" | "stock" | "profit" | "brand") {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // --- CÁLCULOS E FILTRAGEM ---
  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean))).sort();

  const filteredItems = items.filter((item) => {
    const variant = item.variants[0];
    const query = `${item.name} ${item.brand} ${variant?.storage ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || query.includes(search.toLowerCase().trim());
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? item.active :
      statusFilter === "inactive" ? !item.active :
      statusFilter === "featured" ? item.featured : true;
    const matchesBrand = brandFilter === "all" || item.brand.toLowerCase() === brandFilter.toLowerCase();
    const stock = variant?.stock ?? 0;
    const matchesStock =
      stockFilter === "all" ? true :
      stockFilter === "inStock" ? stock > (variant?.lowStockThreshold ?? 5) :
      stockFilter === "lowStock" ? stock > 0 && stock <= (variant?.lowStockThreshold ?? 5) :
      stockFilter === "outOfStock" ? stock === 0 : true;
    const condition = (variant?.condition ?? "").toUpperCase();
    const matchesCondition = conditionFilter === "all" || condition === conditionFilter;
    return matchesSearch && matchesStatus && matchesBrand && matchesStock && matchesCondition;
  }).sort((a, b) => {
    const varA = a.variants[0];
    const varB = b.variants[0];
    const priceA = Number(varA?.price ?? 0);
    const priceB = Number(varB?.price ?? 0);
    const stockA = varA?.stock ?? 0;
    const stockB = varB?.stock ?? 0;
    const profitA = varA?.costPrice !== undefined ? priceA - Number(varA.costPrice) : 0;
    const profitB = varB?.costPrice !== undefined ? priceB - Number(varB.costPrice) : 0;

    let comp = 0;
    if (sortField === "name") comp = a.name.localeCompare(b.name, "pt-BR");
    else if (sortField === "brand") comp = a.brand.localeCompare(b.brand, "pt-BR");
    else if (sortField === "price") comp = priceA - priceB;
    else if (sortField === "stock") comp = stockA - stockB;
    else if (sortField === "profit") comp = profitA - profitB;

    return sortDirection === "asc" ? comp : -comp;
  });

  // PAGINAÇÃO
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // MÉTRICAS KPI
  const activeCount = items.filter((i) => i.active).length;
  const outOfStockCount = items.filter((i) => (i.variants[0]?.stock ?? 0) === 0).length;
  const totalStockValue = items.reduce((acc, i) => acc + (Number(i.variants[0]?.price ?? 0) * (i.variants[0]?.stock ?? 0)), 0);
  const totalProfitValue = items.reduce((acc, i) => {
    const p = Number(i.variants[0]?.price ?? 0);
    const c = Number(i.variants[0]?.costPrice ?? 0);
    const s = i.variants[0]?.stock ?? 0;
    return acc + ((p - c) * s);
  }, 0);

  return (
    <div className="admin-easy">
      <header className="admin-title">
        <div>
          <span className="eyebrow">Catálogo Pro • {items.length} produto(s) cadastrado(s)</span>
          <h1>Gerenciador de Produtos</h1>
          <p>Painel de alta capacidade para catálogo em escala (suporta 3.000+ aparelhos).</p>
        </div>
        <button className="button primary" onClick={newProduct}><Plus /> Novo produto</button>
      </header>

      {message && <p className="admin-message" role="status">{message}</p>}

      {/* --- CARDS KPI EXECUTIVOS --- */}
      <section className="catalog-kpi-grid">
        <div className="kpi-card">
          <span><Package size={16} /> Total em Catálogo</span>
          <strong>{items.length}</strong>
          <small>{activeCount} visíveis na loja</small>
        </div>
        <div className="kpi-card warning">
          <span><Package size={16} /> Sem Estoque</span>
          <strong>{outOfStockCount}</strong>
          <small>Aparelhos esgotados</small>
        </div>
        <div className="kpi-card">
          <span><Layers size={16} /> Valor em Estoque</span>
          <strong>R$ {totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          <small>Soma dos preços de venda</small>
        </div>
        {ownerView && (
          <div className="kpi-card profit">
            <span><TrendingUp size={16} /> Lucro Potencial</span>
            <strong>R$ {totalProfitValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            <small>Com base no preço de custo</small>
          </div>
        )}
      </section>

      {/* --- TOOLBAR AVANÇADA COM ABAS, FILTROS E MODO DE EXIBIÇÃO --- */}
      <div className="product-toolbar-pro">
        <div className="pro-tabs">
          <button className={`pro-tab ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
            Todos ({items.length})
          </button>
          <button className={`pro-tab ${statusFilter === "active" ? "active" : ""}`} onClick={() => setStatusFilter("active")}>
            Visíveis ({activeCount})
          </button>
          <button className={`pro-tab ${statusFilter === "inactive" ? "active" : ""}`} onClick={() => setStatusFilter("inactive")}>
            Ocultos ({items.length - activeCount})
          </button>
          <button className={`pro-tab ${statusFilter === "featured" ? "active" : ""}`} onClick={() => setStatusFilter("featured")}>
            ⭐ Capa ({items.filter((i) => i.featured).length})
          </button>
        </div>

        <div className="pro-filters-bar">
          <select className="pro-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">Todas as marcas</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <select className="pro-select" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)}>
            <option value="all">Todos os estoques</option>
            <option value="inStock">Em estoque (&gt;5)</option>
            <option value="lowStock">Estoque baixo (1 a 5)</option>
            <option value="outOfStock">Sem estoque (0)</option>
          </select>

          <select className="pro-select" value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
            <option value="all">Todas as condições</option>
            <option value="NOVO">Novo</option>
            <option value="SEMINOVO">Seminovo</option>
            <option value="EXCELENTE">Excelente</option>
            <option value="MUITO_BOM">Muito bom</option>
            <option value="OUTLET">Outlet</option>
          </select>

          <label className="pro-search">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, marca, SKU..." />
          </label>

          <div className="view-mode-toggle">
            <button className={`mode-btn ${viewMode === "compact" ? "active" : ""}`} title="Modo Tabela Densa (Recomendado para 3.000 itens)" onClick={() => setViewMode("compact")}>
              <LayoutList size={16} />
            </button>
            <button className={`mode-btn ${viewMode === "comfortable" ? "active" : ""}`} title="Modo Tabela Confortável" onClick={() => setViewMode("comfortable")}>
              <SlidersHorizontal size={16} />
            </button>
            <button className={`mode-btn ${viewMode === "grid" ? "active" : ""}`} title="Modo Grade com Cards" onClick={() => setViewMode("grid")}>
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- BARRA FLUTUANTE DE AÇÕES EM MASSA (BULK ACTIONS) --- */}
      {selectedIds.size > 0 && (
        <div className="bulk-actions-floating-bar">
          <span className="bulk-count">
            <strong>{selectedIds.size}</strong> produto(s) selecionado(s)
          </span>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={() => void bulkToggleActive(true)}>
              <Eye size={14} /> Tornar Visíveis
            </button>
            <button className="bulk-btn" onClick={() => void bulkToggleActive(false)}>
              <EyeOff size={14} /> Ocultar
            </button>
            <button className="bulk-btn" onClick={() => void bulkToggleFeatured(true)}>
              <Star size={14} /> Adicionar à Capa
            </button>
            <button className="bulk-btn danger" onClick={() => void bulkDelete()}>
              <Trash2 size={14} /> Excluir Selecionados
            </button>
            <button className="bulk-close" onClick={() => setSelectedIds(new Set())}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* --- TABELA DENSA DE ALTA CAPACIDADE --- */}
      {viewMode !== "grid" && (
        <div className={`pro-table-container ${viewMode === "compact" ? "table-mode-compact" : "table-mode-comfortable"}`}>
          <div className="pro-table-header">
            <div className="col-chk">
              <button onClick={() => toggleSelectAll(paginatedItems)} className="checkbox-btn">
                {paginatedItems.length > 0 && paginatedItems.every((p) => selectedIds.has(p.id)) ? (
                  <CheckSquare size={16} className="checked-icon" />
                ) : (
                  <Square size={16} />
                )}
              </button>
            </div>
            <div className="col-item sortable" onClick={() => handleSort("name")}>
              <span>Produto / Aparelho</span>
              <ArrowUpDown size={12} />
            </div>
            <div className="col-brand sortable" onClick={() => handleSort("brand")}>
              <span>Marca</span>
              <ArrowUpDown size={12} />
            </div>
            <div className="col-price sortable" onClick={() => handleSort("price")}>
              <span>Preço de Venda</span>
              <ArrowUpDown size={12} />
            </div>
            {ownerView && (
              <div className="col-profit sortable" onClick={() => handleSort("profit")}>
                <span>Custo / Lucro</span>
                <ArrowUpDown size={12} />
              </div>
            )}
            <div className="col-stock sortable" onClick={() => handleSort("stock")}>
              <span>Estoque</span>
              <ArrowUpDown size={12} />
            </div>
            <div className="col-status">Status</div>
            <div className="col-actions">Ações</div>
          </div>

          <div className="pro-table-body">
            {paginatedItems.map((item) => {
              const variant = item.variants[0];
              const image = item.images?.[0]?.url ?? item.imageUrl;
              const price = Number(variant?.price ?? 0);
              const costPrice = variant?.costPrice !== undefined ? Number(variant.costPrice) : undefined;
              const profit = costPrice !== undefined ? price - costPrice : undefined;
              const stock = variant?.stock ?? 0;
              const isSelected = selectedIds.has(item.id);

              return (
                <div key={item.id} className={`pro-table-row ${!item.active ? "inactive-row" : ""} ${isSelected ? "row-selected" : ""}`}>
                  <div className="col-chk">
                    <button onClick={() => toggleSelectId(item.id)} className="checkbox-btn">
                      {isSelected ? <CheckSquare size={16} className="checked-icon" /> : <Square size={16} />}
                    </button>
                  </div>

                  <div className="col-item">
                    <div className="mini-thumb">
                      {image ? <img src={image} alt={item.name} /> : <span>Sem foto</span>}
                    </div>
                    <div className="item-title-block">
                      <span className="item-name" title={item.name}>{item.name}</span>
                      <div className="item-subtags">
                        {variant?.storage && <span className="tag-storage">{variant.storage}</span>}
                        {variant?.condition && <span className="tag-condition">{variant.condition.replace("_", " ")}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="col-brand">
                    <span className="tag-brand">{item.brand}</span>
                  </div>

                  <div className="col-price">
                    <strong>R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </div>

                  {ownerView && (
                    <div className="col-profit">
                      {costPrice !== undefined && profit !== undefined ? (
                        <>
                          <small>Custo R$ {costPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</small>
                          <span className="profit-green">Lucro R$ {profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </>
                      ) : (
                        <small>-</small>
                      )}
                    </div>
                  )}

                  <div className="col-stock">
                    <span className={`pill-stock ${stock === 0 ? "zero" : stock <= (variant?.lowStockThreshold ?? 5) ? "low" : "ok"}`}>
                      {stock === 0 ? "Esgotado" : `${stock} un.`}
                    </span>
                  </div>

                  <div className="col-status">
                    <button
                      className={`btn-pill-toggle ${item.active ? "on" : "off"}`}
                      onClick={() => void toggle(item, "active")}
                      title={item.active ? "Ocultar da loja" : "Mostrar na loja"}
                    >
                      {item.active ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{item.active ? "Visível" : "Oculto"}</span>
                    </button>

                    <button
                      className={`btn-pill-star ${item.featured ? "on" : ""}`}
                      onClick={() => void toggle(item, "featured")}
                      title={item.featured ? "Na capa" : "Colocar na capa"}
                    >
                      <Star size={13} fill={item.featured ? "#FF7900" : "none"} />
                    </button>
                  </div>

                  <div className="col-actions">
                    <button className="row-action-btn edit" onClick={() => editProduct(item)} title="Editar produto">
                      <Pencil size={14} />
                    </button>
                    <button className="row-action-btn delete" onClick={() => void removeProduct(item)} title="Excluir produto">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {paginatedItems.length === 0 && (
              <div className="empty-table-state">
                <p>Nenhum produto encontrado com os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODO GRADE COM CARDS VISUAIS --- */}
      {viewMode === "grid" && (
        <div className="pro-product-grid">
          {paginatedItems.map((item) => {
            const variant = item.variants[0];
            const image = item.images?.[0]?.url ?? item.imageUrl;
            const price = Number(variant?.price ?? 0);
            const isSelected = selectedIds.has(item.id);

            return (
              <div key={item.id} className={`grid-product-card ${!item.active ? "inactive" : ""} ${isSelected ? "selected" : ""}`}>
                <div className="card-top">
                  <button onClick={() => toggleSelectId(item.id)} className="checkbox-btn">
                    {isSelected ? <CheckSquare size={16} className="checked-icon" /> : <Square size={16} />}
                  </button>

                  <div className="card-thumb">
                    {image ? <img src={image} alt={item.name} /> : <span>Sem foto</span>}
                  </div>

                  <div className="card-actions-float">
                    <button className={`btn-pill-star ${item.featured ? "on" : ""}`} onClick={() => void toggle(item, "featured")}>
                      <Star size={14} fill={item.featured ? "#FF7900" : "none"} />
                    </button>
                    <button className="row-action-btn edit" onClick={() => editProduct(item)}>
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                <div className="card-details">
                  <div className="card-tags">
                    <span className="tag-brand">{item.brand}</span>
                    {variant?.storage && <span className="tag-storage">{variant.storage}</span>}
                  </div>
                  <h3 className="card-title" title={item.name}>{item.name}</h3>
                  <strong className="card-price">R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>

                  <div className="card-bottom">
                    <span className={`pill-stock ${variant?.stock === 0 ? "zero" : (variant?.stock ?? 0) <= 5 ? "low" : "ok"}`}>
                      {variant?.stock === 0 ? "Esgotado" : `${variant?.stock} un.`}
                    </span>
                    <button className={`btn-pill-toggle ${item.active ? "on" : "off"}`} onClick={() => void toggle(item, "active")}>
                      {item.active ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{item.active ? "Visível" : "Oculto"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- CONTROLE DE PAGINAÇÃO DE ALTA PERFORMANCE --- */}
      <div className="pro-pagination-bar">
        <div className="pagination-info">
          Exibindo <strong>{paginatedItems.length}</strong> de <strong>{filteredItems.length}</strong> produto(s)
          (Total catálogo: {items.length})
        </div>

        <div className="pagination-controls">
          <label className="page-size-selector">
            Exibir por página:
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
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

      {/* --- MODAL DE CADASTRO / EDIÇÃO --- */}
      {open && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={editing ? "Editar produto" : "Novo produto"}>
          <form key={editing?.id ?? "new"} onSubmit={save}>
            <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button>
            <span className="eyebrow">{editing ? "Editar aparelho" : "Novo aparelho"}</span>
            <h2>{editing ? editing.name : "Cadastrar produto"}</h2>

            <div className="admin-form-grid">
              <label className="wide">
                Título completo do produto
                <input required name="name" value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>

              <div className="ai-helper wide">
                <div><Sparkles /><span><strong>Pesquisa e preenchimento com IA</strong><small>A IA pesquisa o modelo e cria uma ficha técnica completa para sua revisão.</small></span></div>
                <button type="button" onClick={generateWithAI} disabled={aiBusy}>{aiBusy ? "Gerando..." : "Gerar com IA"}</button>
              </div>

              <section className="product-filter-assignment wide">
                <header><div><h3>Filtros e categorias</h3><p>Associe o produto às opções que serão usadas na busca da loja.</p></div><SlidersHorizontal /></header>
                <div>{filters.map((filter) => <label key={filter.id}>{filter.name}{!filter.active && <small>Filtro oculto dos clientes</small>}<select value={selectedFilters[filter.id] ?? ""} onChange={(event) => setSelectedFilters((current) => ({ ...current, [filter.id]: event.target.value }))}>
                  <option value="">Não definido</option>
                  {filter.options.map((option) => <option key={option.id} value={option.id}>{option.label}{!option.active ? " (oculto)" : ""}</option>)}
                </select></label>)}</div>
              </section>
              <label>Armazenamento<input required name="storage" defaultValue={editing?.variants[0]?.storage} /></label>
              <label>Cor<input required name="color" defaultValue={editing?.variants[0]?.color} /></label>
              <label>
                Condição
                <select name="condition" defaultValue={editing?.variants[0]?.condition ?? "NOVO"}>
                  <option value="NOVO">Novo</option>
                  <option value="NOVO_REEMBALADO">Novo reembalado</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="MUITO_BOM">Muito bom</option>
                  <option value="BOM">Bom</option>
                  <option value="OUTLET">Outlet</option>
                </select>
              </label>
              <label>Preço<input required name="price" type="number" min="1" step=".01" defaultValue={editing ? Number(editing.variants[0]?.price) : undefined} /></label>
              {ownerView && <label className="owner-field">Preço de custo (somente administrador)<input required name="costPrice" type="number" min="0" step=".01" defaultValue={editing ? Number(editing.variants[0]?.costPrice ?? 0) : 0} /></label>}
              <label>Estoque<input required name="stock" type="number" min="0" step="1" defaultValue={editing?.variants[0]?.stock} /></label>
              <label>Alerta de estoque mínimo<input required name="lowStockThreshold" type="number" min="0" step="1" defaultValue={editing?.variants[0]?.lowStockThreshold ?? 5} /></label>

              <label className="wide">
                Descrição
                <textarea required name="description" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>

              <section className="product-images-editor wide">
                <header><div><h3>Fotos do produto</h3><p>Cole até quatro links. A prévia aparece automaticamente.</p></div><Link2 /></header>
                <div className="image-url-grid">
                  {imageUrls.map((url, index) => <label key={index}>
                    <span>Foto {index + 1}</span>
                    <input type="url" value={url} onChange={(event) => updateImage(index, event.target.value)} />
                    <div className="image-link-preview">
                      {url ? <img src={url} alt={`Prévia da foto ${index + 1}`} /> : <ImagePlus />}
                    </div>
                  </label>)}
                </div>
                <label className="upload-box">
                  <ImagePlus /> {busy ? "Enviando..." : "Ou envie uma foto do computador"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
                </label>
              </section>

              <section className="spec-editor wide">
                <header>
                  <div><h3>Especificações</h3><p>Edite o que a IA criou ou adicione informações manualmente.</p></div>
                  <button type="button" onClick={() => setSpecifications((current) => [...current, { label: "", value: "" }])}><Plus /> Adicionar</button>
                </header>
                {specifications.length === 0 && <p className="spec-empty">Use “Gerar com IA” ou adicione uma especificação.</p>}
                {specifications.map((item, index) => <div className="spec-edit-row" key={index}>
                  <input aria-label={`Nome da especificação ${index + 1}`} value={item.label} onChange={(event) => updateSpecification(index, "label", event.target.value)} />
                  <input aria-label={`Valor da especificação ${index + 1}`} value={item.value} onChange={(event) => updateSpecification(index, "value", event.target.value)} />
                  <button type="button" aria-label="Remover especificação" onClick={() => setSpecifications((current) => current.filter((_, position) => position !== index))}><Trash2 /></button>
                </div>)}
              </section>

              <label className="check-row wide">
                <input name="featured" type="checkbox" defaultChecked={editing?.featured} /> Mostrar na primeira página
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="button primary" disabled={busy}>{busy ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

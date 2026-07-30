"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  Barcode,
  Battery,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  DollarSign,
  Eye,
  EyeOff,
  FolderTree,
  Grid,
  ImagePlus,
  Layers,
  LayoutList,
  Link2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

type DeviceUnit = {
  id: string;
  variantId: string;
  imei1?: string;
  imei2?: string;
  serialNumber?: string;
  batteryHealth?: number;
  repairedParts?: string;
  warehouseLocation?: string;
  costPrice?: string;
  notes?: string;
  status: "IN_STOCK" | "RESERVED" | "SOLD" | "IN_MAINTENANCE" | "RETURNED";
  createdAt: string;
};

type AdminVariant = {
  id: string;
  price: string;
  costPrice?: string;
  stock: number;
  lowStockThreshold: number;
  storage?: string;
  color?: string;
  condition: string;
  sku?: string;
  barcode?: string;
  deviceUnits?: DeviceUnit[];
};

type Specification = { id?: string; label: string; value: string };
type ProductImage = { id?: string; url: string; color?: string; position?: number };
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

type GroupedModel = {
  modelKey: string;
  modelName: string;
  brand: string;
  items: AdminProduct[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  colors: string[];
  storages: string[];
  conditions: string[];
};

const emptyImages = () => ["", "", "", ""];

function getBaseModelName(name: string) {
  return name.replace(/\s*-\s*\d+\s*(GB|TB).*/i, "").replace(/\s*-\s*(Seminovo|Novo|Excelente|Muito Bom|Outlet|Reembalado).*/i, "").trim();
}

function getColorHex(colorName?: string) {
  if (!colorName) return "#9ca3af";
  const c = colorName.toLowerCase();
  if (c.includes("preto") || c.includes("black") || c.includes("noite")) return "#1f2937";
  if (c.includes("branco") || c.includes("white") || c.includes("estelar")) return "#f9fafb";
  if (c.includes("amarelo") || c.includes("yellow")) return "#eab308";
  if (c.includes("roxo") || c.includes("purple")) return "#a855f7";
  if (c.includes("verde") || c.includes("green")) return "#22c55e";
  if (c.includes("vermelho") || c.includes("red")) return "#ef4444";
  if (c.includes("azul") || c.includes("blue")) return "#3b82f6";
  if (c.includes("rosa") || c.includes("pink")) return "#ec4899";
  if (c.includes("cinza") || c.includes("gray") || c.includes("titanium") || c.includes("titânio")) return "#6b7280";
  if (c.includes("dourado") || c.includes("gold")) return "#d97706";
  return "#9ca3af";
}

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

  // --- RECURSOS ERP DE ESCALA ---
  const [viewMode, setViewMode] = useState<"compact" | "comfortable" | "grid">("compact");
  const [groupByModel, setGroupByModel] = useState<boolean>(true); // Ativado por padrão para visão agrupada!
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "lowStock" | "outOfStock">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "price" | "stock" | "profit" | "brand">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // --- ETIQUETAS ZEBRA E GESTÃO DE IMEIS ---
  const [zebraProduct, setZebraProduct] = useState<{ product: AdminProduct; unit?: DeviceUnit } | null>(null);
  const [imeiProduct, setImeiProduct] = useState<AdminProduct | null>(null);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [unitBusy, setUnitBusy] = useState(false);
  const [newImei1, setNewImei1] = useState("");
  const [newImei2, setNewImei2] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newBatteryHealth, setNewBatteryHealth] = useState<number | "">(100);
  const [newRepairedParts, setNewRepairedParts] = useState("");
  const [newWarehouseLocation, setNewWarehouseLocation] = useState("");
  const [newUnitNotes, setNewUnitNotes] = useState("");
  const [newUnitCost, setNewUnitCost] = useState<number | "">("");

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

  function toggleModelExpand(modelKey: string) {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelKey)) next.delete(modelKey); else next.add(modelKey);
      return next;
    });
  }

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

  // --- GESTÃO DE UNIDADES DE IMEI ---
  async function addDeviceUnit(productId: string, variantId: string) {
    setUnitBusy(true);
    const response = await fetch(`/api/admin/products/${productId}/units`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        variantId,
        imei1: newImei1.trim() || undefined,
        imei2: newImei2.trim() || undefined,
        serialNumber: newSerial.trim() || undefined,
        batteryHealth: newBatteryHealth === "" ? undefined : Number(newBatteryHealth),
        repairedParts: newRepairedParts.trim() || undefined,
        warehouseLocation: newWarehouseLocation.trim() || undefined,
        costPrice: newUnitCost === "" ? undefined : Number(newUnitCost),
        notes: newUnitNotes.trim() || undefined,
      }),
    });
    const result = await response.json();
    if (response.ok) {
      setMessage("Unidade / IMEI cadastrado com sucesso no estoque.");
      setNewImei1("");
      setNewImei2("");
      setNewSerial("");
      setNewRepairedParts("");
      setNewUnitNotes("");
      setUnitFormOpen(false);
      await load();
      const updated = items.find((i) => i.id === productId);
      if (updated) setImeiProduct(updated);
    } else {
      alert(result.error || "Erro ao cadastrar IMEI.");
    }
    setUnitBusy(false);
  }

  async function removeDeviceUnit(productId: string, unitId: string) {
    if (!confirm("Tem certeza que deseja excluir esta unidade física / IMEI do estoque?")) return;
    const response = await fetch(`/api/admin/products/${productId}/units?unitId=${unitId}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Unidade excluída do estoque.");
      await load();
    } else {
      alert("Erro ao excluir unidade.");
    }
  }

  // --- CÁLCULOS DE MARGEM E LUCRO LÍQUIDO ---
  function calculateNetProfit(price: number, costPrice: number) {
    const pixPrice = price * 0.90;
    const estimatedFeesPercent = 0.075;
    const estimatedFeesVal = pixPrice * estimatedFeesPercent;
    const netProfit = pixPrice - costPrice - estimatedFeesVal;
    const netMargin = pixPrice > 0 ? (netProfit / pixPrice) * 100 : 0;
    return { pixPrice, estimatedFeesVal, netProfit, netMargin };
  }

  // --- FILTRAGEM ---
  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean))).sort();

  const filteredItems = items.filter((item) => {
    const variant = item.variants[0];
    const units = variant?.deviceUnits ?? [];
    const imeisStr = units.map((u) => `${u.imei1} ${u.imei2} ${u.serialNumber}`).join(" ");
    const query = `${item.name} ${item.brand} ${variant?.storage ?? ""} ${imeisStr}`.toLowerCase();
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

  // AGRUPAMENTO POR MODELO
  const groupedModelsMap = new Map<string, GroupedModel>();

  filteredItems.forEach((item) => {
    const modelName = getBaseModelName(item.name);
    const modelKey = `${item.brand}-${modelName}`.toLowerCase();
    const variant = item.variants[0];
    const price = Number(variant?.price ?? 0);
    const stock = variant?.stock ?? 0;
    const color = variant?.color;
    const storage = variant?.storage;
    const condition = variant?.condition;

    if (!groupedModelsMap.has(modelKey)) {
      groupedModelsMap.set(modelKey, {
        modelKey,
        modelName,
        brand: item.brand,
        items: [],
        totalStock: 0,
        minPrice: price,
        maxPrice: price,
        colors: [],
        storages: [],
        conditions: [],
      });
    }

    const group = groupedModelsMap.get(modelKey)!;
    group.items.push(item);
    group.totalStock += stock;
    if (price < group.minPrice) group.minPrice = price;
    if (price > group.maxPrice) group.maxPrice = price;
    if (color && !group.colors.includes(color)) group.colors.push(color);
    if (storage && !group.storages.includes(storage)) group.storages.push(storage);
    if (condition && !group.conditions.includes(condition)) group.conditions.push(condition);
  });

  const groupedModelsList = Array.from(groupedModelsMap.values()).sort((a, b) => {
    if (sortField === "price") {
      return sortDirection === "asc" ? a.minPrice - b.minPrice : b.minPrice - a.minPrice;
    }
    if (sortField === "stock") {
      return sortDirection === "asc" ? a.totalStock - b.totalStock : b.totalStock - a.totalStock;
    }
    // Padrão: Ordem alfabética de A-Z
    const nameComp = a.modelName.localeCompare(b.modelName, "pt-BR");
    return sortDirection === "asc" ? nameComp : -nameComp;
  });

  // PAGINAÇÃO
  const totalPages = Math.ceil(groupByModel ? groupedModelsList.length / pageSize : filteredItems.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedGroups = groupedModelsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const totalImeisRegistered = items.reduce((acc, i) => acc + (i.variants[0]?.deviceUnits?.length ?? 0), 0);

  return (
    <div className="admin-easy">
      <header className="admin-title">
        <div>
          <h1>
            Gerenciador de Produtos
            <span style={{ fontSize: "0.74rem", background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: "99px", fontWeight: "800" }}>
              {items.length} PRODUTOS • {groupedModelsList.length} FAMÍLIAS • {totalImeisRegistered} IMEIS
            </span>
          </h1>
        </div>
        <button className="button primary" onClick={newProduct} style={{ height: "38px", padding: "0 1rem", fontSize: "0.82rem" }}>
          <Plus size={16} /> Novo produto
        </button>
      </header>

      {message && <p className="admin-message" role="status">{message}</p>}

      {/* --- CARDS KPI EXECUTIVOS --- */}
      <section className="catalog-kpi-grid">
        <div className="kpi-card">
          <span><Package size={16} /> Total em Catálogo</span>
          <strong>{items.length}</strong>
          <small>{groupedModelsList.length} modelos de famílias</small>
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

      {/* --- TOOLBAR AVANÇADA COM SELETOR DE MODO AGRUPADO --- */}
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
          {/* BOTÃO TOGGLE PARA AGRUPAR POR MODELO */}
          <button
            className={`pro-tab-toggle-group ${groupByModel ? "is-grouped" : ""}`}
            onClick={() => setGroupByModel(!groupByModel)}
            title="Agrupar todas as cores e capacidades em 1 única linha por modelo"
          >
            <FolderTree size={15} />
            <span>{groupByModel ? "Visão Agrupada por Modelo" : "Visão por Variante Individual"}</span>
          </button>

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

          <label className="pro-search">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelo, cor, IMEI, Serial..." />
          </label>

          <div className="view-mode-toggle">
            <button className={`mode-btn ${viewMode === "compact" ? "active" : ""}`} title="Modo Tabela Densa" onClick={() => setViewMode("compact")}>
              <LayoutList size={16} />
            </button>
            <button className={`mode-btn ${viewMode === "comfortable" ? "active" : ""}`} title="Modo Confortável" onClick={() => setViewMode("comfortable")}>
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

      {/* --- VISÃO AGRUPADA POR MODELO (O QUE O USUÁRIO PEDIU!) --- */}
      {viewMode !== "grid" && groupByModel && (
        <div className="pro-table-container table-mode-compact">
          <div className="pro-table-header">
            <div className="col-chk">
              <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>EXP</span>
            </div>
            <div className="col-item">Modelo do Aparelho & Cores Disponíveis</div>
            <div className="col-brand">Marca</div>
            <div className="col-price">Faixa de Preço</div>
            {ownerView && <div className="col-profit">Variantes</div>}
            <div className="col-stock">Estoque Total</div>
            <div className="col-status">Ações do Modelo</div>
          </div>

          <div className="pro-table-body">
            {paginatedGroups.map((group) => {
              const isExpanded = expandedModels.has(group.modelKey);
              const firstItemImage = group.items.find((i) => i.images?.[0]?.url ?? i.imageUrl)?.imageUrl ?? group.items[0]?.images?.[0]?.url;

              return (
                <div key={group.modelKey} className="grouped-model-wrapper" style={{ borderBottom: "1px solid #e5e7eb" }}>
                  {/* CABEÇALHO DO MODELO AGRUPADO */}
                  <div
                    className="pro-table-row group-header-row"
                    onClick={() => toggleModelExpand(group.modelKey)}
                    style={{ background: isExpanded ? "#f0fdf4" : "#ffffff", cursor: "pointer", fontWeight: "600" }}
                  >
                    <div className="col-chk">
                      <button className="checkbox-btn" style={{ color: "#FF7900" }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </div>

                    <div className="col-item">
                      <div className="mini-thumb">
                        {firstItemImage ? <img src={firstItemImage} alt={group.modelName} /> : <span>Sem foto</span>}
                      </div>
                      <div className="item-title-block">
                        <strong className="item-name" style={{ fontSize: "0.92rem", color: "#111827" }}>
                          {group.modelName}
                        </strong>
                        {/* CÍRCULOS E SELETORES DE COR (EXATAMENTE COMO O CLIENTE PEDIU NA SEGUNDA IMAGEM!) */}
                        <div className="color-swatches-inline" style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
                          <span style={{ fontSize: "0.72rem", color: "#6b7280", marginRight: "4px" }}>Cores:</span>
                          {group.colors.map((colorName) => (
                            <span
                              key={colorName}
                              title={`Cor: ${colorName}`}
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                backgroundColor: getColorHex(colorName),
                                border: "1.5px solid #d1d5db",
                                display: "inline-block",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              }}
                            />
                          ))}
                          <span style={{ fontSize: "0.72rem", color: "#374151", fontWeight: "700", marginLeft: "4px" }}>
                            ({group.colors.length} cores • {group.items.length} variações)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-brand">
                      <span className="tag-brand">{group.brand}</span>
                    </div>

                    <div className="col-price">
                      <strong>
                        {group.minPrice === group.maxPrice
                          ? `R$ ${group.minPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : `R$ ${group.minPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - R$ ${group.maxPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        }
                      </strong>
                    </div>

                    {ownerView && (
                      <div className="col-profit">
                        <span style={{ fontSize: "0.78rem", color: "#4b5563" }}>
                          {group.storages.join(", ")}
                        </span>
                      </div>
                    )}

                    <div className="col-stock">
                      <span className={`pill-stock ${group.totalStock === 0 ? "zero" : "ok"}`}>
                        {group.totalStock === 0 ? "Esgotado" : `${group.totalStock} un. no total`}
                      </span>
                    </div>

                    <div className="col-status">
                      <button className="button secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", gap: "4px" }}>
                        <span>{isExpanded ? "Ocultar Cores" : `Ver Cores (${group.items.length})`}</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB-LINHAS DAS CORES E VARIANTES QUANDO EXPANDIDO */}
                  {isExpanded && (
                    <div className="grouped-children-list" style={{ background: "#fafafa", paddingLeft: "1.5rem", borderTop: "1px dashed #e5e7eb" }}>
                      {group.items.map((item) => {
                        const variant = item.variants[0];
                        const image = item.images?.[0]?.url ?? item.imageUrl;
                        const price = Number(variant?.price ?? 0);
                        const costPrice = variant?.costPrice !== undefined ? Number(variant.costPrice) : undefined;
                        const profitData = costPrice !== undefined ? calculateNetProfit(price, costPrice) : null;
                        const stock = variant?.stock ?? 0;
                        const isSelected = selectedIds.has(item.id);
                        const unitsCount = variant?.deviceUnits?.length ?? 0;

                        return (
                          <div key={item.id} className={`pro-table-row sub-row ${!item.active ? "inactive-row" : ""}`} style={{ background: "#ffffff", borderBottom: "1px solid #f3f4f6" }}>
                            <div className="col-chk">
                              <button onClick={() => toggleSelectId(item.id)} className="checkbox-btn">
                                {isSelected ? <CheckSquare size={16} className="checked-icon" /> : <Square size={16} />}
                              </button>
                            </div>

                            <div className="col-item" style={{ paddingLeft: "0.5rem" }}>
                              <div className="mini-thumb" style={{ width: "28px", height: "28px" }}>
                                {image ? <img src={image} alt={item.name} /> : <span>Sem foto</span>}
                              </div>
                              <div className="item-title-block">
                                <span className="item-name" style={{ fontSize: "0.82rem" }}>
                                  {variant?.color} • {variant?.storage} • {variant?.condition?.replace("_", " ")}
                                </span>
                              </div>
                            </div>

                            <div className="col-brand">
                              <span className="tag-brand" style={{ opacity: 0.7 }}>{item.brand}</span>
                            </div>

                            <div className="col-price">
                              <strong style={{ fontSize: "0.85rem" }}>R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                            </div>

                            {ownerView && (
                              <div className="col-profit">
                                {costPrice !== undefined && profitData ? (
                                  <span className={`profit-badge ${profitData.netMargin >= 20 ? "high" : profitData.netMargin >= 10 ? "mid" : "low"}`}>
                                    Lucro: R$ {profitData.netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <small>-</small>
                                )}
                              </div>
                            )}

                            <div className="col-stock">
                              <span className={`pill-stock ${stock === 0 ? "zero" : stock <= (variant?.lowStockThreshold ?? 5) ? "low" : "ok"}`}>
                                {stock === 0 ? "Esgotado" : `${stock} un.`}
                              </span>
                              <button className="btn-imei-badge" onClick={(e) => { e.stopPropagation(); setImeiProduct(item); }}>
                                <Barcode size={11} />
                                <span>{unitsCount} IMEI(s)</span>
                              </button>
                            </div>

                            <div className="col-status">
                              <button className={`btn-pill-toggle ${item.active ? "on" : "off"}`} onClick={(e) => { e.stopPropagation(); void toggle(item, "active"); }}>
                                {item.active ? <Eye size={12} /> : <EyeOff size={12} />}
                                <span>{item.active ? "Visível" : "Oculto"}</span>
                              </button>
                            </div>

                            <div className="col-actions">
                              <button className="row-action-btn print" onClick={(e) => { e.stopPropagation(); setZebraProduct({ product: item, unit: variant?.deviceUnits?.[0] }); }}>
                                <Printer size={13} />
                              </button>
                              <button className="row-action-btn edit" onClick={(e) => { e.stopPropagation(); editProduct(item); }}>
                                <Pencil size={13} />
                              </button>
                              <button className="row-action-btn delete" onClick={(e) => { e.stopPropagation(); void removeProduct(item); }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {paginatedGroups.length === 0 && (
              <div className="empty-table-state">
                <p>Nenhum modelo encontrado com os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VISÃO POR VARIANTE INDIVIDUAL --- */}
      {viewMode !== "grid" && !groupByModel && (
        <div className="pro-table-container table-mode-compact">
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
              <span>Preço PIX & Tabela</span>
              <ArrowUpDown size={12} />
            </div>
            {ownerView && (
              <div className="col-profit sortable" onClick={() => handleSort("profit")}>
                <span>Custo / Margem Líquida</span>
                <ArrowUpDown size={12} />
              </div>
            )}
            <div className="col-stock sortable" onClick={() => handleSort("stock")}>
              <span>Estoque & IMEIs</span>
              <ArrowUpDown size={12} />
            </div>
            <div className="col-status">Status</div>
            <div className="col-actions">Ações / Etiqueta</div>
          </div>

          <div className="pro-table-body">
            {paginatedItems.map((item) => {
              const variant = item.variants[0];
              const image = item.images?.[0]?.url ?? item.imageUrl;
              const price = Number(variant?.price ?? 0);
              const costPrice = variant?.costPrice !== undefined ? Number(variant.costPrice) : undefined;
              const profitData = costPrice !== undefined ? calculateNetProfit(price, costPrice) : null;
              const stock = variant?.stock ?? 0;
              const isSelected = selectedIds.has(item.id);
              const unitsCount = variant?.deviceUnits?.length ?? 0;

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
                        {variant?.color && <span className="tag-color">{variant.color}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="col-brand">
                    <span className="tag-brand">{item.brand}</span>
                  </div>

                  <div className="col-price">
                    <strong>R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                    <small style={{ color: "#16a34a", display: "block" }}>
                      PIX: R$ {(price * 0.9).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </small>
                  </div>

                  {ownerView && (
                    <div className="col-profit">
                      {costPrice !== undefined && profitData ? (
                        <>
                          <small>Custo: R$ {costPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</small>
                          <span className={`profit-badge ${profitData.netMargin >= 20 ? "high" : profitData.netMargin >= 10 ? "mid" : "low"}`}>
                            Lucro Líq: R$ {profitData.netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({profitData.netMargin.toFixed(1)}%)
                          </span>
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
                    <button
                      className="btn-imei-badge"
                      onClick={() => setImeiProduct(item)}
                      title="Gerenciar IMEIs e unidades físicas"
                    >
                      <Barcode size={12} />
                      <span>{unitsCount} IMEI(s)</span>
                    </button>
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
                    <button
                      className="row-action-btn print"
                      onClick={() => setZebraProduct({ product: item, unit: variant?.deviceUnits?.[0] })}
                      title="Imprimir Etiqueta Zebra / Térmica"
                    >
                      <Printer size={14} />
                    </button>
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
          Exibindo <strong>{groupByModel ? paginatedGroups.length : paginatedItems.length}</strong> de <strong>{groupByModel ? groupedModelsList.length : filteredItems.length}</strong> {groupByModel ? "família(s) de modelo" : "produto(s)"}
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

      {/* --- MODAL DE GERENCIAMENTO DE IMEIS & UNIDADES FÍSICAS --- */}
      {imeiProduct && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Gerenciar IMEIs">
          <div style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "16px", maxWidth: "800px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span className="eyebrow">Rastreabilidade FÍSICA ERP</span>
                <h2 style={{ fontSize: "1.3rem", margin: 0 }}>{imeiProduct.name}</h2>
                <small style={{ color: "#6b7280" }}>{imeiProduct.variants[0]?.storage} • {imeiProduct.variants[0]?.color} • {imeiProduct.variants[0]?.condition}</small>
              </div>
              <button className="modal-close" onClick={() => { setImeiProduct(null); setUnitFormOpen(false); }}><X /></button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem" }}>
              <strong>Unidades Físicas / IMEIs em Estoque ({imeiProduct.variants[0]?.deviceUnits?.length ?? 0})</strong>
              <button className="button primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }} onClick={() => setUnitFormOpen(!unitFormOpen)}>
                <Plus size={14} /> {unitFormOpen ? "Cancelar" : "Cadastrar Novo IMEI"}
              </button>
            </div>

            {/* FORMULÁRIO DE NOVO IMEI */}
            {unitFormOpen && (
              <form onSubmit={(e) => { e.preventDefault(); void addDeviceUnit(imeiProduct.id, imeiProduct.variants[0].id); }} style={{ background: "#f9fafb", padding: "1rem", borderRadius: "10px", marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Cadastrar Novo Aparelho / IMEI</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    IMEI 1 (Obrigatório)
                    <input required value={newImei1} onChange={(e) => setNewImei1(e.target.value)} placeholder="Ex: 354892109845123" style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", marginTop: "2px" }} />
                  </label>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    IMEI 2 / eSIM (Opcional)
                    <input value={newImei2} onChange={(e) => setNewImei2(e.target.value)} placeholder="Ex: 354892109845124" style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", marginTop: "2px" }} />
                  </label>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    Número de Série (Serial)
                    <input value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="Ex: G6VZX091LMPQ" style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", marginTop: "2px" }} />
                  </label>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    Saúde da Bateria (%)
                    <input type="number" min={1} max={100} value={newBatteryHealth} onChange={(e) => setNewBatteryHealth(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Ex: 94" style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", marginTop: "2px" }} />
                  </label>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    Laudo de Peças Trocadas
                    <input value={newRepairedParts} onChange={(e) => setNewRepairedParts(e.target.value)} placeholder="Ex: 100% Original / Bateria trocada" style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", marginTop: "2px" }} />
                  </label>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    Localização no Estoque (WMS)
                    <input value={newWarehouseLocation} onChange={(e) => setNewWarehouseLocation(e.target.value)} placeholder="Ex: GAVETA-03 / PRATELEIRA A" style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", marginTop: "2px" }} />
                  </label>
                </div>
                <div style={{ marginTop: "0.75rem", textAlign: "right" }}>
                  <button type="submit" disabled={unitBusy} className="button primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                    {unitBusy ? "Salvando..." : "Salvar IMEI no Estoque"}
                  </button>
                </div>
              </form>
            )}

            {/* TABELA DE IMEIS EXISTENTES */}
            <div style={{ maxHeight: "350px", overflowY: "auto" }}>
              {imeiProduct.variants[0]?.deviceUnits && imeiProduct.variants[0].deviceUnits.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                      <th style={{ padding: "8px" }}>IMEI 1 / Serial</th>
                      <th style={{ padding: "8px" }}>Bateria</th>
                      <th style={{ padding: "8px" }}>Peças / Obs</th>
                      <th style={{ padding: "8px" }}>Localização</th>
                      <th style={{ padding: "8px" }}>Status</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imeiProduct.variants[0].deviceUnits.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px" }}>
                          <strong>{u.imei1 || "Sem IMEI"}</strong>
                          {u.serialNumber && <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>SN: {u.serialNumber}</div>}
                        </td>
                        <td style={{ padding: "8px" }}>
                          {u.batteryHealth ? <span style={{ color: "#16a34a", fontWeight: "700" }}>🔋 {u.batteryHealth}%</span> : "-"}
                        </td>
                        <td style={{ padding: "8px" }}>{u.repairedParts || "100% Original"}</td>
                        <td style={{ padding: "8px" }}>{u.warehouseLocation || "Depósito Central"}</td>
                        <td style={{ padding: "8px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", fontWeight: "700" }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <button
                            onClick={() => setZebraProduct({ product: imeiProduct, unit: u })}
                            style={{ background: "#f3f4f6", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", marginRight: "4px" }}
                            title="Imprimir etiqueta Zebra desta unidade"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => void removeDeviceUnit(imeiProduct.id, u.id)}
                            style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
                            title="Excluir IMEI"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Nenhum IMEI individual cadastrado ainda para este produto.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE IMPRESSÃO DE ETIQUETA TÉRMICA ZEBRA --- */}
      {zebraProduct && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Etiqueta Zebra">
          <div style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "16px", maxWidth: "450px", width: "100%", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <strong style={{ fontSize: "1rem" }}>Etiqueta Térmica Zebra (50x30mm)</strong>
              <button className="modal-close" onClick={() => setZebraProduct(null)}><X /></button>
            </div>

            {/* DESIGN DA ETIQUETA ZEBRA */}
            <div
              id="zebra-print-area"
              style={{
                border: "2px dashed #111827",
                padding: "12px",
                borderRadius: "8px",
                textAlign: "left",
                background: "#ffffff",
                fontFamily: "monospace",
                color: "#000000",
                margin: "0 auto 1.5rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
                {zebraProduct.product.brand} - {zebraProduct.product.name}
              </div>
              <div style={{ fontSize: "0.7rem", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                <span>{zebraProduct.product.variants[0]?.storage} • {zebraProduct.product.variants[0]?.color}</span>
                <strong>{zebraProduct.product.variants[0]?.condition}</strong>
              </div>
              {zebraProduct.unit?.batteryHealth && (
                <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#000", marginTop: "2px" }}>
                  Bateria: {zebraProduct.unit.batteryHealth}% {zebraProduct.unit.repairedParts ? `(${zebraProduct.unit.repairedParts})` : ""}
                </div>
              )}
              <div style={{ fontSize: "0.85rem", fontWeight: "900", marginTop: "6px", borderTop: "1px solid #000", paddingTop: "4px" }}>
                PIX: R$ {(Number(zebraProduct.product.variants[0]?.price ?? 0) * 0.9).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.68rem" }}>
                ou 12x de R$ {(Number(zebraProduct.product.variants[0]?.price ?? 0) / 12).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              {zebraProduct.unit?.imei1 && (
                <div style={{ fontSize: "0.65rem", marginTop: "6px", background: "#f3f4f6", padding: "3px", borderRadius: "3px" }}>
                  IMEI: {zebraProduct.unit.imei1}
                </div>
              )}
            </div>

            <button
              className="button primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => window.print()}
            >
              <Printer size={16} /> Imprimir Etiqueta na Impressora Térmica
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL DE CADASTRO / EDIÇÃO DE PRODUTO --- */}
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
              <label>Preço de Venda (Tabela)<input required name="price" type="number" min="1" step=".01" defaultValue={editing ? Number(editing.variants[0]?.price) : undefined} /></label>
              {ownerView && <label className="owner-field">Preço de custo (somente administrador)<input required name="costPrice" type="number" min="0" step=".01" defaultValue={editing ? Number(editing.variants[0]?.costPrice ?? 0) : 0} /></label>}
              <label>Estoque Total<input required name="stock" type="number" min="0" step="1" defaultValue={editing?.variants[0]?.stock} /></label>
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
                {specifications.map((item, index) => <div key={index} className="spec-row">
                  <input placeholder="Rótulo" value={item.label} onChange={(event) => updateSpecification(index, "label", event.target.value)} />
                  <input placeholder="Valor" value={item.value} onChange={(event) => updateSpecification(index, "value", event.target.value)} />
                  <button type="button" onClick={() => setSpecifications((current) => current.filter((_, position) => position !== index))} aria-label="Remover especificação"><X /></button>
                </div>)}
              </section>

              <div className="admin-form-options wide">
                <label className="checkbox-field"><input type="checkbox" name="featured" defaultChecked={editing?.featured} /> Destacar este produto na capa do site</label>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" disabled={busy} className="button primary">{busy ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar produto"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

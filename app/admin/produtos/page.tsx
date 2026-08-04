"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  Box,
  CheckSquare,
  Copy,
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
  LoaderCircle,
  Package,
  Pencil,
  Plus,
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
import ModelViewer3D from "../../../src/components/ModelViewer3D";
import {
  getProductColorHex,
  IPHONE_COLOR_OPTIONS,
  NOTEBOOK_STORAGE_OPTIONS,
  normalizeProductColor,
  normalizeProductStorage,
  PHONE_STORAGE_OPTIONS,
} from "../../../src/lib/productStandards";
import { calculateGrossProfit } from "../../../src/lib/profit";
import { uploadAdminFile } from "../../../src/lib/uploadClient";
import { useAdminFeedback } from "../../../src/components/admin/AdminFeedback";
import {
  emptyImages,
  getBaseModelName,
  type AdminProduct,
  type CatalogFilter,
  type GroupedModel,
  type Specification,
} from "./types";

export default function AdminProdutos() {
  const { confirmDialog } = useAdminFeedback();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  // Produto usado como molde ao duplicar (cria variação da família sem redigitar).
  const [template, setTemplate] = useState<AdminProduct | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storage, setStorage] = useState("128 GB");
  const [color, setColor] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(emptyImages);
  const [model3dUrl, setModel3dUrl] = useState<string>("");
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [message, setMessage] = useState("");
  const [editorError, setEditorError] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
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


  async function load() {
    const [response, filtersResponse] = await Promise.all([
      fetch("/api/admin/products?view=summary", { cache: "no-store" }),
      fetch("/api/admin/filters", { cache: "no-store" }),
    ]);
    if (response.ok) {
      const products: AdminProduct[] = await response.json();
      setItems(products);
      setOwnerView(response.headers.get("X-Owner-View") === "true");
    }
    if (filtersResponse.ok) setFilters(await filtersResponse.json());
  }

  useEffect(() => {
    void load().catch(() => setMessage("Falha de conexão ao carregar os produtos. Recarregue a página."));
  }, []);
  useEffect(() => { setSearch(searchParams.get("q") ?? ""); }, [searchParams]);
  useEffect(() => { setPage(1); }, [search, statusFilter, stockFilter, brandFilter, conditionFilter, pageSize]);

  const selectedOptionText = filters.flatMap((filter) => filter.options
    .filter((option) => selectedFilters[filter.id] === option.id)
    .map((option) => `${filter.name} ${filter.slug} ${option.label}`))
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const isNotebook = /notebook|informatica|computador|laptop|macbook/.test(selectedOptionText);
  const isIPhone = /iphone/.test(`${title} ${(editing ?? template)?.brand ?? ""} ${selectedOptionText}`.toLowerCase());
  const baseStorageOptions = isNotebook ? NOTEBOOK_STORAGE_OPTIONS : PHONE_STORAGE_OPTIONS;
  const normalizedStorage = normalizeProductStorage(storage);
  const storageOptions = baseStorageOptions.includes(normalizedStorage as never)
    ? [...baseStorageOptions]
    : [normalizedStorage, ...baseStorageOptions];
  const iphoneColorOptions = color && !IPHONE_COLOR_OPTIONS.includes(color as (typeof IPHONE_COLOR_OPTIONS)[number])
    ? [color, ...IPHONE_COLOR_OPTIONS]
    : [...IPHONE_COLOR_OPTIONS];
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        setOpen(false);
        setEditing(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, busy]);

  function toggleModelExpand(modelKey: string) {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelKey)) next.delete(modelKey); else next.add(modelKey);
      return next;
    });
  }

  function newProduct() {
    setEditorLoading(false);
    setEditing(null);
    setTemplate(null);
    setTitle("");
    setDescription("");
    setStorage("128 GB");
    setColor("");
    setImageUrls(emptyImages());
    setModel3dUrl("");
    setSpecifications([]);
    setSelectedFilters({});
    setMessage("");
    setEditorError("");
    setOpen(true);
  }

  function populateEditor(item: AdminProduct) {
    const savedImages = item.images?.map((image) => image.url) ?? [];
    const initialImages = savedImages.length ? savedImages : item.imageUrl ? [item.imageUrl] : [];
    setEditing(item);
    setTitle(item.name);
    setDescription(item.description ?? "");
    setStorage(normalizeProductStorage(item.variants[0]?.storage ?? "128 GB"));
    setColor(normalizeProductColor(item.variants[0]?.color ?? ""));
    setImageUrls([...initialImages, "", "", "", ""].slice(0, 4));
    setModel3dUrl(item.model3dUrl ?? "");
    setSpecifications(item.specifications?.map(({ label, value }) => ({ label, value })) ?? []);
    setSelectedFilters(Object.fromEntries(
      (item.filterSelections ?? []).map((selection) => [selection.option.filterId, selection.option.id]),
    ));
    setMessage("");
    setEditorError("");
  }

  async function editProduct(item: AdminProduct) {
    setEditing(item);
    setOpen(true);
    setEditorLoading(true);
    const response = await fetch(`/api/admin/products/${item.id}`, { cache: "no-store" });
    if (!response.ok) {
      setOpen(false);
      setEditing(null);
      setMessage("Não foi possível carregar os dados deste aparelho.");
      setEditorLoading(false);
      return;
    }
    populateEditor(await response.json());
    setTemplate(null);
    setEditorLoading(false);
  }

  // Abre o cadastro pré-preenchido com os dados de um produto existente.
  // Salvar cria um produto NOVO (irmão de família: outra capacidade/cor/condição).
  async function duplicateProduct(item: AdminProduct) {
    setOpen(true);
    setEditorLoading(true);
    const response = await fetch(`/api/admin/products/${item.id}`, { cache: "no-store" });
    if (!response.ok) {
      setOpen(false);
      setMessage("Não foi possível carregar os dados deste aparelho.");
      setEditorLoading(false);
      return;
    }
    const full = await response.json() as AdminProduct;
    populateEditor(full);
    setEditing(null);
    // Estoque zera: a variação nova ainda não tem unidade física cadastrada.
    setTemplate({
      ...full,
      variants: full.variants.map((variant, index) => index === 0 ? { ...variant, stock: 0 } : variant),
    });
    setEditorLoading(false);
  }

  function updateImage(index: number, value: string) {
    setImageUrls((current) => current.map((url, position) => position === index ? value : url));
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    const result = await uploadAdminFile(file);
    if (result.url) {
      const uploadedUrl = result.url;
      setImageUrls((current) => {
        const next = [...current];
        const position = next.findIndex((url) => !url);
        next[position < 0 ? 0 : position] = uploadedUrl;
        return next;
      });
    } else {
      setMessage(result.error ?? "Não foi possível enviar o arquivo.");
    }
    setBusy(false);
  }

  async function upload3DModel(file?: File) {
    if (!file) return;
    setBusy(true);
    const result = await uploadAdminFile(file);
    if (result.url) {
      setModel3dUrl(result.url);
    } else {
      setMessage(result.error ?? "Não foi possível enviar o arquivo.");
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
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      const invalidField = form.querySelector<HTMLElement>(":invalid");
      setEditorError("Preencha o campo obrigatório destacado antes de cadastrar o produto.");
      invalidField?.scrollIntoView({ behavior: "smooth", block: "center" });
      invalidField?.focus();
      form.reportValidity();
      return;
    }
    setBusy(true);
    setMessage("");
    setEditorError("");
    try {
      const data = new FormData(form);
      const values = Object.fromEntries(data.entries());
      const selectedBrandGroup = filters.find((filter) => filter.slug === "marca");
      const selectedBrandOption = selectedBrandGroup?.options.find((option) => option.id === selectedFilters[selectedBrandGroup.id]);
      const payload = {
        ...values,
        brand: selectedBrandOption?.label ?? (editing ?? template)?.brand ?? "Sem marca",
        description,
        imageUrls: imageUrls.map((url) => url.trim()).filter(Boolean),
        model3dUrl: model3dUrl.trim() || null,
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
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setEditorError(result.error ?? "Não foi possível salvar o produto. Tente novamente.");
        return;
      }
      setOpen(false);
      setEditing(null);
      setMessage(editing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
      await load();
    } catch {
      setEditorError("Não foi possível comunicar com o servidor. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(item: AdminProduct) {
    if (!(await confirmDialog({ title: "Excluir produto", message: `Excluir "${item.name}"? O produto sai da vitrine (a exclusão desativa, não apaga o histórico).`, confirmLabel: "Excluir", danger: true }))) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/products/${item.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(result.message ?? "Produto excluído com sucesso.");
      await load();
    } else {
      setMessage(result.error ?? "Não foi possível excluir o produto.");
    }
    setBusy(false);
  }

  async function toggle(item: AdminProduct, key: "active" | "featured") {
    const response = await fetch(`/api/admin/products/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: !item[key] }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "Não foi possível atualizar o produto.");
      return;
    }
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
    const responses = await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ featured }),
        })
      )
    );
    const failed = responses.filter((response) => !response.ok).length;
    setSelectedIds(new Set());
    setMessage(failed
      ? `${responses.length - failed} produto(s) atualizado(s). ${failed} excederam o limite de 10 destaques.`
      : `${selectedIds.size} produto(s) ${featured ? "adicionado(s) à capa" : "removido(s) da capa"}.`);
    await load();
    setBusy(false);
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!(await confirmDialog({ title: "Excluir em massa", message: `Excluir os ${selectedIds.size} produto(s) selecionados? Eles saem da vitrine.`, confirmLabel: "Excluir todos", danger: true }))) return;
    setBusy(true);
    const responses = await Promise.all(
      Array.from(selectedIds).map((id) => fetch(`/api/admin/products/${id}`, { method: "DELETE" }))
    );
    const results = await Promise.all(responses.map(async (response) => ({
      ok: response.ok,
      body: await response.json().catch(() => ({})),
    })));
    const deleted = results.filter((result) => result.ok && result.body.deleted).length;
    const archived = results.filter((result) => result.ok && result.body.archived).length;
    const failed = results.length - deleted - archived;
    setSelectedIds(new Set());
    setMessage([
      deleted ? `${deleted} produto(s) excluído(s)` : "",
      archived ? `${archived} arquivado(s) por possuir vendas` : "",
      failed ? `${failed} não puderam ser removidos` : "",
    ].filter(Boolean).join(" · "));
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

  // --- CÁLCULOS DE MARGEM E LUCRO LÍQUIDO ---
  // --- FILTRAGEM ---
  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean))).sort();

  const filteredItems = items.filter((item) => {
    const variant = item.variants[0];
    const query = `${item.name} ${item.brand} ${variant?.storage ?? ""} ${variant?.color ?? ""}`.toLowerCase();
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
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
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
        featured: false,
      });
    }

    const group = groupedModelsMap.get(modelKey)!;
    group.featured ||= item.featured;
    group.items.push(item);
    group.totalStock += stock;
    if (price < group.minPrice) group.minPrice = price;
    if (price > group.maxPrice) group.maxPrice = price;
    if (color && !group.colors.includes(color)) group.colors.push(color);
    if (storage && !group.storages.includes(storage)) group.storages.push(storage);
    if (condition && !group.conditions.includes(condition)) group.conditions.push(condition);
  });

  const groupedModelsList = Array.from(groupedModelsMap.values()).sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
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

  return (
    <div className="admin-easy">
      <header className="admin-title">
        <div>
          <h1>
            Gerenciador de Produtos
            <span style={{ fontSize: "0.74rem", background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: "99px", fontWeight: "800" }}>
              {items.length} PRODUTOS • {groupedModelsList.length} FAMÍLIAS
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelo, marca, cor ou capacidade..." />
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
                                backgroundColor: getProductColorHex(colorName),
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
                        const profitData = costPrice !== undefined ? calculateGrossProfit(price, costPrice) : null;
                        const stock = variant?.stock ?? 0;
                        const isSelected = selectedIds.has(item.id);

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
                                  <span className={`profit-badge ${profitData.grossMargin >= 20 ? "high" : profitData.grossMargin >= 10 ? "mid" : "low"}`} title="Lucro bruto">
                                    + R$ {profitData.grossProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                            </div>

                            <div className="col-status">
                              <button className={`btn-pill-toggle ${item.active ? "on" : "off"}`} onClick={(e) => { e.stopPropagation(); void toggle(item, "active"); }}>
                                {item.active ? <Eye size={12} /> : <EyeOff size={12} />}
                                <span>{item.active ? "Visível" : "Oculto"}</span>
                              </button>
                            </div>

                            <div className="col-actions">
                              <button className="row-action-btn edit" onClick={(e) => { e.stopPropagation(); void duplicateProduct(item); }} title="Duplicar como variação (outra capacidade/cor)">
                                <Copy size={13} />
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
                <span>Custo / Margem Bruta</span>
                <ArrowUpDown size={12} />
              </div>
            )}
            <div className="col-stock sortable" onClick={() => handleSort("stock")}>
              <span>Estoque</span>
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
              const profitData = costPrice !== undefined ? calculateGrossProfit(price, costPrice) : null;
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
                          <span className={`profit-badge ${profitData.grossMargin >= 20 ? "high" : profitData.grossMargin >= 10 ? "mid" : "low"}`}>
                            Lucro bruto: R$ {profitData.grossProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({profitData.grossMargin.toFixed(1)}%)
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
                    <button className="row-action-btn edit" onClick={() => void duplicateProduct(item)} title="Duplicar como variação (outra capacidade/cor)">
                      <Copy size={14} />
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
                    <button className="row-action-btn edit" onClick={() => void duplicateProduct(item)} title="Duplicar como variação">
                      <Copy size={14} />
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

      {/* --- MODAL DE CADASTRO / EDIÇÃO DE PRODUTO --- */}
      {open && (
        <div className="admin-modal product-editor-modal" role="dialog" aria-modal="true" aria-label={editing ? "Editar produto" : "Novo produto"} onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setOpen(false);
            setEditing(null);
          }
        }}>
          <form className="product-editor-form" key={(editing ?? template)?.id ?? "new"} onSubmit={save} noValidate>
            <header className="product-editor-heading">
              <div><span className="eyebrow">{editing ? "Editar aparelho" : template ? "Duplicar como variação" : "Novo aparelho"}</span><h2>{editing ? editing.name : template ? `Variação de: ${template.name}` : "Cadastrar produto"}</h2></div>
              <button type="button" className="modal-close" onClick={() => { setOpen(false); setEditing(null); setTemplate(null); }} aria-label="Fechar"><X /></button>
            </header>

            {editorLoading ? <div className="product-editor-loading"><LoaderCircle className="spin" /><span>Carregando aparelho...</span></div> : <>
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
              <label>Armazenamento<select required name="storage" value={storage} onChange={(event) => setStorage(event.target.value)}>{storageOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              {isIPhone ? (
                <fieldset className="iphone-color-picker">
                  <legend>Cor do iPhone</legend>
                  <input
                    required
                    name="color"
                    value={color}
                    readOnly
                    placeholder="Selecione uma cor abaixo"
                    aria-label="Cor selecionada do iPhone"
                  />
                  <div className="iphone-color-options" role="group" aria-label="Cores disponiveis do iPhone">
                    {iphoneColorOptions.map((colorName) => {
                      const selected = color === colorName;
                      return (
                        <button
                          key={colorName}
                          type="button"
                          className={selected ? "is-selected" : ""}
                          onClick={() => setColor(colorName)}
                          aria-pressed={selected}
                          title={colorName}
                        >
                          <span style={{ backgroundColor: getProductColorHex(colorName) }} />
                          <small>{colorName}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <label>
                  Cor
                  <input
                    required
                    name="color"
                    value={color}
                    onChange={(event) => setColor(normalizeProductColor(event.target.value))}
                    style={{ textTransform: "uppercase" }}
                  />
                </label>
              )}
              <label>
                Condição
                <select name="condition" defaultValue={(editing ?? template)?.variants[0]?.condition ?? "NOVO"}>
                  <option value="NOVO">Novo</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="MUITO_BOM">Muito bom</option>
                  <option value="BOM">Bom</option>
                  <option value="OUTLET">Outlet</option>
                </select>
              </label>
              <label>Preço de Venda (Tabela)<input required name="price" type="number" min="1" step=".01" defaultValue={(editing ?? template) ? Number((editing ?? template)!.variants[0]?.price) : undefined} /></label>
              {ownerView && <label className="owner-field">Preço de custo (somente administrador)<input required name="costPrice" type="number" min="0" step=".01" defaultValue={(editing ?? template) ? Number((editing ?? template)!.variants[0]?.costPrice ?? 0) : 0} /></label>}
              <label>Estoque Total<input required name="stock" type="number" min="0" step="1" defaultValue={(editing ?? template)?.variants[0]?.stock ?? 0} /></label>
              <label>Alerta de estoque mínimo<input required name="lowStockThreshold" type="number" min="0" step="1" defaultValue={(editing ?? template)?.variants[0]?.lowStockThreshold ?? 5} /></label>

              <label className="wide">
                Descrição
                <textarea required name="description" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>

              <section className="product-images-editor wide">
                <header><div><h3>Fotos do produto</h3><p>Cole até quatro links. A prévia aparece automaticamente.</p></div><Link2 /></header>
                <div className="image-url-grid">
                  {imageUrls.map((url, index) => <article className="image-edit-card" key={index}>
                    <label><span>Foto {index + 1}</span><input type="text" value={url} onChange={(event) => updateImage(index, event.target.value)} placeholder="https://... ou /uploads/..." /></label>
                    <div className="image-link-preview">
                      {url ? <img src={url} alt={`Prévia da foto ${index + 1}`} /> : <ImagePlus />}
                    </div>
                    <button type="button" className="image-remove-button" onClick={() => updateImage(index, "")} disabled={!url} aria-label={`Remover foto ${index + 1}`} title="Remover foto"><Trash2 /></button>
                  </article>)}
                </div>
                <label className="upload-box">
                  <ImagePlus /> {busy ? "Enviando..." : "Ou envie uma foto do computador"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
                </label>
              </section>

              <section className="product-images-editor wide">
                <header><div><h3>Modelo 3D Interativo 360° (.glb)</h3><p>Cole a URL do arquivo 3D ou envie do computador para exibir a rotação 360° do aparelho.</p></div><Box style={{ color: "var(--store-orange)" }} /></header>
                <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", marginBottom: "0.8rem" }}>
                  <input
                    type="text"
                    placeholder="https://.../modelo.glb ou /uploads/...glb"
                    value={model3dUrl}
                    onChange={(event) => setModel3dUrl(event.target.value)}
                    style={{ flex: 1, height: "42px", padding: "0 0.8rem", borderRadius: "10px", border: "1px solid #d8e1dc", background: "#f8faf9" }}
                  />
                  {model3dUrl && (
                    <button
                      type="button"
                      className="image-remove-button"
                      onClick={() => setModel3dUrl("")}
                      title="Remover modelo 3D"
                      style={{ height: "42px", width: "42px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer" }}
                    >
                      <Trash2 style={{ width: "18px", height: "18px" }} />
                    </button>
                  )}
                </div>
                <label className="upload-box" style={{ marginTop: 0 }}>
                  <Box style={{ color: "var(--store-orange)" }} /> {busy ? "Enviando..." : "Enviar modelo 3D (.glb) do computador"}
                  <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream" onChange={(event) => upload3DModel(event.target.files?.[0])} />
                </label>
                {model3dUrl && (
                  <div style={{ marginTop: "1rem", height: "300px", borderRadius: "14px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    <ModelViewer3D src={model3dUrl} />
                  </div>
                )}
              </section>

              <section className="spec-editor wide">
                <header>
                  <div><h3>Especificações</h3><p>Edite o que a IA criou ou adicione informações manualmente.</p></div>
                  <button type="button" onClick={() => setSpecifications((current) => [...current, { label: "", value: "" }])}><Plus /> Adicionar</button>
                </header>
                {specifications.length === 0 && <p className="spec-empty">Use “Gerar com IA” ou adicione uma especificação.</p>}
                {specifications.map((item, index) => <div key={index} className="spec-edit-row">
                  <input placeholder="Rótulo" value={item.label} onChange={(event) => updateSpecification(index, "label", event.target.value)} />
                  <input placeholder="Valor" value={item.value} onChange={(event) => updateSpecification(index, "value", event.target.value)} />
                  <button type="button" onClick={() => setSpecifications((current) => current.filter((_, position) => position !== index))} aria-label="Remover especificação" title="Remover especificação"><Trash2 /></button>
                </div>)}
              </section>

              <div className="admin-form-options wide">
                <label className="featured-checkbox-field">
                  <input type="checkbox" name="featured" defaultChecked={(editing ?? template)?.featured} />
                  <span><Star size={16} /><b>Destacar na capa</b><small>Até 10 produtos aparecem no topo da loja.</small></span>
                </label>
              </div>
              </div>

              {editorError && <p className="form-error product-editor-error" role="alert">{editorError}</p>}
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => { setOpen(false); setEditing(null); setTemplate(null); }}>Cancelar</button>
                <button type="submit" disabled={busy} className="button primary">{busy ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar produto"}</button>
              </div>
            </>}
          </form>
        </div>
      )}
    </div>
  );
}

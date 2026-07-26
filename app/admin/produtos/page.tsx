"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye, EyeOff, ImagePlus, Link2, Pencil, Plus, Search, SlidersHorizontal, Sparkles, Star, Trash2, X,
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

  async function toggle(item: AdminProduct, key: "active" | "featured") {
    await fetch(`/api/admin/products/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: !item[key] }),
    });
    await load();
  }

  return <div className="admin-easy">
    <header className="admin-title">
      <div>
        <span className="eyebrow">Catálogo</span>
        <h1>Produtos</h1>
        <p>Edite fotos, descrição, especificações, preço, estoque e o que aparece na capa.</p>
      </div>
      <button className="button primary" onClick={newProduct}><Plus /> Novo produto</button>
    </header>

    {message && <p className="admin-message" role="status">{message}</p>}

    <div className="admin-toolbar product-toolbar"><label className="toolbar-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou marca" /></label></div>
    <section className="admin-product-list">
      {items.filter((item) => `${item.name} ${item.brand} ${item.variants[0]?.storage ?? ""}`.toLowerCase().includes(search.toLowerCase().trim())).map((item) => {
        const variant = item.variants[0];
        const image = item.images?.[0]?.url ?? item.imageUrl;
        return <article key={item.id} className={!item.active ? "inactive" : ""}>
          <div className="admin-thumb">{image ? <img src={image} alt="" /> : <span>Sem foto</span>}</div>
          <div>
            <small>{item.brand} • {variant?.storage}</small>
            <h2>{item.name}</h2>
            <p>R$ {Number(variant?.price ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • {variant?.stock ?? 0} em estoque</p>
            {ownerView && variant?.costPrice !== undefined && <p className="product-cost">Custo: R$ {Number(variant.costPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • lucro/un.: R$ {(Number(variant.price) - Number(variant.costPrice)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
          </div>
          <button className="edit-action" onClick={() => editProduct(item)}><Pencil /> Editar</button>
          <button className={item.featured ? "active-action" : ""} onClick={() => toggle(item, "featured")}>
            <Star /> {item.featured ? "Na capa" : "Colocar na capa"}
          </button>
          <button onClick={() => toggle(item, "active")}>
            {item.active ? <Eye /> : <EyeOff />}{item.active ? "Visível" : "Oculto"}
          </button>
        </article>;
      })}
    </section>

    {open && <div className="admin-modal" role="dialog" aria-modal="true" aria-label={editing ? "Editar produto" : "Novo produto"}>
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
    </div>}
  </div>;
}

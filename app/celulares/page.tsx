"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import ProductCard from "../../src/components/ProductCard";
import { products, type CatalogProduct } from "../../src/lib/catalog";

import CatalogCarousel, { type CatalogSlide } from "../../src/components/CatalogCarousel";

type PublicFilter = {
  id: string;
  name: string;
  slug: string;
  options: Array<{ id: string; label: string; slug: string }>;
};
type CatalogBanner = { eyebrow: string; title: string; description: string; imageUrl: string };
const defaultBanner: CatalogBanner = {
  eyebrow: "Catálogo completo",
  title: "Produtos",
  description: "Encontre o produto ideal usando os filtros da loja.",
  imageUrl: "",
};

function CatalogContent() {
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const [catalog, setCatalog] = useState<CatalogProduct[]>(products);
  const [filters, setFilters] = useState<PublicFilter[]>([]);
  const [banner, setBanner] = useState<CatalogBanner>(defaultBanner);
  const [catalogSlides, setCatalogSlides] = useState<CatalogSlide[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("Todas");
  const [sort, setSort] = useState("relevance");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  useEffect(() => {
    void Promise.all([
      fetch("/api/products").then((response) => response.json()),
      fetch("/api/catalog-filters").then((response) => response.json()),
      fetch("/api/site-content").then((response) => response.json()),
    ]).then(([catalogData, filterData, siteData]: [CatalogProduct[], PublicFilter[], { content?: { catalogBanner?: Partial<CatalogBanner>; catalogSlides?: CatalogSlide[] } }]) => {
      setCatalog(catalogData);
      setFilters(filterData);
      const prices = catalogData.map((product) => product.price).filter(Number.isFinite);
      setMinPrice(prices.length ? Math.floor(Math.min(...prices)) : 0);
      setMaxPrice(prices.length ? Math.ceil(Math.max(...prices)) : 0);
      if (Array.isArray(siteData.content?.catalogSlides) && siteData.content.catalogSlides.length) {
        setCatalogSlides(siteData.content.catalogSlides);
      } else if (siteData.content?.catalogBanner) {
        setBanner({ ...defaultBanner, ...siteData.content.catalogBanner });
        setCatalogSlides([{ ...defaultBanner, ...siteData.content.catalogBanner }]);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setCondition(searchParams.get("condition") ?? "Todas");
    const initialSelections: Record<string, string> = {};
    for (const filter of filters) {
      const requested = searchParams.get(filter.slug) ?? (filter.slug === "marca" ? searchParams.get("brand") : null);
      if (!requested) continue;
      const option = filter.options.find((item) =>
        item.slug.toLowerCase() === requested.toLowerCase() ||
        item.label.toLowerCase() === requested.toLowerCase(),
      );
      if (option) initialSelections[filter.slug] = option.slug;
    }
    setSelectedFilters(initialSelections);
  }, [filters, paramsKey, searchParams]);

  const priceLimits = useMemo(() => {
    const values = catalog.map((product) => product.price).filter(Number.isFinite);
    return {
      min: values.length ? Math.floor(Math.min(...values)) : 0,
      max: values.length ? Math.ceil(Math.max(...values)) : 0,
    };
  }, [catalog]);
  const effectiveMaxPrice = maxPrice || priceLimits.max;
  const conditions = ["Todas", ...Array.from(new Set(catalog.map((product) => product.condition)))];
  const filtered = useMemo(() => {
    const list = catalog.filter((product) => {
      const matchesCustomFilters = Object.entries(selectedFilters).every(([groupSlug, optionSlug]) =>
        !optionSlug || product.filters?.some((filter) => filter.groupSlug === groupSlug && filter.optionSlug === optionSlug),
      );
      return matchesCustomFilters &&
        (condition === "Todas" || product.condition === condition) &&
        product.price >= minPrice &&
        product.price <= effectiveMaxPrice &&
        `${product.brand} ${product.name} ${product.filters?.map((filter) => filter.optionLabel).join(" ") ?? ""}`
          .toLowerCase().includes(query.toLowerCase());
    });
    return [...list].sort((a, b) => sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : b.stock - a.stock);
  }, [catalog, condition, effectiveMaxPrice, minPrice, query, selectedFilters, sort]);

  function clearFilters() {
    setQuery("");
    setCondition("Todas");
    setSelectedFilters({});
    setMinPrice(priceLimits.min);
    setMaxPrice(priceLimits.max);
  }

  const priceSpan = Math.max(1, priceLimits.max - priceLimits.min);
  const start = ((minPrice - priceLimits.min) / priceSpan) * 100;
  const end = ((effectiveMaxPrice - priceLimits.min) / priceSpan) * 100;

  return <main className="catalog-page">
    <CatalogCarousel slides={catalogSlides.length ? catalogSlides : [banner]} />
    <div className="catalog-layout">
      <aside className="filters">
        <h2><SlidersHorizontal size={19} /> Filtrar</h2>
        <label>Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {filters.filter((filter) => filter.options.length > 0).map((filter) => <label key={filter.id}>{filter.name}<select value={selectedFilters[filter.slug] ?? ""} onChange={(event) => setSelectedFilters((current) => ({ ...current, [filter.slug]: event.target.value }))}>
          <option value="">Todos</option>
          {filter.options.map((option) => <option key={option.id} value={option.slug}>{option.label}</option>)}
        </select></label>)}
        <section className="price-filter">
          <strong>Preço</strong>
          <div className="price-scale"><span>{priceLimits.min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span><span>{priceLimits.max.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
          <div className="dual-range" style={{ "--range-start": `${start}%`, "--range-end": `${end}%` } as React.CSSProperties}>
            <div />
            <input aria-label="Preço mínimo" type="range" min={priceLimits.min} max={priceLimits.max} value={minPrice} onChange={(event) => setMinPrice(Math.min(Number(event.target.value), effectiveMaxPrice))} />
            <input aria-label="Preço máximo" type="range" min={priceLimits.min} max={priceLimits.max} value={effectiveMaxPrice} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))} />
          </div>
          <div className="price-inputs">
            <label><span>Mínimo</span><input type="number" min={priceLimits.min} max={effectiveMaxPrice} value={minPrice} onChange={(event) => setMinPrice(Math.min(Number(event.target.value), effectiveMaxPrice))} /></label>
            <label><span>Máximo</span><input type="number" min={minPrice} max={priceLimits.max} value={effectiveMaxPrice} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))} /></label>
          </div>
        </section>
        <label>Condição<select value={condition} onChange={(event) => setCondition(event.target.value)}>{conditions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="text-button" onClick={clearFilters}>Limpar filtros</button>
      </aside>
      <section className="catalog-results">
        <div className="results-bar"><span>{filtered.length} produtos encontrados</span><label>Ordenar <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevância</option><option value="low">Menor preço</option><option value="high">Maior preço</option></select></label></div>
        {filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>Nenhum produto encontrado</h2><p>Tente remover algum filtro.</p></div>}
      </section>
    </div>
  </main>;
}

export default function CatalogPage() {
  return <Suspense fallback={<main className="catalog-page"><div className="empty-state"><h2>Carregando catálogo...</h2></div></main>}><CatalogContent /></Suspense>;
}

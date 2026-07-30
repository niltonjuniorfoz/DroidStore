"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../../src/components/ProductCard";
import {
  getBaseModelName,
  getCatalogSection,
  groupCatalogProducts,
  products,
  type CatalogProduct,
  type CatalogSection,
} from "../../src/lib/catalog";
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
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState<CatalogSection>("Novos");
  const [sort, setSort] = useState("relevance");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileFilterBarVisible, setMobileFilterBarVisible] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/products").then((response) => response.json()),
      fetch("/api/catalog-filters").then((response) => response.json()),
      fetch("/api/site-content").then((response) => response.json()),
    ]).then(([catalogData, filterData, siteData]: [CatalogProduct[], PublicFilter[], { content?: { catalogBanner?: Partial<CatalogBanner>; catalogSlides?: CatalogSlide[] } }]) => {
      setCatalog(catalogData);
      const defaultFilters: PublicFilter[] = [
        { id: "filter-marca", name: "Marca", slug: "marca", options: [] },
        { id: "filter-tipo-de-produto", name: "Categoria", slug: "tipo-de-produto", options: [] },
      ];
      const mergedFilters = Array.isArray(filterData) ? [...filterData] : [];
      if (!mergedFilters.some((f) => f.slug === "marca")) {
        mergedFilters.unshift(defaultFilters[0]);
      }
      if (!mergedFilters.some((f) => f.slug === "tipo-de-produto" || f.slug === "categoria")) {
        mergedFilters.splice(1, 0, defaultFilters[1]);
      }
      setFilters(mergedFilters);
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
    const requestedCondition = searchParams.get("condition");
    const requestedSection: CatalogSection =
      requestedCondition === "Seminovos" ||
      requestedCondition === "Excelente" ||
      requestedCondition === "Muito Bom" ||
      requestedCondition === "Bom" ||
      requestedCondition === "Outlet"
        ? "Seminovos"
        : "Novos";
    setCondition(requestedSection);
    setSelectedModel(searchParams.get("model") ?? "");
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

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setMobileFilterBarVisible(!entry.isIntersecting);
    }, {
      threshold: 0,
      rootMargin: "0px 0px 112px 0px",
    });

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileFiltersOpen]);

  const priceLimits = useMemo(() => {
    const values = catalog.map((product) => product.price).filter(Number.isFinite);
    return {
      min: values.length ? Math.floor(Math.min(...values)) : 0,
      max: values.length ? Math.ceil(Math.max(...values)) : 0,
    };
  }, [catalog]);

  const effectiveMaxPrice = maxPrice || priceLimits.max;
  const conditions: CatalogSection[] = ["Novos", "Seminovos"];

  // Extrai dinamicamente as opções de filtro (ex: Marca, Categoria) garantindo que TODAS as marcas e categorias do catálogo apareçam
  const getAvailableOptionsForFilter = (filterGroupSlug: string) => {
    const relevantProducts = catalog.filter((product) => {
      if (getCatalogSection(product.condition) !== condition) return false;
      return Object.entries(selectedFilters).every(([gSlug, oSlug]) => {
        if (!oSlug || gSlug === filterGroupSlug) return true;
        if (gSlug === "marca") {
          return product.brand.toLowerCase() === oSlug.toLowerCase() ||
                 product.filters?.some((f) => f.groupSlug === "marca" && f.optionSlug.toLowerCase() === oSlug.toLowerCase());
        }
        return product.filters?.some((f) => f.groupSlug === gSlug && f.optionSlug.toLowerCase() === oSlug.toLowerCase());
      });
    });

    if (filterGroupSlug === "marca") {
      const allBrands = Array.from(new Set(relevantProducts.map((p) => p.brand).filter(Boolean)));
      const filterObj = filters.find((f) => f.slug === "marca");
      const dbBrands = filterObj?.options.map((o) => o.label) ?? [];
      const combined = Array.from(new Set([...allBrands, ...dbBrands].map((b) => b.trim()))).sort((a, b) => a.localeCompare(b, "pt-BR"));
      
      const seenSlugs = new Set<string>();
      const result: Array<{ id: string; label: string; slug: string }> = [];
      for (const b of combined) {
        const s = b.toLowerCase();
        if (!seenSlugs.has(s)) {
          seenSlugs.add(s);
          result.push({
            id: `brand-${s}`,
            label: b,
            slug: s,
          });
        }
      }
      return result;
    }


    if (filterGroupSlug === "tipo-de-produto" || filterGroupSlug === "categoria") {
      const allCats = Array.from(new Set(relevantProducts.map((p) => {
        const isNotebook = p.brand.toLowerCase() === "acer" || p.name.toLowerCase().includes("notebook") || p.name.toLowerCase().includes("macbook") || p.name.toLowerCase().includes("aspire") || p.name.toLowerCase().includes("nitro");
        return isNotebook ? "Notebooks" : "Smartphones";
      })));
      const filterObj = filters.find((f) => f.slug === "tipo-de-produto" || f.slug === "categoria");
      const dbCats = filterObj?.options.map((o) => o.label) ?? [];
      const combined = Array.from(new Set([...allCats, ...dbCats])).sort((a, b) => a.localeCompare(b, "pt-BR"));
      return combined.map((c) => ({
        id: `type-${c.toLowerCase()}`,
        label: c,
        slug: c.toLowerCase() === "notebooks" ? "notebooks" : "smartphones",
      }));
    }

    const filterObj = filters.find((f) => f.slug === filterGroupSlug);
    if (!filterObj) return [];

    return filterObj.options.filter((option) =>
      relevantProducts.some((p) => p.filters?.some((f) => f.groupSlug === filterGroupSlug && f.optionSlug.toLowerCase() === option.slug.toLowerCase()))
    );
  };


  // Extrai dinamicamente todos os modelos da família para a Marca e Categoria selecionadas
  const availableModels = useMemo(() => {
    const relevantProducts = catalog.filter((product) => {
      if (getCatalogSection(product.condition) !== condition) return false;
      const selectedBrandSlug = selectedFilters["marca"];
      const matchesBrand = !selectedBrandSlug ||
        product.brand.toLowerCase() === selectedBrandSlug.toLowerCase() ||
        product.filters?.some((f) => f.groupSlug === "marca" && f.optionSlug.toLowerCase() === selectedBrandSlug.toLowerCase());

      const selectedCategorySlug = selectedFilters["tipo-de-produto"];
      const matchesCategory = !selectedCategorySlug ||
        product.filters?.some((f) => f.groupSlug === "tipo-de-produto" && f.optionSlug.toLowerCase() === selectedCategorySlug.toLowerCase());

      return matchesBrand && matchesCategory;
    });

    const models = Array.from(new Set(relevantProducts.map((p) => getBaseModelName(p.name)).filter(Boolean)));
    return models.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [catalog, condition, selectedFilters]);

  const filtered = useMemo(() => {
    const list = catalog.filter((product) => {
      const matchesCustomFilters = Object.entries(selectedFilters).every(([groupSlug, optionSlug]) => {
        if (!optionSlug) return true;
        if (groupSlug === "marca") {
          return product.brand.toLowerCase() === optionSlug.toLowerCase() ||
                 product.filters?.some((f) => f.groupSlug === "marca" && f.optionSlug.toLowerCase() === optionSlug.toLowerCase());
        }
        return product.filters?.some((filter) => filter.groupSlug === groupSlug && filter.optionSlug.toLowerCase() === optionSlug.toLowerCase());
      });

      const matchesModel = !selectedModel ||
        getBaseModelName(product.name).toLowerCase() === selectedModel.toLowerCase() ||
        product.name.toLowerCase().includes(selectedModel.toLowerCase());

      return matchesCustomFilters &&
        matchesModel &&
        getCatalogSection(product.condition) === condition &&
        product.price >= minPrice &&
        product.price <= effectiveMaxPrice &&
        `${product.brand} ${product.name} ${product.filters?.map((filter) => filter.optionLabel).join(" ") ?? ""}`
          .toLowerCase().includes(query.toLowerCase());
    });
    const grouped = groupCatalogProducts(list);
    return grouped.sort((a, b) => sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : b.stock - a.stock);
  }, [catalog, condition, effectiveMaxPrice, minPrice, query, selectedFilters, selectedModel, sort]);

  function clearFilters() {
    setQuery("");
    setCondition("Novos");
    setSelectedFilters({});
    setSelectedModel("");
    setMinPrice(priceLimits.min);
    setMaxPrice(priceLimits.max);
  }

  const priceSpan = Math.max(1, priceLimits.max - priceLimits.min);
  const start = ((minPrice - priceLimits.min) / priceSpan) * 100;
  const end = ((effectiveMaxPrice - priceLimits.min) / priceSpan) * 100;
  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (condition !== "Novos" ? 1 : 0) +
    (selectedModel ? 1 : 0) +
    Object.values(selectedFilters).filter(Boolean).length +
    (minPrice > priceLimits.min || effectiveMaxPrice < priceLimits.max ? 1 : 0);

  function filterFields() {
    return <div className="catalog-filter-fields">
      <label className="catalog-filter-field">
        <span>Buscar</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome, marca ou modelo"
        />
      </label>

      {filters.map((filter) => {
        const availableOptions = getAvailableOptionsForFilter(filter.slug);
        const currentOptions = availableOptions.length > 0 ? availableOptions : filter.options;

        return (
          <label className="catalog-filter-field" key={filter.id}>
            <span>{filter.name}</span>
            <select
              value={selectedFilters[filter.slug] ?? ""}
              onChange={(event) => {
                const val = event.target.value;
                setSelectedFilters((current) => {
                  const next = { ...current, [filter.slug]: val };
                  if (filter.slug === "marca" && val) {
                    // Validar se a categoria atualmente selecionada é compatível com a nova marca
                    const catSlug = next["tipo-de-produto"];
                    if (catSlug) {
                      const validOptions = getAvailableOptionsForFilter("tipo-de-produto");
                      if (!validOptions.some((opt) => opt.slug.toLowerCase() === catSlug.toLowerCase())) {
                        delete next["tipo-de-produto"];
                      }
                    }
                  }
                  return next;
                });
                setSelectedModel(""); // Resetar modelo ao alterar marca ou categoria
              }}
            >
              <option value="">Todos</option>
              {currentOptions.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      {/* 3º BOX DEDICADO: MODELO (GENÉRICO PARA QUALQUER CATEGORIA/MARCA) */}
      <label className="catalog-filter-field">
        <span>Modelo</span>
        {(!selectedFilters["marca"] && !selectedFilters["tipo-de-produto"]) ? (
          <div style={{ minHeight: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'transparent' }} />
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '8px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            maxHeight: '180px',
            overflowY: 'auto',
            backgroundColor: '#ffffff'
          }}>
            {availableModels.length > 0 ? (
              availableModels.map((modelName) => (
                <button
                  key={modelName}
                  type="button"
                  onClick={(e) => { e.preventDefault(); setSelectedModel(selectedModel === modelName ? "" : modelName); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    border: '1px solid',
                    borderColor: selectedModel === modelName ? '#FF7900' : '#e2e8f0',
                    backgroundColor: selectedModel === modelName ? '#FFF1E5' : '#f8fafc',
                    color: selectedModel === modelName ? '#FF7900' : '#334155',
                    cursor: 'pointer',
                    fontWeight: selectedModel === modelName ? '600' : '500',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                >
                  {modelName}
                </button>
              ))
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#64748b', padding: '4px' }}>Nenhum modelo...</span>
            )}
          </div>
        )}
      </label>



      <section className="price-filter">
        <strong>Preço</strong>
        <div className="price-scale">
          <span>{priceLimits.min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <span>{priceLimits.max.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
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

      <label className="catalog-filter-field">
        <span>Condição</span>
        <select value={condition} onChange={(event) => setCondition(event.target.value as CatalogSection)}>
          {conditions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>;
  }

  return <main className="catalog-page">
    <CatalogCarousel slides={catalogSlides.length ? catalogSlides : [banner]} />
    <div className="catalog-layout">
      <aside className="filters desktop-catalog-filters">
        <h2><SlidersHorizontal size={19} /> Filtrar</h2>
        {filterFields()}
        <button className="text-button" onClick={clearFilters}>Limpar filtros</button>
      </aside>

      <section className="catalog-results">
        <div className="results-bar">
          <span>{filtered.length} modelos encontrados</span>
          <label>Ordenar <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevância</option><option value="low">Menor preço</option><option value="high">Maior preço</option></select></label>
        </div>
        {filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>Nenhum produto encontrado</h2><p>Tente remover algum filtro.</p></div>}
      </section>
    </div>

    <div className={`mobile-catalog-filter-bar ${mobileFilterBarVisible ? "" : "is-hidden"}`} aria-label="Ações dos filtros" aria-hidden={!mobileFilterBarVisible}>
      <button type="button" className="mobile-filter-open" onClick={() => setMobileFiltersOpen(true)}>
        <SlidersHorizontal aria-hidden="true" />
        <span>Filtros</span>
        {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
      </button>
      <span className="mobile-filter-result-count">{filtered.length} modelos</span>
      <button type="button" className="mobile-filter-clear" onClick={clearFilters} disabled={activeFilterCount === 0}>Limpar</button>
    </div>

    {mobileFiltersOpen && <>
      <button className="mobile-filter-backdrop" type="button" aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)} />
      <section className="mobile-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
        <header>
          <div>
            <SlidersHorizontal aria-hidden="true" />
            <div><strong id="mobile-filter-title">Filtrar produtos</strong><small>{filtered.length} resultados encontrados</small></div>
          </div>
          <button type="button" aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)}><X /></button>
        </header>
        <div className="mobile-filter-sheet-content">{filterFields()}</div>
        <footer>
          <button type="button" className="mobile-sheet-clear" onClick={clearFilters} disabled={activeFilterCount === 0}>Limpar</button>
          <button type="button" className="mobile-sheet-apply" onClick={() => setMobileFiltersOpen(false)}>Ver {filtered.length} modelos</button>
        </footer>
      </section>
    </>}
  </main>;
}

export default function CatalogPage() {
  return <Suspense fallback={<main className="catalog-page"><div className="empty-state"><h2>Carregando catálogo...</h2></div></main>}><CatalogContent /></Suspense>;
}

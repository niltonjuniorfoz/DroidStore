"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../../src/components/ProductCard";
import { useSiteContent } from "../../src/components/SiteContentProvider";
import {
  getBaseModelName,
  getCatalogSection,
  groupCatalogProducts,
  products,
  type CatalogProduct,
  type CatalogSection,
} from "../../src/lib/catalog";
import CatalogCarousel, { type CatalogSlide } from "../../src/components/CatalogCarousel";
import {
  isCategoryFilterSlug,
  matchesCategory,
  readFilterRequest,
  resolveFilterOptionSlug,
} from "../../src/lib/catalogRouting";

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

type CatalogPageProps = {
  initialCatalog?: CatalogProduct[];
  initialFilters?: PublicFilter[];
};

// Garante Marca e Categoria mesmo quando o banco ainda não tem esses filtros.
function mergeDefaultFilters(filterData: PublicFilter[]): PublicFilter[] {
  const merged = Array.isArray(filterData) ? [...filterData] : [];
  if (!merged.some((f) => f.slug === "marca")) {
    merged.unshift({ id: "filter-marca", name: "Marca", slug: "marca", options: [] });
  }
  if (!merged.some((f) => f.slug === "tipo-de-produto" || f.slug === "categoria")) {
    merged.splice(1, 0, { id: "filter-tipo-de-produto", name: "Categoria", slug: "tipo-de-produto", options: [] });
  }
  return merged;
}

function storageSortValue(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1].replace(",", "."));
  const unit = match[2].toUpperCase();
  if (unit === "TB") return amount * 1024 * 1024;
  if (unit === "GB") return amount * 1024;
  return amount;
}

function CatalogContent({ initialCatalog, initialFilters }: CatalogPageProps) {
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const scopedCategory = (
    searchParams.get("categoria")
    ?? searchParams.get("category")
    ?? searchParams.get("cat")
    ?? ""
  ).trim();
  const { content } = useSiteContent();
  const [catalog, setCatalog] = useState<CatalogProduct[]>(initialCatalog?.length ? initialCatalog : products);
  const [filters, setFilters] = useState<PublicFilter[]>(() => initialFilters ? mergeDefaultFilters(initialFilters) : []);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState<CatalogSection>("Novos");
  const [exactCondition, setExactCondition] = useState<CatalogProduct["condition"] | "">("");
  const [sort, setSort] = useState("relevance");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileFilterBarVisible, setMobileFilterBarVisible] = useState(true);

  useEffect(() => {
    const productEndpoint = paramsKey ? `/api/products?${paramsKey}` : "/api/products";
    void Promise.all([
      fetch(productEndpoint).then((response) => response.json()),
      fetch("/api/catalog-filters").then((response) => response.json()),
    ]).then(([catalogData, filterData]: [CatalogProduct[], PublicFilter[]]) => {
      setCatalog(catalogData);
      setFilters(mergeDefaultFilters(filterData));
      const prices = catalogData.map((product) => product.price).filter(Number.isFinite);
      setMinPrice(prices.length ? Math.floor(Math.min(...prices)) : 0);
      setMaxPrice(prices.length ? Math.ceil(Math.max(...prices)) : 0);
    }).catch(() => undefined);
  }, [paramsKey]);

  const catalogSlides = useMemo(() => {
    if (Array.isArray(content?.catalogSlides) && content.catalogSlides.length) {
      return content.catalogSlides as CatalogSlide[];
    }
    const banner = content?.catalogBanner && typeof content.catalogBanner === "object"
      ? { ...defaultBanner, ...(content.catalogBanner as Partial<CatalogBanner>) }
      : defaultBanner;
    return [banner];
  }, [content]);


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
    setExactCondition(
      requestedCondition === "Novo" || requestedCondition === "Excelente" || requestedCondition === "Muito Bom" || requestedCondition === "Bom" || requestedCondition === "Outlet"
        ? requestedCondition
        : "",
    );
    setSelectedStorage(searchParams.get("storage") ?? "");
    const catalogPrices = catalog.map((product) => product.price).filter(Number.isFinite);
    const catalogMin = catalogPrices.length ? Math.floor(Math.min(...catalogPrices)) : 0;
    const catalogMax = catalogPrices.length ? Math.ceil(Math.max(...catalogPrices)) : 0;
    const requestedMin = Number(searchParams.get("minPrice"));
    const requestedMax = Number(searchParams.get("maxPrice"));
    setMinPrice(Number.isFinite(requestedMin) && requestedMin >= 0 ? requestedMin : catalogMin);
    setMaxPrice(Number.isFinite(requestedMax) && requestedMax > 0 ? Math.min(requestedMax, catalogMax || requestedMax) : catalogMax);
    const initialSelections: Record<string, string> = {};
    for (const filter of filters) {
      if (scopedCategory && isCategoryFilterSlug(filter.slug)) continue;
      const requested = readFilterRequest(searchParams, filter.slug);
      if (!requested) continue;
      const optionSlug = resolveFilterOptionSlug(requested, filter.options);
      if (optionSlug) initialSelections[filter.slug] = optionSlug;
    }
    setSelectedFilters(initialSelections);
  }, [catalog, filters, paramsKey, scopedCategory, searchParams]);

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
        if (isCategoryFilterSlug(gSlug)) {
          return matchesCategory(
            (product.filters ?? []).filter((f) => isCategoryFilterSlug(f.groupSlug)).map((f) => f.optionSlug),
            oSlug,
          );
        }
        return product.filters?.some((f) => f.groupSlug === gSlug && f.optionSlug.toLowerCase() === oSlug.toLowerCase());
      });
    });    if (filterGroupSlug === "marca") {
      const allBrands = Array.from(new Set(
        relevantProducts.map((product) => product.brand.trim()).filter(Boolean),
      )).sort((a, b) => a.localeCompare(b, "pt-BR"));

      return allBrands.map((brand) => ({
        id: `brand-${brand.toLocaleLowerCase("pt-BR")}`,
        label: brand,
        slug: brand.toLocaleLowerCase("pt-BR"),
      }));
    }


    if (filterGroupSlug === "tipo-de-produto" || filterGroupSlug === "categoria") {
      const productOptions = relevantProducts.flatMap((product) => (product.filters ?? [])
        .filter((item) => isCategoryFilterSlug(item.groupSlug))
        .map((item) => ({ id: item.optionId, label: item.optionLabel, slug: item.optionSlug })));
      const unique = new Map(productOptions.map((option) => [option.slug.toLowerCase(), option]));
      const virtualOptions = [
        { id: "virtual-smartphones", label: "Smartphones", slug: "smartphones" },
        { id: "virtual-informatica", label: "Informática", slug: "informatica" },
        { id: "virtual-eletronicos", label: "Eletrônicos", slug: "eletronicos" },
        { id: "virtual-acessorios", label: "Acessórios", slug: "acessorios" },
        { id: "virtual-games", label: "Games", slug: "games" },
        { id: "virtual-tv-audio", label: "TV e Áudio", slug: "tv-audio" },
      ];

      for (const option of virtualOptions) {
        const exists = relevantProducts.some((product) => matchesCategory(
          (product.filters ?? []).filter((item) => isCategoryFilterSlug(item.groupSlug)).map((item) => item.optionSlug),
          option.slug,
        ));
        if (exists) unique.set(option.slug, option);
      }

      return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    }

    const filterObj = filters.find((f) => f.slug === filterGroupSlug);
    if (!filterObj) return [];

    return filterObj.options.filter((option) =>
      relevantProducts.some((p) => p.filters?.some((f) => f.groupSlug === filterGroupSlug && f.optionSlug.toLowerCase() === option.slug.toLowerCase()))
    );
  };


  const availableStorages = useMemo(() => {
    const relevantProducts = catalog.filter((product) => {
      if (getCatalogSection(product.condition) !== condition) return false;
      if (exactCondition && product.condition !== exactCondition) return false;

      return Object.entries(selectedFilters).every(([groupSlug, optionSlug]) => {
        if (!optionSlug) return true;
        if (groupSlug === "marca") {
          return product.brand.toLowerCase() === optionSlug.toLowerCase() ||
            product.filters?.some((filter) => filter.groupSlug === "marca" && filter.optionSlug.toLowerCase() === optionSlug.toLowerCase());
        }
        if (isCategoryFilterSlug(groupSlug)) {
          return matchesCategory(
            (product.filters ?? []).filter((filter) => isCategoryFilterSlug(filter.groupSlug)).map((filter) => filter.optionSlug),
            optionSlug,
          );
        }
        return product.filters?.some((filter) => filter.groupSlug === groupSlug && filter.optionSlug.toLowerCase() === optionSlug.toLowerCase());
      });
    });

    const values = relevantProducts.flatMap((product) =>
      product.availableStorages?.length ? product.availableStorages : [product.storage],
    );

    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
      .sort((a, b) => storageSortValue(a) - storageSortValue(b) || a.localeCompare(b, "pt-BR"));
  }, [catalog, condition, exactCondition, selectedFilters]);

  const selectedCategory = Object.entries(selectedFilters)
    .find(([slug, value]) => Boolean(value) && isCategoryFilterSlug(slug))?.[1] ?? "";
  const showStorageFilter = Boolean(scopedCategory || selectedCategory);
  const visibleFilters = filters.filter((filter) =>
    filter.slug === "marca" || (!scopedCategory && isCategoryFilterSlug(filter.slug)),
  );

  const filtered = useMemo(() => {
    const list = catalog.filter((product) => {
      const matchesCustomFilters = Object.entries(selectedFilters).every(([groupSlug, optionSlug]) => {
        if (!optionSlug) return true;
        if (groupSlug === "marca") {
          return product.brand.toLowerCase() === optionSlug.toLowerCase() ||
                 product.filters?.some((f) => f.groupSlug === "marca" && f.optionSlug.toLowerCase() === optionSlug.toLowerCase());
        }
        if (isCategoryFilterSlug(groupSlug)) {
          return matchesCategory((product.filters ?? []).filter((filter) => isCategoryFilterSlug(filter.groupSlug)).map((filter) => filter.optionSlug), optionSlug);
        }
        return product.filters?.some((filter) => filter.groupSlug === groupSlug && filter.optionSlug.toLowerCase() === optionSlug.toLowerCase());
      });

      const productStorages = product.availableStorages?.length ? product.availableStorages : [product.storage];
      const matchesStorage = !selectedStorage ||
        productStorages.some((value) => value.toLowerCase() === selectedStorage.toLowerCase());

      return matchesCustomFilters &&
        matchesStorage &&
        getCatalogSection(product.condition) === condition &&
        (!exactCondition || product.condition === exactCondition) &&
        product.price >= minPrice &&
        product.price <= effectiveMaxPrice &&
        `${product.brand} ${product.name} ${product.filters?.map((filter) => filter.optionLabel).join(" ") ?? ""}`
          .toLowerCase().includes(query.toLowerCase());
    });
    const grouped = groupCatalogProducts(list);
    return grouped.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : b.stock - a.stock;
    });
  }, [catalog, condition, effectiveMaxPrice, exactCondition, minPrice, query, selectedFilters, selectedStorage, sort]);

  function clearFilters() {
    setQuery("");
    setCondition("Novos");
    setExactCondition("");
    setSelectedFilters({});
    setSelectedStorage("");
    setMinPrice(priceLimits.min);
    setMaxPrice(priceLimits.max);
  }

  const priceSpan = Math.max(1, priceLimits.max - priceLimits.min);
  const start = ((minPrice - priceLimits.min) / priceSpan) * 100;
  const end = ((effectiveMaxPrice - priceLimits.min) / priceSpan) * 100;
  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (condition !== "Novos" ? 1 : 0) +
    (selectedStorage ? 1 : 0) +
    Object.values(selectedFilters).filter(Boolean).length +
    (minPrice > priceLimits.min || effectiveMaxPrice < priceLimits.max ? 1 : 0);

  function filterFields() {
    return <div className="catalog-filter-fields">
      <label className="catalog-filter-field">
        <span>Buscar</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome ou marca"
        />
      </label>

      {visibleFilters.map((filter) => {
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
                    const categoryFilter = filters.find((item) => isCategoryFilterSlug(item.slug));
                    const categoryKey = categoryFilter?.slug;
                    const catSlug = categoryKey ? next[categoryKey] : undefined;
                    if (catSlug) {
                      const validOptions = getAvailableOptionsForFilter(categoryKey!);
                      if (!validOptions.some((opt) => opt.slug.toLowerCase() === catSlug.toLowerCase())) {
                        delete next[categoryKey!];
                      }
                    }
                  }
                  return next;
                });
                if (filter.slug === "marca" || isCategoryFilterSlug(filter.slug)) setSelectedStorage("");
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

      {showStorageFilter && availableStorages.length > 0 && (
        <label className="catalog-filter-field">
          <span>Armazenamento</span>
          <select value={selectedStorage} onChange={(event) => setSelectedStorage(event.target.value)}>
            <option value="">Todos</option>
            {availableStorages.map((storage) => (
              <option key={storage} value={storage}>{storage}</option>
            ))}
          </select>
        </label>
      )}



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
        <select value={condition} onChange={(event) => { setCondition(event.target.value as CatalogSection); setExactCondition(""); }}>
          {conditions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>;
  }

  return <main className="catalog-page">
    <CatalogCarousel slides={catalogSlides} />
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

export default function CatalogPageClient({ initialCatalog, initialFilters }: CatalogPageProps) {
  return <Suspense fallback={<main className="catalog-page"><div className="empty-state"><h2>Carregando catálogo...</h2></div></main>}><CatalogContent initialCatalog={initialCatalog} initialFilters={initialFilters} /></Suspense>;
}

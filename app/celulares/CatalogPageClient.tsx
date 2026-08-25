"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../../src/components/ProductCard";
import CatalogCarousel, { type CatalogSlide } from "../../src/components/CatalogCarousel";
import { useSiteContent } from "../../src/components/SiteContentProvider";
import type { CatalogSection } from "../../src/lib/catalog";
import type { CatalogPageResult, CatalogSort } from "../../src/lib/catalogPagination";

type CatalogBanner = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
};

const defaultBanner: CatalogBanner = {
  eyebrow: "Catálogo completo",
  title: "Produtos",
  description: "Encontre o produto ideal usando os filtros da loja.",
  imageUrl: "",
};

type CatalogPageProps = {
  initialPage: CatalogPageResult;
};

function sectionFromCondition(value: string | null): CatalogSection {
  return value === "Seminovos"
    || value === "Excelente"
    || value === "Muito Bom"
    || value === "Bom"
    || value === "Outlet"
      ? "Seminovos"
      : "Novos";
}

function exactCondition(value: string | null) {
  return value === "Novo"
    || value === "Novo Reembalado"
    || value === "Excelente"
    || value === "Muito Bom"
    || value === "Bom"
    || value === "Outlet"
      ? value
      : "";
}

function validNumber(value: string | null) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function CatalogContent({ initialPage }: CatalogPageProps) {
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const { content } = useSiteContent();

  const scopedCategory = (
    searchParams.get("categoria")
    ?? searchParams.get("category")
    ?? searchParams.get("cat")
    ?? ""
  ).trim();

  const initialCondition = searchParams.get("condition");
  const initialMin = validNumber(searchParams.get("minPrice"));
  const initialMax = validNumber(searchParams.get("maxPrice"));
  const initialSort = searchParams.get("sort");

  const [data, setData] = useState<CatalogPageResult>(initialPage);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [brand, setBrand] = useState(searchParams.get("brand") ?? "");
  const [category, setCategory] = useState(scopedCategory ? "" : scopedCategory);
  const [storage, setStorage] = useState(searchParams.get("storage") ?? "");
  const [section, setSection] = useState<CatalogSection>(sectionFromCondition(initialCondition));
  const [specificCondition, setSpecificCondition] = useState(exactCondition(initialCondition));
  const [sort, setSort] = useState<CatalogSort>(
    initialSort === "low" || initialSort === "high" ? initialSort : "relevance",
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? initialPage.page) || 1));
  const [pageSize, setPageSize] = useState([30, 60, 90].includes(Number(searchParams.get("pageSize")))
    ? Number(searchParams.get("pageSize"))
    : initialPage.pageSize);
  const [minPrice, setMinPrice] = useState(initialMin ?? initialPage.facets.price.min);
  const [maxPrice, setMaxPrice] = useState(initialMax ?? initialPage.facets.price.max);
  const [priceTouched, setPriceTouched] = useState(initialMin !== undefined || initialMax !== undefined);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileFilterBarVisible, setMobileFilterBarVisible] = useState(true);

  const effectiveCategory = scopedCategory || category;

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
    setData(initialPage);
    setQuery(searchParams.get("q") ?? "");
    setBrand(searchParams.get("brand") ?? "");
    setStorage(searchParams.get("storage") ?? "");

    const nextCondition = searchParams.get("condition");
    setSection(sectionFromCondition(nextCondition));
    setSpecificCondition(exactCondition(nextCondition));

    const nextSort = searchParams.get("sort");
    setSort(nextSort === "low" || nextSort === "high" ? nextSort : "relevance");
    setPage(Math.max(1, Number(searchParams.get("page") ?? 1) || 1));
    const nextPageSize = Number(searchParams.get("pageSize"));
    setPageSize([30, 60, 90].includes(nextPageSize) ? nextPageSize : initialPage.pageSize);

    const nextMin = validNumber(searchParams.get("minPrice"));
    const nextMax = validNumber(searchParams.get("maxPrice"));
    const touched = nextMin !== undefined || nextMax !== undefined;
    setPriceTouched(touched);
    setMinPrice(nextMin ?? initialPage.facets.price.min);
    setMaxPrice(nextMax ?? initialPage.facets.price.max);
  }, [initialPage, paramsKey]);

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

  const requestKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("section", section);
    params.set("sort", sort);
    if (query.trim()) params.set("q", query.trim());
    if (brand) params.set("brand", brand);
    if (effectiveCategory) params.set("categoria", effectiveCategory);
    if (storage) params.set("storage", storage);
    if (specificCondition) params.set("condition", specificCondition);
    if (priceTouched) {
      params.set("minPrice", String(minPrice));
      params.set("maxPrice", String(maxPrice));
    }
    return params.toString();
  }, [
    brand,
    effectiveCategory,
    maxPrice,
    minPrice,
    page,
    pageSize,
    priceTouched,
    query,
    section,
    sort,
    specificCondition,
    storage,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`/api/catalog?${requestKey}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar o catálogo.");

        const next = body as CatalogPageResult;
        setData(next);

        if (!priceTouched) {
          setMinPrice(next.facets.price.min);
          setMaxPrice(next.facets.price.max);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Não foi possível atualizar o catálogo.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [priceTouched, requestKey]);

  const products = data.products;

  const priceLimits = data.facets.price;
  const effectiveMaxPrice = maxPrice || priceLimits.max;
  const priceSpan = Math.max(1, priceLimits.max - priceLimits.min);
  const start = Math.max(0, Math.min(100, ((minPrice - priceLimits.min) / priceSpan) * 100));
  const end = Math.max(0, Math.min(100, ((effectiveMaxPrice - priceLimits.min) / priceSpan) * 100));

  const activeFilterCount =
    (query.trim() ? 1 : 0)
    + (brand ? 1 : 0)
    + (!scopedCategory && category ? 1 : 0)
    + (storage ? 1 : 0)
    + (section !== "Novos" || specificCondition ? 1 : 0)
    + (priceTouched ? 1 : 0);

  function resetContextualFilters() {
    setStorage("");
    setPriceTouched(false);
    setMinPrice(data.facets.price.min);
    setMaxPrice(data.facets.price.max);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setBrand("");
    setCategory("");
    setStorage("");
    setSection("Novos");
    setSpecificCondition("");
    setSort("relevance");
    setPriceTouched(false);
    setMinPrice(data.facets.price.min);
    setMaxPrice(data.facets.price.max);
    setPage(1);
  }

  function goToPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), data.pages);
    if (target === page) return;
    setPage(target);
    window.requestAnimationFrame(() => {
      document.querySelector(".catalog-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const pageNumbers = useMemo(() => {
    if (data.pages <= 1) return [];
    const from = Math.max(1, data.page - 2);
    const to = Math.min(data.pages, from + 4);
    const adjustedFrom = Math.max(1, to - 4);
    return Array.from({ length: to - adjustedFrom + 1 }, (_, index) => adjustedFrom + index);
  }, [data.page, data.pages]);

  function filterFields() {
    return <div className="catalog-filter-fields">
      <label className="catalog-filter-field">
        <span>Buscar</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Nome, marca ou SKU"
        />
      </label>

      <label className="catalog-filter-field">
        <span>Marca</span>
        <select
          value={brand}
          onChange={(event) => {
            setBrand(event.target.value);
            resetContextualFilters();
          }}
        >
          <option value="">Todos</option>
          {data.facets.brands.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      {!scopedCategory && (
        <label className="catalog-filter-field">
          <span>Categoria</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              resetContextualFilters();
            }}
          >
            <option value="">Todos</option>
            {data.facets.categories.map((option) => (
              <option key={option.id} value={option.slug}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      {(effectiveCategory || brand) && data.facets.storages.length > 0 && (
        <label className="catalog-filter-field">
          <span>Armazenamento</span>
          <select
            value={storage}
            onChange={(event) => {
              setStorage(event.target.value);
              setPage(1);
              setPriceTouched(false);
            }}
          >
            <option value="">Todos</option>
            {data.facets.storages.map((item) => (
              <option key={item} value={item}>{item}</option>
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
        <div
          className="dual-range"
          style={{ "--range-start": `${start}%`, "--range-end": `${end}%` } as React.CSSProperties}
        >
          <div />
          <input
            aria-label="Preço mínimo"
            type="range"
            min={priceLimits.min}
            max={Math.max(priceLimits.min, priceLimits.max)}
            value={Math.min(minPrice, effectiveMaxPrice)}
            onChange={(event) => {
              setPriceTouched(true);
              setPage(1);
              setMinPrice(Math.min(Number(event.target.value), effectiveMaxPrice));
            }}
          />
          <input
            aria-label="Preço máximo"
            type="range"
            min={priceLimits.min}
            max={Math.max(priceLimits.min, priceLimits.max)}
            value={Math.max(effectiveMaxPrice, minPrice)}
            onChange={(event) => {
              setPriceTouched(true);
              setPage(1);
              setMaxPrice(Math.max(Number(event.target.value), minPrice));
            }}
          />
        </div>
        <div className="price-inputs">
          <label>
            <span>Mínimo</span>
            <input
              type="number"
              min={priceLimits.min}
              max={effectiveMaxPrice}
              value={minPrice}
              onChange={(event) => {
                setPriceTouched(true);
                setPage(1);
                setMinPrice(Math.min(Number(event.target.value), effectiveMaxPrice));
              }}
            />
          </label>
          <label>
            <span>Máximo</span>
            <input
              type="number"
              min={minPrice}
              max={priceLimits.max}
              value={effectiveMaxPrice}
              onChange={(event) => {
                setPriceTouched(true);
                setPage(1);
                setMaxPrice(Math.max(Number(event.target.value), minPrice));
              }}
            />
          </label>
        </div>
      </section>

      <label className="catalog-filter-field">
        <span>Condição</span>
        <select
          value={section}
          onChange={(event) => {
            setSection(event.target.value as CatalogSection);
            setSpecificCondition("");
            setStorage("");
            setPriceTouched(false);
            setPage(1);
          }}
        >
          <option value="Novos">Novos</option>
          <option value="Seminovos">Seminovos</option>
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

      <section className={`catalog-results ${loading ? "is-loading" : ""}`}>
        <div className="results-bar">
          <span>
            {data.total} {data.total === 1 ? "modelo encontrado" : "modelos encontrados"}
            {loading && <small className="catalog-updating">Atualizando...</small>}
          </span>
          <div className="catalog-results-controls">
            <label className="catalog-page-size-control">
              Exibir
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={30}>30 por página</option>
                <option value={60}>60 por página</option>
                <option value={90}>90 por página</option>
              </select>
            </label>
            <label>
              Ordenar
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as CatalogSort);
                  setPage(1);
                }}
              >
                <option value="relevance">Relevância</option>
                <option value="low">Menor preço</option>
                <option value="high">Maior preço</option>
              </select>
            </label>
          </div>
        </div>

        {loadError && <div className="catalog-request-error">{loadError}</div>}

        {products.length ? (
          <>
            <div className="product-grid">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>

            {data.pages > 1 && (
              <nav className="catalog-pagination" aria-label="Paginação do catálogo">
                <button
                  type="button"
                  disabled={data.page <= 1 || loading}
                  onClick={() => goToPage(data.page - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft />
                  <span>Anterior</span>
                </button>

                <div className="catalog-page-numbers">
                  {pageNumbers[0] && pageNumbers[0] > 1 && <span className="catalog-page-ellipsis">…</span>}
                  {pageNumbers.map((number) => (
                    <button
                      type="button"
                      key={number}
                      className={number === data.page ? "is-active" : ""}
                      onClick={() => goToPage(number)}
                      disabled={loading}
                      aria-current={number === data.page ? "page" : undefined}
                    >
                      {number}
                    </button>
                  ))}
                  {pageNumbers.at(-1) && pageNumbers.at(-1)! < data.pages && <span className="catalog-page-ellipsis">…</span>}
                </div>

                <button
                  type="button"
                  disabled={data.page >= data.pages || loading}
                  onClick={() => goToPage(data.page + 1)}
                  aria-label="Próxima página"
                >
                  <span>Próxima</span>
                  <ChevronRight />
                </button>
              </nav>
            )}

            <div className="catalog-page-summary">
              Página {data.page} de {data.pages} · até {data.pageSize} modelos por página
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h2>Nenhum produto encontrado</h2>
            <p>Tente remover algum filtro.</p>
          </div>
        )}
      </section>
    </div>

    <div
      className={`mobile-catalog-filter-bar ${mobileFilterBarVisible ? "" : "is-hidden"}`}
      aria-label="Ações dos filtros"
      aria-hidden={!mobileFilterBarVisible}
    >
      <button type="button" className="mobile-filter-open" onClick={() => setMobileFiltersOpen(true)}>
        <SlidersHorizontal aria-hidden="true" />
        <span>Filtros</span>
        {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
      </button>
      <span className="mobile-filter-result-count">{data.total} modelos</span>
      <button
        type="button"
        className="mobile-filter-clear"
        onClick={clearFilters}
        disabled={activeFilterCount === 0}
      >
        Limpar
      </button>
    </div>

    {mobileFiltersOpen && <>
      <button
        className="mobile-filter-backdrop"
        type="button"
        aria-label="Fechar filtros"
        onClick={() => setMobileFiltersOpen(false)}
      />
      <section
        className="mobile-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-filter-title"
      >
        <header>
          <div>
            <SlidersHorizontal aria-hidden="true" />
            <div>
              <strong id="mobile-filter-title">Filtrar produtos</strong>
              <small>{data.total} resultados encontrados</small>
            </div>
          </div>
          <button type="button" aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)}>
            <X />
          </button>
        </header>

        <div className="mobile-filter-sheet-content">{filterFields()}</div>

        <footer>
          <button
            type="button"
            className="mobile-sheet-clear"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
          >
            Limpar
          </button>
          <button
            type="button"
            className="mobile-sheet-apply"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Ver {data.total} modelos
          </button>
        </footer>
      </section>
    </>}
  </main>;
}

export default function CatalogPageClient({ initialPage }: CatalogPageProps) {
  return (
    <Suspense
      fallback={<main className="catalog-page"><div className="empty-state"><h2>Carregando catálogo...</h2></div></main>}
    >
      <CatalogContent initialPage={initialPage} />
    </Suspense>
  );
}

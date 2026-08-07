"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Layout,
  Layers,
  ListFilter,
  Link2,
  Menu,
  PackageSearch,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Tv,
} from "lucide-react";
import type { HeroSlide } from "../../../src/components/HeroCarousel";
import {
  DEFAULT_HOME_FEATURED_TITLE,
  DEFAULT_HOME_FOOTER_BANNER,
  DEFAULT_HOME_PRODUCT_SECTIONS,
  DEFAULT_HOME_PROMO_BANNERS,
  type HomeFooterBanner,
  type HomeProductSection,
  type HomePromoBanner,
} from "../../../src/lib/homeContent";
import { uploadAdminFile } from "../../../src/lib/uploadClient";

type MenuItem = { id?: string; label: string; href: string; active: boolean };
type MenuDestinationType = "all" | "category" | "brand" | "condition" | "filter" | "page" | "custom";
type CatalogFilterOption = { id: string; label: string; slug: string };
type CatalogFilterGroup = { id: string; name: string; slug: string; options: CatalogFilterOption[] };
type MenuCatalogProduct = {
  brand?: string;
  filters?: Array<{ groupSlug: string; optionLabel: string; optionSlug: string }>;
};
type MenuDraft = {
  label: string;
  type: MenuDestinationType;
  option: string;
  filterGroup: string;
  customHref: string;
};
type CatalogBanner = { eyebrow: string; title: string; description: string; imageUrl: string };
type Content = {
  storeName: string;
  heroSlides: HeroSlide[];
  catalogBanner: CatalogBanner;
  catalogSlides: CatalogBanner[];
  homeFeaturedTitle: string;
  homeFooterBanner: HomeFooterBanner;
  homePromoBanners: HomePromoBanner[];
  homeProductSections: HomeProductSection[];
  navigation: MenuItem[];
};

const defaultCatalogBanner = (): CatalogBanner => ({
  eyebrow: "Catálogo completo",
  title: "Produtos",
  description: "Encontre o produto ideal usando os filtros da loja.",
  imageUrl: "",
});

const blankCatalogSlide = (): CatalogBanner => ({
  eyebrow: "",
  title: "",
  description: "",
  imageUrl: "",
});

const emptyMenuDraft = (): MenuDraft => ({
  label: "",
  type: "all",
  option: "",
  filterGroup: "",
  customHref: "",
});

const conditionMenuOptions = [
  { value: "Novo", label: "Produtos novos" },
  { value: "Excelente", label: "Seminovos — excelente" },
  { value: "Muito Bom", label: "Seminovos — muito bom" },
  { value: "Bom", label: "Seminovos — bom" },
  { value: "Outlet", label: "Outlet" },
];

const pageMenuOptions = [
  { value: "/", label: "Página inicial" },
  { value: "/celulares", label: "Todos os produtos" },
  { value: "/atendimento", label: "Atendimento" },
  { value: "/conta", label: "Minha conta" },
  { value: "/conta/pedidos", label: "Meus pedidos" },
  { value: "/conta/favoritos", label: "Favoritos" },
];

function normalizeToken(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const blankSlide = (): HeroSlide => ({
  eyebrow: "LANÇAMENTO EXCLUSIVO",
  title: "Novo Aparelho",
  description: "Confira as melhores condições de pagamento e garantia.",
  imageUrl: "",
  buttonLabel: "Ver ofertas",
  buttonHref: "/celulares",
});

const initial: Content = {
  storeName: "Aura Tech",
  heroSlides: [blankSlide()],
  catalogBanner: defaultCatalogBanner(),
  catalogSlides: [blankCatalogSlide()],
  homeFeaturedTitle: DEFAULT_HOME_FEATURED_TITLE,
  homeFooterBanner: { ...DEFAULT_HOME_FOOTER_BANNER },
  homePromoBanners: DEFAULT_HOME_PROMO_BANNERS.map((banner) => ({ ...banner })),
  homeProductSections: DEFAULT_HOME_PRODUCT_SECTIONS.map((section) => ({ ...section })),
  navigation: [],
};

export default function AdminConteudo() {
  const [content, setContent] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilterGroup[]>([]);
  const [menuCatalogProducts, setMenuCatalogProducts] = useState<MenuCatalogProduct[]>([]);
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(emptyMenuDraft);
  const [menuEditingIndex, setMenuEditingIndex] = useState<number | null>(null);
  const menuBuilderRef = useRef<HTMLDivElement | null>(null);

  function changeContent(
    updater: (current: Content) => Content,
    notification = "Alteração realizada. Clique em Salvar alterações para publicar.",
  ) {
    setContent(updater);
    setMessage(notification);
  }

  function scrollToAdminMessage() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  useEffect(() => {
    fetch("/api/admin/content").then((response) => response.json()).then((data) => {
      const savedSlides = Array.isArray(data.heroSlides) && data.heroSlides.length
        ? data.heroSlides.slice(0, 5).map((s: Partial<HeroSlide>) => ({
            eyebrow: s.eyebrow ?? "",
            title: s.title ?? "",
            description: s.description ?? "",
            imageUrl: s.imageUrl ?? "",
            buttonLabel: s.buttonLabel ?? "Ver ofertas",
            buttonHref: s.buttonHref ?? "/celulares",
          }))
        : [{
          eyebrow: data.heroEyebrow ?? "",
          title: data.heroTitle ?? "",
          description: data.heroDescription ?? "",
          imageUrl: data.heroImageUrl ?? "",
          buttonLabel: "Ver ofertas",
          buttonHref: "/celulares",
        }];

      const savedCatalogSlides = Array.isArray(data.catalogSlides) && data.catalogSlides.length
        ? data.catalogSlides.slice(0, 5).map((s: Partial<CatalogBanner>) => ({
            eyebrow: s.eyebrow ?? "",
            title: s.title ?? "",
            description: s.description ?? "",
            imageUrl: s.imageUrl ?? "",
          }))
        : data.catalogBanner
          ? [{
              eyebrow: data.catalogBanner.eyebrow ?? "",
              title: data.catalogBanner.title ?? "",
              description: data.catalogBanner.description ?? "",
              imageUrl: data.catalogBanner.imageUrl ?? "",
            }]
          : [blankCatalogSlide()];

      const catalogBanner = data.catalogBanner && typeof data.catalogBanner === "object"
        ? { ...defaultCatalogBanner(), ...data.catalogBanner, imageUrl: data.catalogBanner.imageUrl ?? "" }
        : defaultCatalogBanner();

      setContent({
        storeName: data.storeName ?? "Aura Tech",
        heroSlides: savedSlides,
        catalogBanner,
        catalogSlides: savedCatalogSlides,
        homeFeaturedTitle: data.homeFeaturedTitle ?? DEFAULT_HOME_FEATURED_TITLE,
        homeFooterBanner: data.homeFooterBanner && typeof data.homeFooterBanner === "object"
          ? { ...DEFAULT_HOME_FOOTER_BANNER, ...data.homeFooterBanner }
          : { ...DEFAULT_HOME_FOOTER_BANNER },
        homePromoBanners: Array.isArray(data.homePromoBanners) && data.homePromoBanners.length === 2
          ? data.homePromoBanners
          : DEFAULT_HOME_PROMO_BANNERS.map((banner) => ({ ...banner })),
        homeProductSections: Array.isArray(data.homeProductSections) && data.homeProductSections.length === 2
          ? data.homeProductSections
          : DEFAULT_HOME_PRODUCT_SECTIONS.map((section) => ({ ...section })),
        navigation: data.navigation ?? [],
      });
    }).catch(() => setMessage("Falha de conexão ao carregar o conteúdo. Recarregue a página."));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog-filters", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
      fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
    ]).then(([filterData, productData]: [CatalogFilterGroup[], MenuCatalogProduct[]]) => {
      setCatalogFilters(Array.isArray(filterData) ? filterData : []);
      setMenuCatalogProducts(Array.isArray(productData) ? productData : []);
    }).catch(() => undefined);
  }, []);

  function updateMenu(index: number, patch: Partial<MenuItem>) {
    changeContent((current) => ({
      ...current,
      navigation: current.navigation.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function updateSlide(index: number, patch: Partial<HeroSlide>) {
    changeContent((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    }));
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.heroSlides.length) return;
    const next = [...content.heroSlides];
    [next[index], next[target]] = [next[target], next[index]];
    changeContent((current) => ({ ...current, heroSlides: next }));
  }

  function updateCatalogSlide(index: number, patch: Partial<CatalogBanner>) {
    changeContent((current) => ({
      ...current,
      catalogSlides: current.catalogSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    }));
  }

  function moveCatalogSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.catalogSlides.length) return;
    const next = [...content.catalogSlides];
    [next[index], next[target]] = [next[target], next[index]];
    changeContent((current) => ({ ...current, catalogSlides: next }));
  }

  function updateHomePromo(index: number, patch: Partial<HomePromoBanner>) {
    changeContent((current) => ({
      ...current,
      homePromoBanners: current.homePromoBanners.map((banner, position) =>
        position === index ? { ...banner, ...patch } : banner
      ),
    }));
  }

  function updateHomeSection(index: number, patch: Partial<HomeProductSection>) {
    changeContent((current) => ({
      ...current,
      homeProductSections: current.homeProductSections.map((section, position) =>
        position === index ? { ...section, ...patch } : section
      ),
    }));
  }

  function updateHomeFooterBanner(patch: Partial<HomeFooterBanner>) {
    changeContent((current) => ({
      ...current,
      homeFooterBanner: { ...current.homeFooterBanner, ...patch },
    }));
  }

  async function upload(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Enviando nova imagem...");
    scrollToAdminMessage();
    const result = await uploadAdminFile(file);
    if (result.url) updateSlide(index, { imageUrl: result.url });
    else setMessage(result.error ?? "Não foi possível trocar a imagem.");
    scrollToAdminMessage();
    setBusy(false);
  }

  async function uploadCatalogSlide(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Enviando nova imagem...");
    scrollToAdminMessage();
    const result = await uploadAdminFile(file);
    if (result.url) updateCatalogSlide(index, { imageUrl: result.url });
    else setMessage(result.error ?? "Não foi possível trocar a imagem.");
    scrollToAdminMessage();
    setBusy(false);
  }

  async function uploadHomePromo(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Enviando nova imagem...");
    scrollToAdminMessage();
    const result = await uploadAdminFile(file);
    if (result.url) updateHomePromo(index, { imageUrl: result.url });
    else setMessage(result.error ?? "Não foi possível trocar a imagem.");
    scrollToAdminMessage();
    setBusy(false);
  }

  async function uploadHomeFooterBanner(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Enviando e salvando o novo banner...");
    scrollToAdminMessage();

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("purpose", "home-footer-banner");
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Não foi possível trocar o banner.");
        scrollToAdminMessage();
        return;
      }

      changeContent(
        (current) => ({
          ...current,
          homeFooterBanner: { ...current.homeFooterBanner, imageUrl: data.url },
        }),
        data.message ?? "Banner trocado e publicado com sucesso.",
      );
      scrollToAdminMessage();
    } catch {
      setMessage("Não foi possível trocar o banner. Verifique sua conexão e tente novamente.");
      scrollToAdminMessage();
    } finally {
      setBusy(false);
    }
  }

  const brandMenuOptions = useMemo(() => {
    const values = new Map<string, string>();
    const brandFilter = catalogFilters.find((filter) => filter.slug === "marca");
    for (const option of brandFilter?.options ?? []) values.set(normalizeToken(option.label), option.label);
    for (const product of menuCatalogProducts) {
      if (product.brand?.trim()) values.set(normalizeToken(product.brand), product.brand.trim());
    }
    return [...values.values()].sort((a, b) => a.localeCompare(b, "pt-BR")).map((label) => ({ value: label, label }));
  }, [catalogFilters, menuCatalogProducts]);

  const categoryMenuOptions = useMemo(() => {
    const categoryFilter = catalogFilters.find((filter) => filter.slug === "categoria" || filter.slug === "tipo-de-produto");
    const values = new Map<string, { value: string; label: string }>();
    for (const option of categoryFilter?.options ?? []) values.set(normalizeToken(option.slug), { value: option.slug, label: option.label });
    for (const product of menuCatalogProducts) {
      for (const option of product.filters ?? []) {
        if (option.groupSlug !== "categoria" && option.groupSlug !== "tipo-de-produto") continue;
        values.set(normalizeToken(option.optionSlug), { value: option.optionSlug, label: option.optionLabel });
      }
    }
    return [...values.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [catalogFilters, menuCatalogProducts]);

  const customFilterGroups = useMemo(() => catalogFilters.filter((filter) =>
    filter.slug !== "marca" && filter.slug !== "categoria" && filter.slug !== "tipo-de-produto" && filter.options.length > 0
  ), [catalogFilters]);

  const selectedCustomFilter = customFilterGroups.find((filter) => filter.slug === menuDraft.filterGroup) ?? customFilterGroups[0];

  const menuSelectOptions = menuDraft.type === "brand"
    ? brandMenuOptions
    : menuDraft.type === "category"
      ? categoryMenuOptions
      : menuDraft.type === "condition"
        ? conditionMenuOptions
        : menuDraft.type === "page"
          ? pageMenuOptions
          : menuDraft.type === "filter"
            ? (selectedCustomFilter?.options ?? []).map((option) => ({ value: option.slug, label: option.label }))
            : [];

  const selectedMenuOption = menuSelectOptions.find((option) => option.value === menuDraft.option);
  const generatedMenuHref = (() => {
    if (menuDraft.type === "all") return "/celulares";
    if (menuDraft.type === "brand" && menuDraft.option) return `/celulares?brand=${encodeURIComponent(menuDraft.option)}`;
    if (menuDraft.type === "category" && menuDraft.option) return `/celulares?categoria=${encodeURIComponent(menuDraft.option)}`;
    if (menuDraft.type === "condition" && menuDraft.option) return `/celulares?condition=${encodeURIComponent(menuDraft.option)}`;
    if (menuDraft.type === "filter" && selectedCustomFilter?.slug && menuDraft.option) return `/celulares?${encodeURIComponent(selectedCustomFilter.slug)}=${encodeURIComponent(menuDraft.option)}`;
    if (menuDraft.type === "page") return menuDraft.option;
    if (menuDraft.type === "custom") {
      const value = menuDraft.customHref.trim();
      return value.startsWith("/") ? value : "";
    }
    return "";
  })();

  const suggestedMenuLabel = (() => {
    if (menuDraft.type === "all") return "Todos os produtos";
    if (menuDraft.type === "filter" && selectedCustomFilter && selectedMenuOption) return selectedMenuOption.label;
    return selectedMenuOption?.label ?? "";
  })();

  function menuHrefDescription(href: string) {
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    if (path === "/celulares" && !query) return "Página: Todos os produtos";
    const brand = params.get("brand");
    if (brand) return `Marca: ${decodeURIComponent(brand)}`;
    const condition = params.get("condition");
    if (condition) return `Condição: ${decodeURIComponent(condition)}`;
    const category = params.get("categoria") ?? params.get("category") ?? params.get("cat");
    if (category) {
      const option = categoryMenuOptions.find((item) => normalizeToken(item.value) === normalizeToken(category));
      return `Categoria: ${option?.label ?? decodeURIComponent(category)}`;
    }
    const firstFilter = [...params.entries()][0];
    if (path === "/celulares" && firstFilter) {
      const group = catalogFilters.find((filter) => filter.slug === firstFilter[0]);
      const option = group?.options.find((item) => normalizeToken(item.slug) === normalizeToken(firstFilter[1]));
      return `${group?.name ?? "Filtro"}: ${option?.label ?? decodeURIComponent(firstFilter[1])}`;
    }
    const page = pageMenuOptions.find((item) => item.value === path);
    return page ? `Página: ${page.label}` : `Link personalizado: ${href}`;
  }

  function scrollToMenuBuilder() {
    window.requestAnimationFrame(() => menuBuilderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function resetMenuBuilder() {
    setMenuDraft(emptyMenuDraft());
    setMenuEditingIndex(null);
  }

  function beginNewMenuItem() {
    resetMenuBuilder();
    scrollToMenuBuilder();
  }

  function editMenuWithBuilder(index: number) {
    const item = content.navigation[index];
    const [path, query = ""] = item.href.split("?");
    const params = new URLSearchParams(query);
    let draft: MenuDraft = { ...emptyMenuDraft(), label: item.label };

    if (path === "/celulares" && !query) draft = { ...draft, type: "all" };
    else if (params.get("brand")) draft = { ...draft, type: "brand", option: params.get("brand") ?? "" };
    else if (params.get("condition")) draft = { ...draft, type: "condition", option: params.get("condition") ?? "" };
    else if (params.get("categoria") || params.get("category") || params.get("cat")) {
      draft = { ...draft, type: "category", option: params.get("categoria") ?? params.get("category") ?? params.get("cat") ?? "" };
    } else if (path === "/celulares" && [...params.entries()].length) {
      const [filterGroup, option] = [...params.entries()][0];
      draft = { ...draft, type: "filter", filterGroup, option };
    } else if (pageMenuOptions.some((page) => page.value === item.href)) {
      draft = { ...draft, type: "page", option: item.href };
    } else {
      draft = { ...draft, type: "custom", customHref: item.href };
    }

    setMenuDraft(draft);
    setMenuEditingIndex(index);
    scrollToMenuBuilder();
  }

  function changeMenuDestinationType(type: MenuDestinationType) {
    setMenuDraft((current) => ({
      ...current,
      type,
      option: type === "page" ? "/" : "",
      filterGroup: type === "filter" ? (customFilterGroups[0]?.slug ?? "") : "",
      customHref: type === "custom" ? current.customHref : "",
    }));
  }

  function addMenuFromBuilder() {
    const label = (menuDraft.label.trim() || suggestedMenuLabel).trim();
    if (!label) {
      setMessage("Digite o nome que aparecerá no menu.");
      scrollToMenuBuilder();
      return;
    }
    if (!generatedMenuHref) {
      setMessage(menuDraft.type === "custom"
        ? "No link personalizado, informe um endereço começando com /."
        : "Escolha o destino que este item deve abrir.");
      scrollToMenuBuilder();
      return;
    }
    if (menuEditingIndex === null && content.navigation.length >= 12) {
      setMessage("O menu aceita no máximo 12 itens. Remova um item antes de adicionar outro.");
      return;
    }

    changeContent((current) => {
      const nextItem: MenuItem = { label, href: generatedMenuHref, active: true };
      if (menuEditingIndex === null) return { ...current, navigation: [...current.navigation, nextItem] };
      return {
        ...current,
        navigation: current.navigation.map((item, index) => index === menuEditingIndex ? { ...item, label, href: generatedMenuHref } : item),
      };
    }, menuEditingIndex === null
      ? "Item adicionado ao menu. Clique em Salvar alterações para publicar."
      : "Item atualizado. Clique em Salvar alterações para publicar.");
    resetMenuBuilder();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(content),
    });
    const data = await response.json();
    setMessage(response.ok ? "Vitrine atualizada com sucesso. As mudanças já estão visíveis na loja!" : data.error);
    setBusy(false);
  }

  const activeSlide = content.heroSlides[activePreviewIndex] ?? content.heroSlides[0];

  return (
    <form className="admin-easy" onSubmit={save}>
      <header className="admin-title">
        <div>
          <span className="eyebrow">Editor Visual da Loja</span>
          <h1>Vitrine e Menu Principal</h1>
          <p>Personalize os banners rotativos da primeira página, carrossel do catálogo e atalhos de navegação.</p>
        </div>
        <button className="button primary" disabled={busy}>
          <Save size={16} /> Salvar alterações
        </button>
      </header>

      {message && <p className="admin-message" role="status" aria-live="polite">{message}</p>}

      {/* --- KPI CARDS DE CONTEÚDO --- */}
      <section className="catalog-kpi-grid">
        <div className="kpi-card">
          <span><Tv size={16} /> Capas do Carrossel Home</span>
          <strong>{content.heroSlides.length} / 5</strong>
          <small>Banners da página inicial</small>
        </div>

        <div className="kpi-card">
          <span><Layout size={16} /> Capas do Catálogo</span>
          <strong>{content.catalogSlides.length} / 5</strong>
          <small>Banners da página de produtos</small>
        </div>

        <div className="kpi-card profit">
          <span><Menu size={16} /> Atalhos no Menu</span>
          <strong>{content.navigation.filter((n) => n.active).length} ativos</strong>
          <small>{content.navigation.length} itens totais</small>
        </div>
      </section>

      {/* --- SIMULADOR DE PRÉVIA REALISTA EM TEMPO REAL --- */}
      <section className="admin-panel visual-preview-panel">
        <div className="panel-heading">
          <div>
            <h2><Sparkles className="inline text-green" size={18} /> Simulador em Tempo Real (Prévia da Capa {activePreviewIndex + 1})</h2>
            <p>Veja como o cliente enxerga este banner na primeira página da loja.</p>
          </div>
          <div className="preview-slide-selector">
            {content.heroSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`prev-tab-btn ${activePreviewIndex === idx ? "active" : ""}`}
                onClick={() => setActivePreviewIndex(idx)}
              >
                Capa {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {activeSlide && (
          <div className="realtime-banner-mockup">
            <div className="mockup-background">
              {activeSlide.imageUrl ? (
                activeSlide.imageUrl.endsWith(".mp4") || activeSlide.imageUrl.endsWith(".webm") ? (
                  <video src={activeSlide.imageUrl} autoPlay loop muted playsInline />
                ) : (
                  <img src={activeSlide.imageUrl} alt="" />
                )
              ) : (
                <div className="mockup-placeholder-bg">Insira um link ou envie uma foto/vídeo</div>
              )}
            </div>
            
            <div className="mockup-overlay">
              {activeSlide.eyebrow && <span className="mockup-eyebrow">{activeSlide.eyebrow}</span>}
              <h2 className="mockup-title">{activeSlide.title || "Título do Banner"}</h2>
              {activeSlide.description && <p className="mockup-desc">{activeSlide.description}</p>}
              {activeSlide.buttonLabel && (
                <span className="mockup-button">{activeSlide.buttonLabel} →</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* CARROSSEL PRINCIPAL DA HOME */}
      <section className="admin-panel hero-editor-panel">
        <div className="panel-heading">
          <div>
            <h2>Carrossel da Primeira Página (Home)</h2>
            <p>Edite o texto, imagens, vídeos e links de cada capa. Capas ativas ({content.heroSlides.length}/5).</p>
          </div>
          <button
            type="button"
            className="button ghost"
            disabled={content.heroSlides.length >= 5}
            onClick={() => changeContent((current) => ({ ...current, heroSlides: [...current.heroSlides, blankSlide()] }))}
          >
            <Plus size={15} /> Adicionar capa
          </button>
        </div>

        <div className="hero-slides-editor">
          {content.heroSlides.map((slide, index) => (
            <details className="hero-slide-editor compact-editor-card" key={index}>
              <summary>
                <span className="editor-card-thumb" style={slide.imageUrl ? { backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")` } : undefined}><ImagePlus size={15} /></span>
                <span><strong>Capa {index + 1}</strong><small>{slide.title || "Sem título"}</small></span>
              </summary>
              <div className="compact-editor-body">
              <div className="hero-slide-editor-head">
                <strong>Capa {index + 1}</strong>

                <div className="slide-order-actions">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveSlide(index, -1)}
                    title="Mover para esquerda"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === content.heroSlides.length - 1}
                    onClick={() => moveSlide(index, 1)}
                    title="Mover para direita"
                  >
                    <ArrowRight size={14} />
                  </button>
                  {content.heroSlides.length > 1 && (
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() => changeContent((current) => ({ ...current, heroSlides: current.heroSlides.filter((_, slideIndex) => slideIndex !== index) }))}
                      title="Remover capa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="hero-slide-fields">
                <label>Texto pequeno (Eyebrow)<input value={slide.eyebrow} onChange={(event) => updateSlide(index, { eyebrow: event.target.value })} /></label>
                <label>Título principal<textarea rows={2} value={slide.title} onChange={(event) => updateSlide(index, { title: event.target.value })} /></label>
                <label className="wide">Descrição<textarea rows={2} value={slide.description} onChange={(event) => updateSlide(index, { description: event.target.value })} /></label>
                <label>Texto do botão<input value={slide.buttonLabel} onChange={(event) => updateSlide(index, { buttonLabel: event.target.value })} /></label>
                <label>Link de destino<input value={slide.buttonHref} onChange={(event) => updateSlide(index, { buttonHref: event.target.value })} /></label>
              </div>

              <label className="upload-box">
                <ImagePlus size={16} /> {slide.imageUrl ? "Trocar foto ou vídeo desta capa" : "Escolher foto ou vídeo (JPG, PNG, MP4, WebM)"}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => void upload(index, event.target.files?.[0])} />
              </label>

              {slide.imageUrl && (
                <div className="hero-slide-preview">
                  {slide.imageUrl.endsWith(".mp4") || slide.imageUrl.endsWith(".webm") || slide.imageUrl.endsWith(".mov") ? (
                    <video src={slide.imageUrl} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")`, backgroundSize: "cover" }} />
                  )}
                </div>
              )}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="admin-panel home-layout-editor">
        <div className="panel-heading">
          <div>
            <h2>Banners e prateleiras da página inicial</h2>
            <p>Edite os dois banners exibidos após os destaques e escolha quais produtos aparecem logo abaixo.</p>
          </div>
        </div>

        <label className="compact-setting-field">
          Título dos produtos destacados
          <input value={content.homeFeaturedTitle} onChange={(event) => changeContent((current) => ({ ...current, homeFeaturedTitle: event.target.value }))} />
        </label>

        <div className="promo-config-list">
          {content.homePromoBanners.map((banner, index) => (
            <div className="promo-config-row" key={index}>
              <div className="promo-config-preview">
                <img src={banner.imageUrl} alt="" />
                <div><small>{banner.eyebrow}</small><strong>{banner.title}</strong><span>{banner.buttonLabel}</span></div>
              </div>
              <div className="promo-config-fields">
                <label>Chamada pequena<input value={banner.eyebrow} onChange={(event) => updateHomePromo(index, { eyebrow: event.target.value })} /></label>
                <label>Título<input value={banner.title} onChange={(event) => updateHomePromo(index, { title: event.target.value })} /></label>
                <label className="wide">Descrição<input value={banner.description} onChange={(event) => updateHomePromo(index, { description: event.target.value })} /></label>
                <label>Texto do botão<input value={banner.buttonLabel} onChange={(event) => updateHomePromo(index, { buttonLabel: event.target.value })} /></label>
                <label>Link do botão<input value={banner.buttonHref} onChange={(event) => updateHomePromo(index, { buttonHref: event.target.value })} /></label>
                <label className="compact-upload-button">
                  <ImagePlus size={15} /> Trocar imagem
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadHomePromo(index, event.target.files?.[0])} />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="home-sections-config">
          {content.homeProductSections.map((section, index) => (
            <div className="home-section-config-row" key={index}>
              <strong>Prateleira {index + 1}</strong>
              <label>Título<input value={section.title} onChange={(event) => updateHomeSection(index, { title: event.target.value })} /></label>
              <label>Produtos exibidos<input value={section.query} onChange={(event) => updateHomeSection(index, { query: event.target.value })} placeholder="Ex: xiaomi ou notebook, computador" /></label>
              <label>Texto do botão<input value={section.buttonLabel} onChange={(event) => updateHomeSection(index, { buttonLabel: event.target.value })} /></label>
              <label>Link<input value={section.buttonHref} onChange={(event) => updateHomeSection(index, { buttonHref: event.target.value })} /></label>
            </div>
          ))}
        </div>

        <div className="footer-banner-config">
          <div className="panel-heading compact-heading">
            <div>
              <h3>Banner final da página inicial</h3>
              <p>Este banner aparece logo depois da prateleira Informática. Você pode trocar a imagem, o link ou ocultá-lo.</p>
            </div>
          </div>

          <div className="footer-banner-config-grid">
            <div className="footer-banner-admin-preview">
              <img src={content.homeFooterBanner.imageUrl} alt="Prévia do banner final" />
            </div>

            <div className="footer-banner-config-fields">
              <label className="compact-upload-button">
                <ImagePlus size={15} /> Trocar banner
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void uploadHomeFooterBanner(file);
                  }}
                />
              </label>

              <label>
                Link ao clicar (opcional)
                <input
                  value={content.homeFooterBanner.linkHref}
                  onChange={(event) => updateHomeFooterBanner({ linkHref: event.target.value })}
                  placeholder="/celulares"
                />
              </label>

              <label className="footer-banner-toggle">
                <input
                  type="checkbox"
                  checked={content.homeFooterBanner.active}
                  onChange={(event) => updateHomeFooterBanner({ active: event.target.checked })}
                />
                <span>Exibir banner no final da página inicial</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* CARROSSEL DO CATÁLOGO DE PRODUTOS */}
      <section className="admin-panel catalog-banner-editor">
        <div className="panel-heading">
          <div>
            <h2>Carrossel do Catálogo de Produtos</h2>
            <p>Edite até 5 capas/vídeos rotativos exibidos no topo da lista de produtos ({content.catalogSlides.length}/5).</p>
          </div>
          <button
            type="button"
            className="button ghost"
            disabled={content.catalogSlides.length >= 5}
            onClick={() => changeContent((current) => ({ ...current, catalogSlides: [...current.catalogSlides, blankCatalogSlide()] }))}
          >
            <Plus size={15} /> Adicionar capa ao catálogo
          </button>
        </div>

        <div className="hero-slides-editor">
          {content.catalogSlides.map((slide, index) => (
            <details className="hero-slide-editor compact-editor-card" key={index}>
              <summary>
                <span className="editor-card-thumb" style={slide.imageUrl ? { backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")` } : undefined}><ImagePlus size={15} /></span>
                <span><strong>Catálogo {index + 1}</strong><small>{slide.title || "Sem título"}</small></span>
              </summary>
              <div className="compact-editor-body">
              <div className="hero-slide-editor-head">
                <strong>Capa {index + 1} do Catálogo</strong>

                <div className="slide-order-actions">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveCatalogSlide(index, -1)}
                    title="Mover para esquerda"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === content.catalogSlides.length - 1}
                    onClick={() => moveCatalogSlide(index, 1)}
                    title="Mover para direita"
                  >
                    <ArrowRight size={14} />
                  </button>
                  {content.catalogSlides.length > 1 && (
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() => changeContent((current) => ({ ...current, catalogSlides: current.catalogSlides.filter((_, slideIndex) => slideIndex !== index) }))}
                      title="Remover capa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="hero-slide-fields">
                <label>Texto pequeno<input value={slide.eyebrow} onChange={(event) => updateCatalogSlide(index, { eyebrow: event.target.value })} /></label>
                <label>Título<input value={slide.title} onChange={(event) => updateCatalogSlide(index, { title: event.target.value })} /></label>
                <label className="wide">Descrição<textarea rows={2} value={slide.description} onChange={(event) => updateCatalogSlide(index, { description: event.target.value })} /></label>
              </div>

              <label className="upload-box">
                <ImagePlus size={16} /> {slide.imageUrl ? "Trocar foto/vídeo do catálogo" : "Escolher foto ou vídeo (JPG, PNG, MP4, WebM)"}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => void uploadCatalogSlide(index, event.target.files?.[0])} />
              </label>

              {slide.imageUrl && (
                <div className="hero-slide-preview">
                  {slide.imageUrl.endsWith(".mp4") || slide.imageUrl.endsWith(".webm") || slide.imageUrl.endsWith(".mov") ? (
                    <video src={slide.imageUrl} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")`, backgroundSize: "cover" }} />
                  )}
                </div>
              )}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* MENU PRINCIPAL DE NAVEGAÇÃO */}
      <section className="admin-panel menu-editor-panel">
        <div className="panel-heading">
          <div>
            <h2>Menu Principal de Navegação (Cabeçalho)</h2>
            <p>Organize os atalhos exibidos no topo da loja. O construtor abaixo cria os links automaticamente.</p>
          </div>
          <button type="button" className="button ghost" onClick={beginNewMenuItem}>
            <Plus size={15} /> Adicionar item de menu
          </button>
        </div>

        <div className="menu-editor">
          {content.navigation.map((item, index) => (
            <div key={item.id ?? index} className="menu-item-row">
              <div className="menu-item-order" title={`Posição ${index + 1}`}>
                <GripVertical className="grab-icon" size={15} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <label className="menu-item-field menu-item-name">
                <span>Nome exibido</span>
                <input
                  aria-label="Nome do menu"
                  value={item.label}
                  onChange={(event) => updateMenu(index, { label: event.target.value })}
                  placeholder="Ex.: Celulares"
                />
              </label>
              <div className="menu-item-field menu-item-link">
                <span>O que este item abre</span>
                <div className="menu-destination-summary"><Link2 size={14} /><strong>{menuHrefDescription(item.href)}</strong></div>
                <details className="menu-advanced-link">
                  <summary><ChevronDown size={13} /> Ver link técnico</summary>
                  <input
                    aria-label="Link técnico do menu"
                    value={item.href}
                    onChange={(event) => updateMenu(index, { href: event.target.value })}
                    placeholder="Ex.: /celulares"
                  />
                </details>
              </div>
              <div className="menu-item-actions">
                <button type="button" title="Configurar de forma guiada" className="row-action-btn menu-edit-button" onClick={() => editMenuWithBuilder(index)}>
                  <Pencil size={14} /><span>Editar</span>
                </button>
                <button
                  type="button"
                  title={item.active ? "Ocultar do cabeçalho" : "Exibir no cabeçalho"}
                  className={`menu-toggle-btn ${item.active ? "on" : "off"}`}
                  onClick={() => updateMenu(index, { active: !item.active })}
                >
                  {item.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{item.active ? "Visível" : "Oculto"}</span>
                </button>
                <button
                  type="button"
                  title="Remover item"
                  aria-label={`Remover ${item.label || `item ${index + 1}`}`}
                  className="danger-text row-action-btn delete menu-delete-button"
                  onClick={() => changeContent((current) => ({ ...current, navigation: current.navigation.filter((_, itemIndex) => itemIndex !== index) }))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!content.navigation.length && <div className="menu-empty-state"><Menu size={20} /><span>Nenhum item configurado. Use o construtor abaixo para criar o primeiro.</span></div>}
        </div>

        <div className="menu-builder" ref={menuBuilderRef}>
          <header className="menu-builder-heading">
            <div><span>{menuEditingIndex === null ? "Adicionar novo item ao menu" : "Editar item do menu"}</span><p>Responda às etapas. O sistema monta o endereço correto sem você precisar saber códigos.</p></div>
            {menuEditingIndex !== null && <button type="button" onClick={resetMenuBuilder}>Cancelar edição</button>}
          </header>

          <div className="menu-builder-steps">
            <label className="menu-builder-step">
              <span className="menu-step-number">1</span>
              <strong>Nome do item</strong>
              <small>É o texto que o cliente verá no cabeçalho.</small>
              <input
                value={menuDraft.label}
                onChange={(event) => setMenuDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Ex.: Ofertas, Perfumes, Samsung..."
              />
            </label>

            <label className="menu-builder-step">
              <span className="menu-step-number">2</span>
              <strong>O que deve abrir?</strong>
              <small>Escolha o tipo de destino em palavras simples.</small>
              <select value={menuDraft.type} onChange={(event) => changeMenuDestinationType(event.target.value as MenuDestinationType)}>
                <option value="all">Todos os produtos</option>
                <option value="category">Uma categoria</option>
                <option value="brand">Uma marca</option>
                <option value="condition">Uma condição</option>
                <option value="filter">Um filtro cadastrado</option>
                <option value="page">Uma página do site</option>
                <option value="custom">Link personalizado (avançado)</option>
              </select>
            </label>

            <div className="menu-builder-step">
              <span className="menu-step-number">3</span>
              <strong>Selecione a opção</strong>
              <small>{menuDraft.type === "filter" ? "Primeiro escolha o filtro e depois uma opção." : "Escolha exatamente o conteúdo que será mostrado."}</small>
              {menuDraft.type === "filter" && (
                <select value={menuDraft.filterGroup || selectedCustomFilter?.slug || ""} onChange={(event) => setMenuDraft((current) => ({ ...current, filterGroup: event.target.value, option: "" }))}>
                  <option value="">Escolha um filtro</option>
                  {customFilterGroups.map((filter) => <option key={filter.id} value={filter.slug}>{filter.name}</option>)}
                </select>
              )}
              {menuDraft.type === "custom" ? (
                <input value={menuDraft.customHref} onChange={(event) => setMenuDraft((current) => ({ ...current, customHref: event.target.value }))} placeholder="Ex.: /atendimento" />
              ) : menuDraft.type === "all" ? (
                <div className="menu-choice-ready"><CheckCircle2 size={16} /> Tudo certo: abrirá todos os produtos.</div>
              ) : (
                <select value={menuDraft.option} onChange={(event) => setMenuDraft((current) => ({ ...current, option: event.target.value }))} disabled={menuDraft.type === "filter" && !selectedCustomFilter}>
                  <option value="">Selecione uma opção</option>
                  {menuSelectOptions.map((option) => <option key={`${menuDraft.type}-${option.value}`} value={option.value}>{option.label}</option>)}
                </select>
              )}
              {menuDraft.type !== "all" && menuDraft.type !== "custom" && menuSelectOptions.length === 0 && (
                <p className="menu-builder-warning">Ainda não há opções cadastradas. Crie-as em “Filtros e categorias”.</p>
              )}
            </div>

            <div className="menu-builder-step menu-builder-preview">
              <span className="menu-step-number">4</span>
              <strong>Pré-visualização</strong>
              <small>Confira como o item será entendido pelo sistema.</small>
              <div className="menu-preview-card">
                <PackageSearch size={19} />
                <span><b>{menuDraft.label.trim() || suggestedMenuLabel || "Nome do item"}</b><small>{generatedMenuHref ? menuHrefDescription(generatedMenuHref) : "Escolha o destino na etapa anterior"}</small></span>
              </div>
            </div>
          </div>

          <div className="menu-builder-footer">
            <p><CheckCircle2 size={15} /> Você não precisa conhecer <b>?brand</b>, <b>?condition</b> ou outras regras. O link é criado automaticamente.</p>
            <div>
              {menuEditingIndex !== null && <button type="button" className="button ghost" onClick={resetMenuBuilder}>Cancelar</button>}
              <button type="button" className="button primary" onClick={addMenuFromBuilder}>
                {menuEditingIndex === null ? <Plus size={15} /> : <Save size={15} />}
                {menuEditingIndex === null ? "Adicionar ao menu" : "Atualizar item"}
              </button>
            </div>
          </div>
        </div>

        <div className="menu-destination-help">
          <article><Layout size={18} /><span><b>Todos os produtos</b><small>Abre o catálogo completo.</small></span></article>
          <article><Layers size={18} /><span><b>Categoria</b><small>Ex.: celulares, medicamentos ou perfumes.</small></span></article>
          <article><Tag size={18} /><span><b>Marca</b><small>Mostra produtos de uma marca.</small></span></article>
          <article><Sparkles size={18} /><span><b>Condição</b><small>Ex.: novos, seminovos ou outlet.</small></span></article>
          <article><ListFilter size={18} /><span><b>Filtro cadastrado</b><small>Usa qualquer filtro criado para sua loja.</small></span></article>
          <article><Link2 size={18} /><span><b>Link personalizado</b><small>Somente para uma página especial.</small></span></article>
        </div>
      </section>
    </form>
  );
}

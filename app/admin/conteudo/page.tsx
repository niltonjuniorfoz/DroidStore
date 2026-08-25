"use client";

import { FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Layout,
  Layers,
  ListFilter,
  Link2,
  Menu,
  Monitor,
  PackageSearch,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import type { HeroSlide } from "../../../src/components/HeroCarousel";
import {
  DEFAULT_HOME_FEATURED_TITLE,
  DEFAULT_HOME_FOOTER_BANNER,
  DEFAULT_HOME_GARMIN_SHOWCASE,
  DEFAULT_HOME_OUTLET_SECTION,
  DEFAULT_HOME_PRODUCT_SECTIONS,
  DEFAULT_HOME_PROMO_BANNERS,
  type HomeBrandShowcase,
  type HomeFooterBanner,
  type HomeOutletSection,
  type HomeProductSection,
  type HomePromoBanner,
} from "../../../src/lib/homeContent";
import { uploadAdminFile } from "../../../src/lib/uploadClient";
import { DEFAULT_STOREFRONT_NAVIGATION } from "../../../src/lib/storefrontNavigation";

type MenuItem = { id?: string; label: string; href: string; active: boolean };
type ContentTab = "overview" | "banners" | "shelves" | "menu" | "visual";
type SortableContentKind = "heroSlides" | "catalogSlides" | "homePromoBanners" | "homeProductSections" | "navigation";
type PreviewDevice = "desktop" | "mobile";
type PreviewPage = "home" | "catalog";
type SortVisualState = { kind: SortableContentKind; index: number; pointerId: number };
type MenuDestinationType = "all" | "category" | "brand" | "condition" | "filter" | "page" | "custom";
type GuidedDestinationType = MenuDestinationType | "search" | "none";
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
type GuidedDestinationDraft = {
  type: GuidedDestinationType;
  option: string;
  filterGroup: string;
  customHref: string;
};
type GuidedLinkFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  brandOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  filterGroups: CatalogFilterGroup[];
  allowEmpty?: boolean;
  searchSuggestion?: string;
  className?: string;
};
type CatalogBanner = { eyebrow: string; title: string; description: string; imageUrl: string };
type Content = {
  storeName: string;
  heroSlides: HeroSlide[];
  catalogBanner: CatalogBanner;
  catalogSlides: CatalogBanner[];
  homeFeaturedTitle: string;
  homeFooterBanner: HomeFooterBanner;
  homeOutletSection: HomeOutletSection;
  homeGarminShowcase: HomeBrandShowcase;
  homePromoBanners: HomePromoBanner[];
  homeProductSections: HomeProductSection[];
  navigation: MenuItem[];
};

function isVideoMediaUrl(value: string) {
  const pathname = value.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  return /\.(mp4|webm|mov|m4v|ogv)$/.test(pathname);
}

function AdminMediaPreview({
  src,
  alt = "",
  className = "",
  compact = false,
  emptyLabel = "Imagem ou vídeo não carregado",
}: {
  src?: string;
  alt?: string;
  className?: string;
  compact?: boolean;
  emptyLabel?: string;
}) {
  const [mode, setMode] = useState<"image" | "video" | "fallback">(
    src ? (isVideoMediaUrl(src) ? "video" : "image") : "fallback",
  );

  useEffect(() => {
    setMode(src ? (isVideoMediaUrl(src) ? "video" : "image") : "fallback");
  }, [src]);

  if (!src || mode === "fallback") {
    return (
      <span className={`admin-media-fallback ${compact ? "compact" : ""} ${className}`.trim()}>
        <ImagePlus size={compact ? 15 : 20} />
        {!compact && <small>{emptyLabel}</small>}
      </span>
    );
  }

  if (mode === "video") {
    return (
      <video
        className={className}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onError={() => setMode("fallback")}
      />
    );
  }

  return <img className={className} src={src} alt={alt} onError={() => setMode("video")} />;
}

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

function emptyGuidedDestination(allowEmpty = false): GuidedDestinationDraft {
  return { type: allowEmpty ? "none" : "all", option: "", filterGroup: "", customHref: "" };
}

function parseGuidedDestination(href: string, allowEmpty = false): GuidedDestinationDraft {
  const value = href.trim();
  if (!value) return emptyGuidedDestination(allowEmpty);

  const [path, query = ""] = value.split("?");
  const params = new URLSearchParams(query);
  if (path === "/celulares" && !query) return { type: "all", option: "", filterGroup: "", customHref: "" };

  const search = params.get("q");
  if (path === "/celulares" && search) return { type: "search", option: search, filterGroup: "", customHref: "" };

  const brand = params.get("brand");
  if (path === "/celulares" && brand) return { type: "brand", option: brand, filterGroup: "", customHref: "" };

  const condition = params.get("condition");
  if (path === "/celulares" && condition) return { type: "condition", option: condition, filterGroup: "", customHref: "" };

  const category = params.get("categoria") ?? params.get("category") ?? params.get("cat");
  if (path === "/celulares" && category) return { type: "category", option: category, filterGroup: "", customHref: "" };

  if (path === "/celulares") {
    const firstFilter = [...params.entries()][0];
    if (firstFilter) return { type: "filter", filterGroup: firstFilter[0], option: firstFilter[1], customHref: "" };
  }

  if (pageMenuOptions.some((page) => page.value === path)) {
    return { type: "page", option: path, filterGroup: "", customHref: "" };
  }

  return { type: "custom", option: "", filterGroup: "", customHref: value };
}

function buildGuidedHref(draft: GuidedDestinationDraft, filterGroups: CatalogFilterGroup[]) {
  if (draft.type === "none") return "";
  if (draft.type === "all") return "/celulares";
  if (draft.type === "search" && draft.option.trim()) return `/celulares?q=${encodeURIComponent(draft.option.trim())}`;
  if (draft.type === "brand" && draft.option) return `/celulares?brand=${encodeURIComponent(draft.option)}`;
  if (draft.type === "category" && draft.option) return `/celulares?categoria=${encodeURIComponent(draft.option)}`;
  if (draft.type === "condition" && draft.option) return `/celulares?condition=${encodeURIComponent(draft.option)}`;
  if (draft.type === "filter" && draft.filterGroup && draft.option) {
    const group = filterGroups.find((item) => item.slug === draft.filterGroup);
    if (group) return `/celulares?${encodeURIComponent(group.slug)}=${encodeURIComponent(draft.option)}`;
  }
  if (draft.type === "page" && draft.option) return draft.option;
  if (draft.type === "custom") return draft.customHref.trim();
  return "";
}

function guidedHrefDescription(
  href: string,
  categoryOptions: Array<{ value: string; label: string }>,
  filterGroups: CatalogFilterGroup[],
) {
  if (!href) return "Sem ação ao clicar";
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  if (path === "/celulares" && !query) return "Abre todos os produtos";

  const search = params.get("q");
  if (search) return `Busca por: ${search}`;
  const brand = params.get("brand");
  if (brand) return `Marca: ${brand}`;
  const condition = params.get("condition");
  if (condition) return `Condição: ${condition}`;
  const category = params.get("categoria") ?? params.get("category") ?? params.get("cat");
  if (category) {
    const option = categoryOptions.find((item) => normalizeToken(item.value) === normalizeToken(category));
    return `Categoria: ${option?.label ?? category}`;
  }
  const firstFilter = [...params.entries()][0];
  if (path === "/celulares" && firstFilter) {
    const group = filterGroups.find((item) => item.slug === firstFilter[0]);
    const option = group?.options.find((item) => normalizeToken(item.slug) === normalizeToken(firstFilter[1]));
    return `${group?.name ?? "Filtro"}: ${option?.label ?? firstFilter[1]}`;
  }
  const page = pageMenuOptions.find((item) => item.value === path);
  return page ? `Página: ${page.label}` : "Link personalizado";
}

function GuidedLinkField({
  label,
  value,
  onChange,
  brandOptions,
  categoryOptions,
  filterGroups,
  allowEmpty = false,
  searchSuggestion = "",
  className = "",
}: GuidedLinkFieldProps) {
  const [draft, setDraft] = useState<GuidedDestinationDraft>(() => parseGuidedDestination(value, allowEmpty));

  useEffect(() => {
    setDraft(parseGuidedDestination(value, allowEmpty));
  }, [value, allowEmpty]);

  const selectedFilter = filterGroups.find((item) => item.slug === draft.filterGroup) ?? filterGroups[0];
  const selectedOptions = draft.type === "brand"
    ? brandOptions
    : draft.type === "category"
      ? categoryOptions
      : draft.type === "condition"
        ? conditionMenuOptions
        : draft.type === "page"
          ? pageMenuOptions
          : draft.type === "filter"
            ? (selectedFilter?.options ?? []).map((option) => ({ value: option.slug, label: option.label }))
            : [];

  function commit(next: GuidedDestinationDraft) {
    setDraft(next);
    onChange(buildGuidedHref(next, filterGroups));
  }

  function changeType(type: GuidedDestinationType) {
    if (type === "none") return commit({ type, option: "", filterGroup: "", customHref: "" });
    if (type === "all") return commit({ type, option: "", filterGroup: "", customHref: "" });
    if (type === "search") return commit({ type, option: searchSuggestion.trim() || "ofertas", filterGroup: "", customHref: "" });
    if (type === "brand") return commit({ type, option: brandOptions[0]?.value ?? "", filterGroup: "", customHref: "" });
    if (type === "category") return commit({ type, option: categoryOptions[0]?.value ?? "", filterGroup: "", customHref: "" });
    if (type === "condition") return commit({ type, option: conditionMenuOptions[0]?.value ?? "", filterGroup: "", customHref: "" });
    if (type === "filter") {
      const group = filterGroups[0];
      return commit({ type, filterGroup: group?.slug ?? "", option: group?.options[0]?.slug ?? "", customHref: "" });
    }
    if (type === "page") return commit({ type, option: pageMenuOptions[0]?.value ?? "/", filterGroup: "", customHref: "" });
    commit({ type: "custom", option: "", filterGroup: "", customHref: draft.customHref || "/pagina-personalizada" });
  }

  const generatedHref = buildGuidedHref(draft, filterGroups);

  return (
    <div className={`guided-link-field ${className}`.trim()}>
      <span className="guided-link-label">{label}</span>
      <select value={draft.type} onChange={(event) => changeType(event.target.value as GuidedDestinationType)}>
        {allowEmpty && <option value="none">Não fazer nada ao clicar</option>}
        <option value="all">Abrir todos os produtos</option>
        <option value="search">Buscar produtos por nome</option>
        <option value="category" disabled={!categoryOptions.length}>Abrir uma categoria</option>
        <option value="brand" disabled={!brandOptions.length}>Abrir uma marca</option>
        <option value="condition">Abrir uma condição</option>
        <option value="filter" disabled={!filterGroups.length}>Usar um filtro cadastrado</option>
        <option value="page">Abrir uma página da loja</option>
        <option value="custom">Link personalizado (avançado)</option>
      </select>

      {draft.type === "search" && (
        <input
          value={draft.option}
          onChange={(event) => commit({ ...draft, option: event.target.value })}
          placeholder="Ex.: Xiaomi, notebook, protetor solar..."
        />
      )}

      {draft.type === "filter" && (
        <select
          value={selectedFilter?.slug ?? ""}
          onChange={(event) => {
            const group = filterGroups.find((item) => item.slug === event.target.value);
            commit({ ...draft, filterGroup: group?.slug ?? "", option: group?.options[0]?.slug ?? "" });
          }}
        >
          {filterGroups.map((group) => <option key={group.id} value={group.slug}>{group.name}</option>)}
        </select>
      )}

      {draft.type !== "none" && draft.type !== "all" && draft.type !== "search" && draft.type !== "custom" && (
        <select value={draft.option} onChange={(event) => commit({ ...draft, option: event.target.value })}>
          {selectedOptions.map((option) => <option key={`${draft.type}-${option.value}`} value={option.value}>{option.label}</option>)}
        </select>
      )}

      {draft.type === "custom" && (
        <input
          value={draft.customHref}
          onChange={(event) => commit({ ...draft, customHref: event.target.value })}
          placeholder="Ex.: /atendimento"
        />
      )}

      <div className="guided-link-result">
        <CheckCircle2 size={14} />
        <span><b>O cliente será levado para:</b> {guidedHrefDescription(generatedHref, categoryOptions, filterGroups)}</span>
      </div>

      <details className="guided-link-advanced">
        <summary>Ver endereço técnico</summary>
        <input value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Endereço técnico de ${label}`} />
      </details>
    </div>
  );
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
  homeOutletSection: { ...DEFAULT_HOME_OUTLET_SECTION },
  homeGarminShowcase: { ...DEFAULT_HOME_GARMIN_SHOWCASE },
  homePromoBanners: DEFAULT_HOME_PROMO_BANNERS.map((banner) => ({ ...banner })),
  homeProductSections: DEFAULT_HOME_PRODUCT_SECTIONS.map((section) => ({ ...section })),
  navigation: DEFAULT_STOREFRONT_NAVIGATION.map((item) => ({ ...item, active: true })),
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
  const [activeTab, setActiveTab] = useState<ContentTab>("overview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewPage, setPreviewPage] = useState<PreviewPage>("home");
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [previewCatalogSlideIndex, setPreviewCatalogSlideIndex] = useState(0);
  const [sorting, setSorting] = useState<SortVisualState | null>(null);
  const [lastDropped, setLastDropped] = useState<Omit<SortVisualState, "pointerId"> | null>(null);
  const [dirty, setDirty] = useState(false);
  const menuBuilderRef = useRef<HTMLDivElement | null>(null);
  const pointerSortRef = useRef<SortVisualState | null>(null);
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function changeContent(
    updater: (current: Content) => Content,
    notification = "Alteração realizada. Clique em Salvar alterações para publicar.",
  ) {
    setContent(updater);
    setDirty(true);
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
        homeOutletSection: data.homeOutletSection && typeof data.homeOutletSection === "object"
          ? { ...DEFAULT_HOME_OUTLET_SECTION, ...data.homeOutletSection }
          : { ...DEFAULT_HOME_OUTLET_SECTION },
        homeGarminShowcase: data.homeGarminShowcase && typeof data.homeGarminShowcase === "object"
          ? { ...DEFAULT_HOME_GARMIN_SHOWCASE, ...data.homeGarminShowcase }
          : { ...DEFAULT_HOME_GARMIN_SHOWCASE },
        homePromoBanners: Array.isArray(data.homePromoBanners) && data.homePromoBanners.length === 2
          ? data.homePromoBanners
          : DEFAULT_HOME_PROMO_BANNERS.map((banner) => ({ ...banner })),
        homeProductSections: Array.isArray(data.homeProductSections) && data.homeProductSections.length === 2
          ? data.homeProductSections
          : DEFAULT_HOME_PRODUCT_SECTIONS.map((section) => ({ ...section })),
        navigation: data.navigation ?? [],
      });
      setDirty(false);
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

  useEffect(() => () => {
    document.body.classList.remove("admin-content-sorting");
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
  }, []);

  function reorderArray<T>(items: T[], from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function reorderContent(kind: SortableContentKind, from: number, to: number) {
    if (from === to) return;
    changeContent((current) => {
      if (kind === "heroSlides") return { ...current, heroSlides: reorderArray(current.heroSlides, from, to) };
      if (kind === "catalogSlides") return { ...current, catalogSlides: reorderArray(current.catalogSlides, from, to) };
      if (kind === "homePromoBanners") return { ...current, homePromoBanners: reorderArray(current.homePromoBanners, from, to) };
      if (kind === "homeProductSections") return { ...current, homeProductSections: reorderArray(current.homeProductSections, from, to) };
      return { ...current, navigation: reorderArray(current.navigation, from, to) };
    }, "Ordem alterada. Confira na prévia e publique quando estiver tudo certo.");
  }

  function beginPointerSort(kind: SortableContentKind, index: number, event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const active = { kind, index, pointerId: event.pointerId };
    pointerSortRef.current = active;
    setSorting(active);
    setLastDropped(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("admin-content-sorting");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
  }

  function movePointerSort(event: ReactPointerEvent<HTMLElement>) {
    const active = pointerSortRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(`[data-sort-kind="${active.kind}"]`);
    if (!target) return;
    const nextIndex = Number(target.dataset.sortIndex);
    if (!Number.isInteger(nextIndex) || nextIndex === active.index) return;
    reorderContent(active.kind, active.index, nextIndex);
    const moved = { ...active, index: nextIndex };
    pointerSortRef.current = moved;
    setSorting(moved);
  }

  function endPointerSort(event: ReactPointerEvent<HTMLElement>) {
    const active = pointerSortRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    pointerSortRef.current = null;
    setSorting(null);
    setLastDropped({ kind: active.kind, index: active.index });
    document.body.classList.remove("admin-content-sorting");
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    dropTimerRef.current = setTimeout(() => setLastDropped(null), 420);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* captura já liberada */ }
  }

  function sortHandleProps(kind: SortableContentKind, index: number) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => beginPointerSort(kind, index, event),
      onPointerMove: movePointerSort,
      onPointerUp: endPointerSort,
      onPointerCancel: endPointerSort,
    };
  }

  function sortableClass(kind: SortableContentKind, index: number, baseClass: string) {
    const isDragging = sorting?.kind === kind && sorting.index === index;
    const isDropped = lastDropped?.kind === kind && lastDropped.index === index;
    return `${baseClass} aura-sortable-item${isDragging ? " is-dragging" : ""}${isDropped ? " is-dropped" : ""}`;
  }

  function openPreview(page: PreviewPage = "home") {
    setPreviewPage(page);
    if (page === "home") setPreviewSlideIndex(0);
    else setPreviewCatalogSlideIndex(0);
    setPreviewOpen(true);
  }

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

  function updateHomeOutletSection(patch: Partial<HomeOutletSection>) {
    changeContent((current) => ({
      ...current,
      homeOutletSection: { ...current.homeOutletSection, ...patch },
    }));
  }

  function updateHomeGarminShowcase(patch: Partial<HomeBrandShowcase>) {
    changeContent((current) => ({
      ...current,
      homeGarminShowcase: { ...current.homeGarminShowcase, ...patch },
    }));
  }

  async function uploadHomeGarminBanner(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Enviando banner da linha Garmin...");
    scrollToAdminMessage();
    const result = await uploadAdminFile(file);
    if (result.url) updateHomeGarminShowcase({ bannerImageUrl: result.url });
    else setMessage(result.error ?? "Não foi possível trocar o banner Garmin.");
    scrollToAdminMessage();
    setBusy(false);
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

  function restoreRecommendedNavigation() {
    changeContent((current) => ({
      ...current,
      navigation: DEFAULT_STOREFRONT_NAVIGATION.map((item) => ({ ...item, active: true })),
    }), "Categorias recomendadas restauradas. Clique em Salvar e publicar para aplicar na loja.");
    resetMenuBuilder();
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

  async function publishContent() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Não foi possível publicar as alterações.");
        return false;
      }
      setDirty(false);
      setMessage("Vitrine atualizada com sucesso. As mudanças já estão visíveis na loja!");
      return true;
    } catch {
      setMessage("Falha de conexão ao publicar. Tente novamente.");
      return false;
    } finally {
      setBusy(false);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    await publishContent();
  }

  const activeSlide = content.heroSlides[activePreviewIndex] ?? content.heroSlides[0];
  const previewSlide = content.heroSlides[previewSlideIndex] ?? content.heroSlides[0];
  const previewCatalogSlide = content.catalogSlides[previewCatalogSlideIndex] ?? content.catalogSlides[0];
  const activeNavigation = content.navigation.filter((item) => item.active);

  return (
    <form className="admin-easy content-studio" onSubmit={save}>
      <header className="admin-title content-studio-title">
        <div>
          <span className="eyebrow">Editor Visual da Loja</span>
          <h1>Vitrine e Menu Principal</h1>
          <p>Organize banners, prateleiras e navegação sem precisar escrever códigos ou links técnicos.</p>
          <div className={`publish-state ${dirty ? "pending" : "saved"}`}>
            <span />
            {dirty ? "Há alterações que ainda não foram publicadas" : "Tudo publicado e atualizado"}
          </div>
        </div>
        <div className="content-studio-actions">
          <button
            type="button"
            className="button ghost preview-button"
            onClick={() => openPreview("home")}
          >
            <Eye size={16} /> Pré-visualizar
          </button>
          <button className="button primary" disabled={busy || !dirty}>
            <Save size={16} /> {busy ? "Publicando..." : "Salvar e publicar"}
          </button>
        </div>
      </header>

      {message && <p className="admin-message" role="status" aria-live="polite">{message}</p>}

      <nav className="content-studio-tabs" aria-label="Áreas da vitrine">
        {([
          ["overview", "Visão geral"],
          ["banners", "Banners"],
          ["shelves", "Prateleiras"],
          ["menu", "Categorias do cabeçalho"],
          ["visual", "Configurações visuais"],
        ] as Array<[ContentTab, string]>).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="content-overview">
          <section className="overview-card">
            <header>
              <div>
                <span className="overview-number">1</span>
                <div><h2>Banners da página inicial</h2><p>Arraste as capas para mudar a ordem em que aparecem.</p></div>
              </div>
              <button type="button" className="button ghost sm" onClick={() => setActiveTab("banners")}>Editar banners</button>
            </header>
            <div className="sortable-preview-strip banner-sort-strip">
              {content.heroSlides.map((slide, index) => (
                <article key={`overview-hero-${index}`} className={sortableClass("heroSlides", index, "sortable-preview-card")} data-sort-kind="heroSlides" data-sort-index={index}>
                  <button type="button" className="drag-handle" aria-label={`Arrastar banner ${index + 1}`} {...sortHandleProps("heroSlides", index)}>
                    <GripVertical size={16} />
                  </button>
                  <div className="sortable-media-thumb">
                    <AdminMediaPreview src={slide.imageUrl} compact />
                  </div>
                  <div><strong>Banner {index + 1}</strong><small>{slide.title || "Sem título"}</small></div>
                </article>
              ))}
            </div>
          </section>

          <section className="overview-card">
            <header>
              <div>
                <span className="overview-number">2</span>
                <div><h2>Prateleiras de produtos</h2><p>Arraste para definir qual grupo aparece primeiro.</p></div>
              </div>
              <button type="button" className="button ghost sm" onClick={() => setActiveTab("shelves")}>Editar prateleiras</button>
            </header>
            <div className="sortable-preview-strip shelf-sort-strip">
              {content.homeProductSections.map((section, index) => (
                <article key={`overview-shelf-${index}`} className={sortableClass("homeProductSections", index, "sortable-preview-card shelf")} data-sort-kind="homeProductSections" data-sort-index={index}>
                  <button type="button" className="drag-handle" aria-label={`Arrastar prateleira ${index + 1}`} {...sortHandleProps("homeProductSections", index)}>
                    <GripVertical size={16} />
                  </button>
                  <span className="overview-icon"><Layers size={20} /></span>
                  <div><strong>{section.title || `Prateleira ${index + 1}`}</strong><small>Busca: {section.query || "não configurada"}</small></div>
                </article>
              ))}
            </div>
          </section>

          <section className="overview-card overview-menu-card">
            <header>
              <div>
                <span className="overview-number">3</span>
                <div><h2>Categorias do cabeçalho</h2><p>Organize os departamentos exibidos no menu principal da loja.</p></div>
              </div>
              <button type="button" className="button ghost sm" onClick={() => setActiveTab("menu")}>Editar menu</button>
            </header>
            <div className="menu-order-strip" aria-label="Ordem dos itens do menu">
              {content.navigation.map((item, index) => (
                <article
                  key={item.id ?? `overview-menu-${index}`}
                  className={sortableClass("navigation", index, `menu-order-chip ${item.active ? "" : "inactive"}`)}
                  data-sort-kind="navigation"
                  data-sort-index={index}
                >
                  <button type="button" className="drag-handle" aria-label={`Arrastar ${item.label}`} {...sortHandleProps("navigation", index)}>
                    <GripVertical size={15} />
                  </button>
                  <span>{item.label || `Item ${index + 1}`}</span>
                  {!item.active && <small>Oculto</small>}
                </article>
              ))}
              {!content.navigation.length && <p className="overview-empty">Nenhum item de menu configurado.</p>}
            </div>
          </section>

          <section className="overview-publish-card">
            <div>
              <Eye size={22} />
              <span><strong>Confira tudo antes de publicar</strong><small>A prévia é particular: somente você vê as alterações até clicar em “Salvar e publicar”.</small></span>
            </div>
            <div>
              <button type="button" className="button ghost" onClick={() => openPreview("home")}>Abrir prévia</button>
              <button type="submit" className="button primary" disabled={busy || !dirty}>Salvar e publicar</button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "banners" && (
        <div className="content-tab-pane">
          <section className="tab-intro-card">
            <div><Tv size={22} /><span><strong>Banners e capas</strong><small>Use imagens largas. Arraste as miniaturas para mudar a ordem.</small></span></div>
            <button type="button" className="button ghost sm" onClick={() => openPreview("home")}><Eye size={15} /> Ver prévia</button>
          </section>

          <section className="admin-panel visual-preview-panel">
            <div className="panel-heading">
              <div>
                <h2><Sparkles className="inline text-green" size={18} /> Prévia rápida do banner principal</h2>
                <p>Selecione uma capa para conferir texto, enquadramento e botão.</p>
              </div>
              <div className="preview-slide-selector">
                {content.heroSlides.map((_, index) => (
                  <button key={index} type="button" className={`prev-tab-btn ${activePreviewIndex === index ? "active" : ""}`} onClick={() => setActivePreviewIndex(index)}>
                    Capa {index + 1}
                  </button>
                ))}
              </div>
            </div>
            {activeSlide && (
              <div className="realtime-banner-mockup">
                <div className="mockup-background">
                  {activeSlide.imageUrl
                    ? <AdminMediaPreview src={activeSlide.imageUrl} emptyLabel="Não foi possível carregar esta mídia" />
                    : <div className="mockup-placeholder-bg">Escolha uma imagem ou vídeo</div>}
                </div>
                <div className="mockup-overlay">
                  {activeSlide.eyebrow && <span className="mockup-eyebrow">{activeSlide.eyebrow}</span>}
                  <h2 className="mockup-title">{activeSlide.title || "Título do banner"}</h2>
                  {activeSlide.description && <p className="mockup-desc">{activeSlide.description}</p>}
                  {activeSlide.buttonLabel && <span className="mockup-button">{activeSlide.buttonLabel} →</span>}
                </div>
              </div>
            )}
          </section>

          <section className="admin-panel hero-editor-panel">
            <div className="panel-heading">
              <div><h2>1. Banners principais da página inicial</h2><p>Arraste as capas abaixo e depois abra cada uma para editar.</p></div>
              <button type="button" className="button ghost" disabled={content.heroSlides.length >= 5} onClick={() => changeContent((current) => ({ ...current, heroSlides: [...current.heroSlides, blankSlide()] }))}>
                <Plus size={15} /> Adicionar banner
              </button>
            </div>
            <div className="banner-order-board">
              {content.heroSlides.map((slide, index) => (
                <article key={`hero-order-${index}`} data-sort-kind="heroSlides" data-sort-index={index} className={sortableClass("heroSlides", index, "banner-order-card")}>
                  <button type="button" className="drag-handle" aria-label={`Arrastar banner ${index + 1}`} {...sortHandleProps("heroSlides", index)}><GripVertical size={16} /></button>
                  <div><AdminMediaPreview src={slide.imageUrl} compact /></div>
                  <span><b>{index + 1}</b><small>{slide.title || "Sem título"}</small></span>
                </article>
              ))}
            </div>
            <div className="hero-slides-editor">
              {content.heroSlides.map((slide, index) => (
                <details className="hero-slide-editor compact-editor-card" key={`hero-editor-${index}`}>
                  <summary>
                    <span className="editor-card-thumb"><AdminMediaPreview src={slide.imageUrl} compact /></span>
                    <span><strong>Banner {index + 1}</strong><small>{slide.title || "Sem título"}</small></span>
                  </summary>
                  <div className="compact-editor-body">
                    <div className="hero-slide-editor-head">
                      <strong>Editar banner {index + 1}</strong>
                      {content.heroSlides.length > 1 && <button type="button" className="danger-text" onClick={() => changeContent((current) => ({ ...current, heroSlides: current.heroSlides.filter((_, slideIndex) => slideIndex !== index) }))}><Trash2 size={14} /> Remover</button>}
                    </div>
                    <div className="hero-slide-fields">
                      <label>Chamada pequena<input value={slide.eyebrow} onChange={(event) => updateSlide(index, { eyebrow: event.target.value })} /></label>
                      <label>Título principal<textarea rows={2} value={slide.title} onChange={(event) => updateSlide(index, { title: event.target.value })} /></label>
                      <label className="wide">Descrição<textarea rows={2} value={slide.description} onChange={(event) => updateSlide(index, { description: event.target.value })} /></label>
                      <label>Texto do botão<input value={slide.buttonLabel} onChange={(event) => updateSlide(index, { buttonLabel: event.target.value })} /></label>
                      <GuidedLinkField label="Ao clicar no botão" value={slide.buttonHref} onChange={(buttonHref) => updateSlide(index, { buttonHref })} brandOptions={brandMenuOptions} categoryOptions={categoryMenuOptions} filterGroups={customFilterGroups} />
                    </div>
                    <label className="upload-box"><ImagePlus size={16} /> {slide.imageUrl ? "Trocar imagem ou vídeo" : "Escolher imagem ou vídeo"}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => void upload(index, event.target.files?.[0])} /></label>
                    {slide.imageUrl && <div className="hero-slide-preview"><AdminMediaPreview src={slide.imageUrl} emptyLabel="Não foi possível carregar esta mídia" /></div>}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <div className="panel-heading"><div><h2>2. Banners promocionais</h2><p>Arraste para escolher qual aparece primeiro.</p></div></div>
            <div className="banner-order-board promo-order-board">
              {content.homePromoBanners.map((banner, index) => (
                <article key={`promo-order-${index}`} data-sort-kind="homePromoBanners" data-sort-index={index} className={sortableClass("homePromoBanners", index, "banner-order-card")}>
                  <button type="button" className="drag-handle" aria-label={`Arrastar banner promocional ${index + 1}`} {...sortHandleProps("homePromoBanners", index)}><GripVertical size={16} /></button>
                  <div><AdminMediaPreview src={banner.imageUrl} compact /></div>
                  <span><b>{index + 1}</b><small>{banner.title}</small></span>
                </article>
              ))}
            </div>
            <div className="promo-config-list">
              {content.homePromoBanners.map((banner, index) => (
                <details className="promo-config-row compact-editor-card" key={`promo-editor-${index}`}>
                  <summary><span className="editor-card-thumb"><AdminMediaPreview src={banner.imageUrl} compact /></span><span><strong>Banner promocional {index + 1}</strong><small>{banner.title}</small></span></summary>
                  <div className="promo-config-fields compact-editor-body">
                    <label>Chamada pequena<input value={banner.eyebrow} onChange={(event) => updateHomePromo(index, { eyebrow: event.target.value })} /></label>
                    <label>Título<input value={banner.title} onChange={(event) => updateHomePromo(index, { title: event.target.value })} /></label>
                    <label className="wide">Descrição<input value={banner.description} onChange={(event) => updateHomePromo(index, { description: event.target.value })} /></label>
                    <label>Texto do botão<input value={banner.buttonLabel} onChange={(event) => updateHomePromo(index, { buttonLabel: event.target.value })} /></label>
                    <GuidedLinkField label="Ao clicar no botão" value={banner.buttonHref} onChange={(buttonHref) => updateHomePromo(index, { buttonHref })} brandOptions={brandMenuOptions} categoryOptions={categoryMenuOptions} filterGroups={customFilterGroups} />
                    <label className="compact-upload-button"><ImagePlus size={15} /> Trocar imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadHomePromo(index, event.target.files?.[0])} /></label>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="admin-panel catalog-banner-editor">
            <div className="panel-heading">
              <div><h2>3. Banners da página de produtos</h2><p>Capas exibidas no topo de “Todos os produtos”. Arraste para mudar a ordem.</p></div>
              <div className="panel-heading-actions">
                <button type="button" className="button ghost" onClick={() => openPreview("catalog")}><Eye size={15} /> Ver página de produtos</button>
                <button type="button" className="button ghost" disabled={content.catalogSlides.length >= 5} onClick={() => changeContent((current) => ({ ...current, catalogSlides: [...current.catalogSlides, blankCatalogSlide()] }))}><Plus size={15} /> Adicionar banner</button>
              </div>
            </div>
            <div className="banner-order-board">
              {content.catalogSlides.map((slide, index) => (
                <article key={`catalog-order-${index}`} data-sort-kind="catalogSlides" data-sort-index={index} className={sortableClass("catalogSlides", index, "banner-order-card")}>
                  <button type="button" className="drag-handle" aria-label={`Arrastar banner do catálogo ${index + 1}`} {...sortHandleProps("catalogSlides", index)}><GripVertical size={16} /></button>
                  <div><AdminMediaPreview src={slide.imageUrl} compact /></div>
                  <span><b>{index + 1}</b><small>{slide.title || "Sem título"}</small></span>
                </article>
              ))}
            </div>
            <div className="hero-slides-editor">
              {content.catalogSlides.map((slide, index) => (
                <details className="hero-slide-editor compact-editor-card" key={`catalog-editor-${index}`}>
                  <summary><span className="editor-card-thumb"><AdminMediaPreview src={slide.imageUrl} compact /></span><span><strong>Catálogo {index + 1}</strong><small>{slide.title || "Sem título"}</small></span></summary>
                  <div className="compact-editor-body">
                    <div className="hero-slide-editor-head"><strong>Editar capa {index + 1}</strong>{content.catalogSlides.length > 1 && <button type="button" className="danger-text" onClick={() => changeContent((current) => ({ ...current, catalogSlides: current.catalogSlides.filter((_, slideIndex) => slideIndex !== index) }))}><Trash2 size={14} /> Remover</button>}</div>
                    <div className="hero-slide-fields">
                      <label>Chamada pequena<input value={slide.eyebrow} onChange={(event) => updateCatalogSlide(index, { eyebrow: event.target.value })} /></label>
                      <label>Título<input value={slide.title} onChange={(event) => updateCatalogSlide(index, { title: event.target.value })} /></label>
                      <label className="wide">Descrição<textarea rows={2} value={slide.description} onChange={(event) => updateCatalogSlide(index, { description: event.target.value })} /></label>
                    </div>
                    <label className="upload-box"><ImagePlus size={16} /> {slide.imageUrl ? "Trocar imagem ou vídeo" : "Escolher imagem ou vídeo"}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => void uploadCatalogSlide(index, event.target.files?.[0])} /></label>
                    {slide.imageUrl && <div className="hero-slide-preview"><AdminMediaPreview src={slide.imageUrl} emptyLabel="Não foi possível carregar esta mídia" /></div>}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="admin-panel footer-banner-config">
            <div className="panel-heading"><div><h2>4. Banner final da página inicial</h2><p>Aparece depois da última prateleira. A imagem é enquadrada automaticamente.</p></div></div>
            <div className="footer-banner-config-grid">
              <div className="footer-banner-admin-preview">{content.homeFooterBanner.imageUrl ? <img src={content.homeFooterBanner.imageUrl} alt="Prévia do banner final" /> : <span>Sem banner</span>}</div>
              <div className="footer-banner-config-fields">
                <label className="compact-upload-button"><ImagePlus size={15} /> Trocar banner<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void uploadHomeFooterBanner(file); }} /></label>
                <GuidedLinkField label="Ao clicar no banner" value={content.homeFooterBanner.linkHref} onChange={(linkHref) => updateHomeFooterBanner({ linkHref })} brandOptions={brandMenuOptions} categoryOptions={categoryMenuOptions} filterGroups={customFilterGroups} allowEmpty />
                <label className="footer-banner-toggle"><input type="checkbox" checked={content.homeFooterBanner.active} onChange={(event) => updateHomeFooterBanner({ active: event.target.checked })} /><span>Exibir este banner na loja</span></label>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "shelves" && (
        <div className="content-tab-pane">
          <section className="tab-intro-card">
            <div><Layers size={22} /><span><strong>Prateleiras da página inicial</strong><small>São grupos de produtos exibidos na home. Arraste para escolher a ordem.</small></span></div>
            <button type="button" className="button ghost sm" onClick={() => openPreview("home")}><Eye size={15} /> Ver prévia</button>
          </section>
          <section className="admin-panel shelves-editor-panel">
            <label className="compact-setting-field">Título da área de produtos destacados<input value={content.homeFeaturedTitle} onChange={(event) => changeContent((current) => ({ ...current, homeFeaturedTitle: event.target.value }))} /></label>
            <div className="shelf-editor-list">
              {content.homeProductSections.map((section, index) => (
                <article key={`shelf-editor-${index}`} className={sortableClass("homeProductSections", index, "shelf-editor-card")} data-sort-kind="homeProductSections" data-sort-index={index}>
                  <header>
                    <button type="button" className="drag-handle" aria-label={`Arrastar prateleira ${index + 1}`} {...sortHandleProps("homeProductSections", index)}><GripVertical size={17} /></button>
                    <span className="shelf-position">{index + 1}</span>
                    <div><strong>{section.title || `Prateleira ${index + 1}`}</strong><small>Arraste este cartão para mudar a posição.</small></div>
                  </header>
                  <div className="shelf-editor-fields">
                    <label>Título exibido<input value={section.title} onChange={(event) => updateHomeSection(index, { title: event.target.value })} placeholder="Ex.: Informática" /></label>
                    <label>Quais produtos mostrar?<input value={section.query} onChange={(event) => updateHomeSection(index, { query: event.target.value })} placeholder="Ex.: notebook, computador, gamer" /><small>Digite palavras separadas por vírgula.</small></label>
                    <label>Texto do botão<input value={section.buttonLabel} onChange={(event) => updateHomeSection(index, { buttonLabel: event.target.value })} /></label>
                    <GuidedLinkField label="Ao clicar em Ver todos" value={section.buttonHref} onChange={(buttonHref) => updateHomeSection(index, { buttonHref })} brandOptions={brandMenuOptions} categoryOptions={categoryMenuOptions} filterGroups={customFilterGroups} searchSuggestion={section.query.split(",")[0]?.trim() ?? ""} />
                  </div>
                </article>
              ))}
            </div>

            <div className="promo-config-list">
              <details className="compact-editor-card" open>
                <summary>
                  <span className="editor-card-thumb"><Tag size={18} /></span>
                  <span><strong>Outlet especial</strong><small>Mosaico com 2 produtos grandes e 4 compactos.</small></span>
                </summary>
                <div className="promo-config-fields compact-editor-body">
                  <label>Título<input value={content.homeOutletSection.title} onChange={(event) => updateHomeOutletSection({ title: event.target.value })} /></label>
                  <label>Texto do botão<input value={content.homeOutletSection.buttonLabel} onChange={(event) => updateHomeOutletSection({ buttonLabel: event.target.value })} /></label>
                  <GuidedLinkField label="Ao clicar em Ver todos" value={content.homeOutletSection.buttonHref} onChange={(buttonHref) => updateHomeOutletSection({ buttonHref })} brandOptions={brandMenuOptions} categoryOptions={categoryMenuOptions} filterGroups={customFilterGroups} />
                  <label className="footer-banner-toggle"><input type="checkbox" checked={content.homeOutletSection.active} onChange={(event) => updateHomeOutletSection({ active: event.target.checked })} /><span>Exibir o mosaico Outlet na página inicial</span></label>
                </div>
              </details>

              <details className="compact-editor-card" open>
                <summary>
                  <span className="editor-card-thumb"><AdminMediaPreview src={content.homeGarminShowcase.bannerImageUrl} compact /></span>
                  <span><strong>Banner + carrossel Garmin</strong><small>Aparece imediatamente depois da prateleira Xiaomi.</small></span>
                </summary>
                <div className="promo-config-fields compact-editor-body">
                  <label>Título<input value={content.homeGarminShowcase.title} onChange={(event) => updateHomeGarminShowcase({ title: event.target.value })} /></label>
                  <label>Produtos do carrossel<input value={content.homeGarminShowcase.query} onChange={(event) => updateHomeGarminShowcase({ query: event.target.value })} placeholder="garmin" /><small>Use palavras que identifiquem a linha, marca ou categoria.</small></label>
                  <label>Texto do botão<input value={content.homeGarminShowcase.buttonLabel} onChange={(event) => updateHomeGarminShowcase({ buttonLabel: event.target.value })} /></label>
                  <GuidedLinkField label="Ao clicar em Ver todos / banner" value={content.homeGarminShowcase.buttonHref} onChange={(buttonHref) => updateHomeGarminShowcase({ buttonHref })} brandOptions={brandMenuOptions} categoryOptions={categoryMenuOptions} filterGroups={customFilterGroups} searchSuggestion={content.homeGarminShowcase.query.split(",")[0]?.trim() ?? "garmin"} />
                  <label className="compact-upload-button"><ImagePlus size={15} /> Trocar banner Garmin<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void uploadHomeGarminBanner(file); }} /></label>
                  {content.homeGarminShowcase.bannerImageUrl && <div className="hero-slide-preview"><AdminMediaPreview src={content.homeGarminShowcase.bannerImageUrl} emptyLabel="Banner Garmin não carregado" /></div>}
                  <label className="footer-banner-toggle"><input type="checkbox" checked={content.homeGarminShowcase.active} onChange={(event) => updateHomeGarminShowcase({ active: event.target.checked })} /><span>Exibir banner e carrossel Garmin</span></label>
                </div>
              </details>
            </div>
          </section>
        </div>
      )}

      {activeTab === "menu" && (
        <div className="content-tab-pane">
          <section className="tab-intro-card">
            <div><Menu size={22} /><span><strong>Categorias do cabeçalho</strong><small>Edite nome, destino, visibilidade e ordem dos departamentos da loja.</small></span></div>
            <button type="button" className="button ghost sm" onClick={() => openPreview("home")}><Eye size={15} /> Ver prévia</button>
          </section>

          <section className="admin-panel menu-editor-panel">
            <div className="panel-heading">
              <div><h2>1. Organize as categorias</h2><p>Segure o ícone de seis pontos e arraste o item para a posição desejada.</p></div>
              <div className="menu-heading-actions"><button type="button" className="button ghost" onClick={restoreRecommendedNavigation}>Restaurar modelo recomendado</button><button type="button" className="button ghost" onClick={beginNewMenuItem}><Plus size={15} /> Adicionar item</button></div>
            </div>
            <div className="menu-order-board">
              {content.navigation.map((item, index) => (
                <article key={item.id ?? `menu-sort-${index}`} className={sortableClass("navigation", index, `menu-order-chip ${item.active ? "" : "inactive"}`)} data-sort-kind="navigation" data-sort-index={index}>
                  <button type="button" className="drag-handle" aria-label={`Arrastar ${item.label}`} {...sortHandleProps("navigation", index)}><GripVertical size={16} /></button>
                  <span>{item.label || `Item ${index + 1}`}</span>
                  <small>{item.active ? String(index + 1).padStart(2, "0") : "Oculto"}</small>
                </article>
              ))}
            </div>

            <details className="menu-details-editor" open={!content.navigation.length}>
              <summary>Editar nome, destino ou visibilidade dos itens</summary>
              <div className="menu-editor">
                {content.navigation.map((item, index) => (
                  <div key={item.id ?? `menu-edit-${index}`} className="menu-item-row">
                    <div className="menu-item-order"><span>{String(index + 1).padStart(2, "0")}</span></div>
                    <label className="menu-item-field menu-item-name"><span>Nome exibido</span><input value={item.label} onChange={(event) => updateMenu(index, { label: event.target.value })} /></label>
                    <div className="menu-item-field menu-item-link"><span>O que abre</span><div className="menu-destination-summary"><Link2 size={14} /><strong>{menuHrefDescription(item.href)}</strong></div></div>
                    <div className="menu-item-actions">
                      <button type="button" className="row-action-btn menu-edit-button" onClick={() => editMenuWithBuilder(index)}><Pencil size={14} /><span>Editar</span></button>
                      <button type="button" className={`menu-toggle-btn ${item.active ? "on" : "off"}`} onClick={() => updateMenu(index, { active: !item.active })}>{item.active ? <Eye size={14} /> : <EyeOff size={14} />}<span>{item.active ? "Visível" : "Oculto"}</span></button>
                      <button type="button" className="danger-text row-action-btn delete" onClick={() => changeContent((current) => ({ ...current, navigation: current.navigation.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {!content.navigation.length && <div className="menu-empty-state"><Menu size={20} /><span>Nenhum item configurado. Use o construtor abaixo.</span></div>}
              </div>
            </details>
          </section>

          <section className="admin-panel menu-builder" ref={menuBuilderRef}>
            <header className="menu-builder-heading">
              <div><span>{menuEditingIndex === null ? "2. Adicionar novo item" : "Editar item do menu"}</span><p>Responda às etapas. O sistema cria o destino correto automaticamente.</p></div>
              {menuEditingIndex !== null && <button type="button" onClick={resetMenuBuilder}>Cancelar edição</button>}
            </header>
            <div className="menu-builder-steps">
              <label className="menu-builder-step"><span className="menu-step-number">1</span><strong>Nome do item</strong><small>Texto que o cliente verá.</small><input value={menuDraft.label} onChange={(event) => setMenuDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Ex.: Ofertas, Perfumes, Samsung..." /></label>
              <label className="menu-builder-step"><span className="menu-step-number">2</span><strong>O que deve abrir?</strong><small>Escolha em palavras simples.</small><select value={menuDraft.type} onChange={(event) => changeMenuDestinationType(event.target.value as MenuDestinationType)}><option value="all">Todos os produtos</option><option value="category">Uma categoria</option><option value="brand">Uma marca</option><option value="condition">Uma condição</option><option value="filter">Um filtro cadastrado</option><option value="page">Uma página do site</option><option value="custom">Link personalizado (avançado)</option></select></label>
              <div className="menu-builder-step"><span className="menu-step-number">3</span><strong>Selecione a opção</strong><small>{menuDraft.type === "filter" ? "Escolha o filtro e depois uma opção." : "Escolha o conteúdo desejado."}</small>
                {menuDraft.type === "filter" && <select value={menuDraft.filterGroup || selectedCustomFilter?.slug || ""} onChange={(event) => setMenuDraft((current) => ({ ...current, filterGroup: event.target.value, option: "" }))}><option value="">Escolha um filtro</option>{customFilterGroups.map((filter) => <option key={filter.id} value={filter.slug}>{filter.name}</option>)}</select>}
                {menuDraft.type === "custom" ? <input value={menuDraft.customHref} onChange={(event) => setMenuDraft((current) => ({ ...current, customHref: event.target.value }))} placeholder="Ex.: /atendimento" /> : menuDraft.type === "all" ? <div className="menu-choice-ready"><CheckCircle2 size={16} /> Abrirá todos os produtos.</div> : <select value={menuDraft.option} onChange={(event) => setMenuDraft((current) => ({ ...current, option: event.target.value }))} disabled={menuDraft.type === "filter" && !selectedCustomFilter}><option value="">Selecione uma opção</option>{menuSelectOptions.map((option) => <option key={`${menuDraft.type}-${option.value}`} value={option.value}>{option.label}</option>)}</select>}
                {menuDraft.type !== "all" && menuDraft.type !== "custom" && menuSelectOptions.length === 0 && <p className="menu-builder-warning">Não há opções cadastradas. Crie-as em “Filtros e categorias”.</p>}
              </div>
              <div className="menu-builder-step menu-builder-preview"><span className="menu-step-number">4</span><strong>Confira</strong><small>Veja como o sistema entendeu.</small><div className="menu-preview-card"><PackageSearch size={19} /><span><b>{menuDraft.label.trim() || suggestedMenuLabel || "Nome do item"}</b><small>{generatedMenuHref ? menuHrefDescription(generatedMenuHref) : "Escolha o destino"}</small></span></div></div>
            </div>
            <div className="menu-builder-footer"><p><CheckCircle2 size={15} /> Nenhum código precisa ser digitado.</p><div>{menuEditingIndex !== null && <button type="button" className="button ghost" onClick={resetMenuBuilder}>Cancelar</button>}<button type="button" className="button primary" onClick={addMenuFromBuilder}>{menuEditingIndex === null ? <Plus size={15} /> : <Save size={15} />}{menuEditingIndex === null ? "Adicionar ao menu" : "Atualizar item"}</button></div></div>
          </section>

          <section className="menu-destination-help">
            <article><Layout size={18} /><span><b>Todos os produtos</b><small>Abre o catálogo completo.</small></span></article>
            <article><Layers size={18} /><span><b>Categoria</b><small>Ex.: celulares, medicamentos ou perfumes.</small></span></article>
            <article><Tag size={18} /><span><b>Marca</b><small>Mostra uma marca específica.</small></span></article>
            <article><ListFilter size={18} /><span><b>Filtro</b><small>Usa filtros criados na sua loja.</small></span></article>
          </section>
        </div>
      )}

      {activeTab === "visual" && (
        <div className="content-tab-pane">
          <section className="tab-intro-card">
            <div><Layout size={22} /><span><strong>Configurações visuais</strong><small>Informações gerais que aparecem na vitrine e na prévia.</small></span></div>
            <button type="button" className="button ghost sm" onClick={() => openPreview("home")}><Eye size={15} /> Ver prévia</button>
          </section>
          <section className="admin-panel visual-settings-panel">
            <div className="visual-settings-grid">
              <label>Nome da loja<input value={content.storeName} onChange={(event) => changeContent((current) => ({ ...current, storeName: event.target.value }))} /><small>Este nome é usado na identificação principal da loja.</small></label>
              <label>Título dos produtos destacados<input value={content.homeFeaturedTitle} onChange={(event) => changeContent((current) => ({ ...current, homeFeaturedTitle: event.target.value }))} /><small>Aparece antes da primeira grade de produtos.</small></label>
            </div>
            <div className="visual-help-card"><Sparkles size={20} /><span><strong>Alterações seguras</strong><small>Nada fica visível para os clientes antes de você conferir a prévia e clicar em “Salvar e publicar”.</small></span></div>
          </section>
        </div>
      )}

      {previewOpen && (
        <div className="store-preview-modal" role="dialog" aria-modal="true" aria-label="Prévia da loja">
          <div className="store-preview-dialog">
            <header className="store-preview-toolbar">
              <div><Eye size={18} /><span><strong>Prévia antes de publicar</strong><small>Somente você está vendo estas alterações.</small></span></div>
              <div className="store-preview-controls">
                <div className="preview-page-switch" aria-label="Página da prévia">
                  <button type="button" className={previewPage === "home" ? "active" : ""} onClick={() => setPreviewPage("home")}><Layout size={15} /> Página inicial</button>
                  <button type="button" className={previewPage === "catalog" ? "active" : ""} onClick={() => setPreviewPage("catalog")}><PackageSearch size={15} /> Todos os produtos</button>
                </div>
                <div className="preview-device-switch" aria-label="Tamanho da tela">
                  <button type="button" className={previewDevice === "desktop" ? "active" : ""} onClick={() => setPreviewDevice("desktop")}><Monitor size={15} /> Computador</button>
                  <button type="button" className={previewDevice === "mobile" ? "active" : ""} onClick={() => setPreviewDevice("mobile")}><Smartphone size={15} /> Celular</button>
                </div>
              </div>
              <button type="button" className="preview-close" aria-label="Fechar prévia" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
            </header>

            <div className={`store-preview-stage ${previewDevice}`}>
              <div className="store-preview-site">
                <header className="preview-store-header">
                  <strong>{content.storeName || "Sua loja"}</strong>
                  <div className="preview-search">O que você procura?</div>
                  <span className="preview-account">◯</span>
                </header>
                <nav className="preview-store-nav">
                  {activeNavigation.map((item, index) => <span key={item.id ?? `preview-nav-${index}`}>{item.label}</span>)}
                  {!activeNavigation.length && <span>Menu ainda não configurado</span>}
                </nav>

                {previewPage === "home" ? (
                  <>
                    <section className="preview-hero">
                      {previewSlide?.imageUrl
                        ? <AdminMediaPreview src={previewSlide.imageUrl} emptyLabel="Banner não carregado" />
                        : <div className="preview-empty-media">Banner sem imagem</div>}
                      <div className="preview-hero-copy">
                        {previewSlide?.eyebrow && <small>{previewSlide.eyebrow}</small>}
                        <h2>{previewSlide?.title || "Título do banner"}</h2>
                        {previewSlide?.description && <p>{previewSlide.description}</p>}
                        {previewSlide?.buttonLabel && <span>{previewSlide.buttonLabel}</span>}
                      </div>
                      <div className="preview-dots">{content.heroSlides.map((_, index) => <button key={index} type="button" className={previewSlideIndex === index ? "active" : ""} onClick={() => setPreviewSlideIndex(index)} aria-label={`Ver banner ${index + 1}`} />)}</div>
                    </section>

                    <section className="preview-promos">
                      {content.homePromoBanners.map((banner, index) => (
                        <article key={`preview-promo-${index}`}>
                          {banner.imageUrl && <AdminMediaPreview src={banner.imageUrl} compact />}
                          <div><small>{banner.eyebrow}</small><strong>{banner.title}</strong><span>{banner.buttonLabel}</span></div>
                        </article>
                      ))}
                    </section>

                    <section className="preview-featured"><h2>{content.homeFeaturedTitle}</h2><div>{[1, 2, 3, 4].map((item) => <article key={item}><div /><small>Produto em destaque</small><strong>R$ 0,00</strong></article>)}</div></section>

                    {content.homeProductSections.map((section, index) => (
                      <section className="preview-shelf" key={`preview-shelf-${index}`}><header><div><h2>{section.title}</h2><small>Produtos relacionados a: {section.query}</small></div><span>{section.buttonLabel}</span></header><div>{[1, 2, 3, 4].map((item) => <article key={item}><div /><small>Produto da prateleira</small><strong>R$ 0,00</strong></article>)}</div></section>
                    ))}

                    {content.homeFooterBanner.active && content.homeFooterBanner.imageUrl && <section className="preview-footer-banner"><img src={content.homeFooterBanner.imageUrl} alt="" /></section>}
                  </>
                ) : (
                  <>
                    <section className="preview-catalog-hero">
                      {previewCatalogSlide?.imageUrl
                        ? <AdminMediaPreview src={previewCatalogSlide.imageUrl} emptyLabel="Banner do catálogo não carregado" />
                        : <div className="preview-empty-media">Banner do catálogo sem imagem</div>}
                      <div className="preview-catalog-copy">
                        {previewCatalogSlide?.eyebrow && <small>{previewCatalogSlide.eyebrow}</small>}
                        <h2>{previewCatalogSlide?.title || "Todos os produtos"}</h2>
                        {previewCatalogSlide?.description && <p>{previewCatalogSlide.description}</p>}
                      </div>
                      <div className="preview-dots">{content.catalogSlides.map((_, index) => <button key={index} type="button" className={previewCatalogSlideIndex === index ? "active" : ""} onClick={() => setPreviewCatalogSlideIndex(index)} aria-label={`Ver banner do catálogo ${index + 1}`} />)}</div>
                    </section>

                    <section className="preview-catalog-heading">
                      <div><small>Catálogo completo</small><h2>Todos os produtos</h2><span>Modelos disponíveis na loja</span></div>
                      <button type="button">Relevância⌄</button>
                    </section>

                    <div className="preview-catalog-layout">
                      <aside className="preview-catalog-filters">
                        <strong>Filtrar produtos</strong>
                        <span>Categoria</span><div />
                        <span>Marca</span><div />
                        <span>Condição</span><div />
                      </aside>
                      <section className="preview-catalog-grid">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                          <article key={item}><div /><small>Produto do catálogo</small><strong>R$ 0,00</strong><span>Ver produto</span></article>
                        ))}
                      </section>
                    </div>
                    <div className="preview-mobile-filter-bar"><ListFilter size={14} /> Filtros <span>Todos os produtos</span></div>
                  </>
                )}
              </div>
            </div>

            <footer className="store-preview-footer">
              <span>{dirty ? "Prévia com alterações ainda não publicadas" : "Esta é a versão já publicada"}</span>
              <div><button type="button" className="button ghost" onClick={() => setPreviewOpen(false)}>Continuar editando</button><button type="button" className="button primary" disabled={busy || !dirty} onClick={async () => { if (await publishContent()) setPreviewOpen(false); }}><Save size={15} /> Salvar e publicar</button></div>
            </footer>
          </div>
        </div>
      )}
    </form>
  );
}

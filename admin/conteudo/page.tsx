"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Layout,
  Layers,
  Link2,
  Menu,
  Plus,
  Save,
  Sparkles,
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

type MenuItem = { id?: string; label: string; href: string; active: boolean };
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
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  function showMessage(text: string, type: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function markPending() {
    showMessage("Alteração realizada. Clique em Salvar alterações para publicar na loja.", "info");
  }

  async function persistContent(nextContent: Content, successMessage: string) {
    const response = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(nextContent),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível salvar as alterações.");
    showMessage(successMessage, "success");
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
    });
  }, []);

  function updateMenu(index: number, patch: Partial<MenuItem>) {
    setContent((current) => ({
      ...current,
      navigation: current.navigation.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
    markPending();
  }

  function updateSlide(index: number, patch: Partial<HeroSlide>) {
    setContent((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    }));
    markPending();
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.heroSlides.length) return;
    const next = [...content.heroSlides];
    [next[index], next[target]] = [next[target], next[index]];
    setContent({ ...content, heroSlides: next });
    markPending();
  }

  function updateCatalogSlide(index: number, patch: Partial<CatalogBanner>) {
    setContent((current) => ({
      ...current,
      catalogSlides: current.catalogSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    }));
    markPending();
  }

  function moveCatalogSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.catalogSlides.length) return;
    const next = [...content.catalogSlides];
    [next[index], next[target]] = [next[target], next[index]];
    setContent({ ...content, catalogSlides: next });
    markPending();
  }

  function updateHomePromo(index: number, patch: Partial<HomePromoBanner>) {
    setContent((current) => ({
      ...current,
      homePromoBanners: current.homePromoBanners.map((banner, position) =>
        position === index ? { ...banner, ...patch } : banner
      ),
    }));
    markPending();
  }

  function updateHomeSection(index: number, patch: Partial<HomeProductSection>) {
    setContent((current) => ({
      ...current,
      homeProductSections: current.homeProductSections.map((section, position) =>
        position === index ? { ...section, ...patch } : section
      ),
    }));
    markPending();
  }

  function updateHomeFooterBanner(patch: Partial<HomeFooterBanner>) {
    setContent((current) => ({
      ...current,
      homeFooterBanner: { ...current.homeFooterBanner, ...patch },
    }));
    markPending();
  }

  async function upload(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    showMessage("Enviando arquivo...", "info");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar o arquivo.");
      updateSlide(index, { imageUrl: data.url });
      showMessage("Arquivo trocado. Clique em Salvar alterações para publicar.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadCatalogSlide(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    showMessage("Enviando arquivo...", "info");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar o arquivo.");
      updateCatalogSlide(index, { imageUrl: data.url });
      showMessage("Imagem do catálogo trocada. Clique em Salvar alterações para publicar.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadHomePromo(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    showMessage("Enviando imagem...", "info");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar a imagem.");
      updateHomePromo(index, { imageUrl: data.url });
      showMessage("Imagem promocional trocada. Clique em Salvar alterações para publicar.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadHomeFooterBanner(file?: File) {
    if (!file) return;
    setBusy(true);
    showMessage("Enviando e salvando o novo banner...", "info");

    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar o banner.");
      }

      const nextContent: Content = {
        ...content,
        homeFooterBanner: {
          ...content.homeFooterBanner,
          imageUrl: data.url,
        },
      };

      setContent(nextContent);
      await persistContent(nextContent, "Banner trocado e salvo com sucesso. A nova imagem já está publicada na loja!");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível trocar o banner.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    showMessage("Salvando alterações...", "info");

    try {
      await persistContent(content, "Alterações salvas com sucesso. As mudanças já estão visíveis na loja!");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível salvar as alterações.", "error");
    } finally {
      setBusy(false);
    }
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

      {message && <p className={`admin-message ${messageType}`} role="status" aria-live="polite">{message}</p>}

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
            onClick={() => { setContent({ ...content, heroSlides: [...content.heroSlides, blankSlide()] }); markPending(); }}
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
                      onClick={() => { setContent({ ...content, heroSlides: content.heroSlides.filter((_, slideIndex) => slideIndex !== index) }); markPending(); }}
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
          <input value={content.homeFeaturedTitle} onChange={(event) => { setContent({ ...content, homeFeaturedTitle: event.target.value }); markPending(); }} />
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
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; void uploadHomeFooterBanner(file); }} />
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
            onClick={() => { setContent({ ...content, catalogSlides: [...content.catalogSlides, blankCatalogSlide()] }); markPending(); }}
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
                      onClick={() => { setContent({ ...content, catalogSlides: content.catalogSlides.filter((_, slideIndex) => slideIndex !== index) }); markPending(); }}
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
            <p>Os itens ativos organizam a barra de atalhos e categorias no topo de todas as páginas da loja.</p>
          </div>
          <button
            type="button"
            className="button ghost"
            onClick={() => { setContent({ ...content, navigation: [...content.navigation, { label: "Novo item", href: "/celulares", active: true }] }); markPending(); }}
          >
            <Plus size={15} /> Adicionar item de menu
          </button>
        </div>

        <div className="menu-editor">
          {content.navigation.map((item, index) => (
            <div key={item.id ?? index} className="menu-item-row">
              <GripVertical className="grab-icon" size={16} />
              <input
                aria-label="Nome do menu"
                value={item.label}
                onChange={(event) => updateMenu(index, { label: event.target.value })}
                placeholder="Ex: Celulares"
              />
              <input
                aria-label="Link do menu"
                value={item.href}
                onChange={(event) => updateMenu(index, { href: event.target.value })}
                placeholder="Ex: /celulares"
              />
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
                className="danger-text row-action-btn delete"
                onClick={() => { setContent({ ...content, navigation: content.navigation.filter((_, itemIndex) => itemIndex !== index) }); markPending(); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}

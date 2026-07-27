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

type MenuItem = { id?: string; label: string; href: string; active: boolean };
type CatalogBanner = { eyebrow: string; title: string; description: string; imageUrl: string };
type Content = {
  storeName: string;
  heroSlides: HeroSlide[];
  catalogBanner: CatalogBanner;
  catalogSlides: CatalogBanner[];
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
  storeName: "Brasil Store",
  heroSlides: [blankSlide()],
  catalogBanner: defaultCatalogBanner(),
  catalogSlides: [blankCatalogSlide()],
  navigation: [],
};

export default function AdminConteudo() {
  const [content, setContent] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

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
        storeName: data.storeName ?? "Brasil Store",
        heroSlides: savedSlides,
        catalogBanner,
        catalogSlides: savedCatalogSlides,
        navigation: data.navigation ?? [],
      });
    });
  }, []);

  function updateMenu(index: number, patch: Partial<MenuItem>) {
    setContent((current) => ({
      ...current,
      navigation: current.navigation.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function updateSlide(index: number, patch: Partial<HeroSlide>) {
    setContent((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    }));
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.heroSlides.length) return;
    const next = [...content.heroSlides];
    [next[index], next[target]] = [next[target], next[index]];
    setContent({ ...content, heroSlides: next });
  }

  function updateCatalogSlide(index: number, patch: Partial<CatalogBanner>) {
    setContent((current) => ({
      ...current,
      catalogSlides: current.catalogSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    }));
  }

  function moveCatalogSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.catalogSlides.length) return;
    const next = [...content.catalogSlides];
    [next[index], next[target]] = [next[target], next[index]];
    setContent({ ...content, catalogSlides: next });
  }

  async function upload(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await response.json();
    if (response.ok) updateSlide(index, { imageUrl: data.url });
    else setMessage(data.error);
    setBusy(false);
  }

  async function uploadCatalogSlide(index: number, file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await response.json();
    if (response.ok) updateCatalogSlide(index, { imageUrl: data.url });
    else setMessage(data.error);
    setBusy(false);
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

      {message && <p className="admin-message" role="status">{message}</p>}

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
            onClick={() => setContent({ ...content, heroSlides: [...content.heroSlides, blankSlide()] })}
          >
            <Plus size={15} /> Adicionar capa
          </button>
        </div>

        <div className="hero-slides-editor">
          {content.heroSlides.map((slide, index) => (
            <article className="hero-slide-editor" key={index}>
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
                      onClick={() => setContent({ ...content, heroSlides: content.heroSlides.filter((_, slideIndex) => slideIndex !== index) })}
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
            </article>
          ))}
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
            onClick={() => setContent({ ...content, catalogSlides: [...content.catalogSlides, blankCatalogSlide()] })}
          >
            <Plus size={15} /> Adicionar capa ao catálogo
          </button>
        </div>

        <div className="hero-slides-editor">
          {content.catalogSlides.map((slide, index) => (
            <article className="hero-slide-editor" key={index}>
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
                      onClick={() => setContent({ ...content, catalogSlides: content.catalogSlides.filter((_, slideIndex) => slideIndex !== index) })}
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
            </article>
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
            onClick={() => setContent({ ...content, navigation: [...content.navigation, { label: "Novo item", href: "/celulares", active: true }] })}
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
                onClick={() => setContent({ ...content, navigation: content.navigation.filter((_, itemIndex) => itemIndex !== index) })}
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

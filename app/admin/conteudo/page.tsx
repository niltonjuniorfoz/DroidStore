"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, GripVertical, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import type { HeroSlide } from "../../../src/components/HeroCarousel";

type MenuItem = { id?: string; label: string; href: string; active: boolean };
type CatalogBanner = { eyebrow: string; title: string; description: string; imageUrl: string };
type Content = { storeName: string; heroSlides: HeroSlide[]; catalogBanner: CatalogBanner; navigation: MenuItem[] };
const defaultCatalogBanner = (): CatalogBanner => ({
  eyebrow: "Catálogo completo",
  title: "Produtos",
  description: "Encontre o produto ideal usando os filtros da loja.",
  imageUrl: "",
});
const blankSlide = (): HeroSlide => ({
  eyebrow: "Tecnologia boa cabe no seu bolso",
  title: "Tecnologia Android, sem complicação.",
  description: "Novos e seminovos com procedência, garantia e uma compra simples do início ao fim.",
  imageUrl: "",
  buttonLabel: "Ver ofertas",
  buttonHref: "/celulares",
});
const initial: Content = { storeName: "DroidStore", heroSlides: [blankSlide()], catalogBanner: defaultCatalogBanner(), navigation: [] };

export default function AdminConteudo() {
  const [content, setContent] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content").then((response) => response.json()).then((data) => {
      const savedSlides = Array.isArray(data.heroSlides) && data.heroSlides.length
        ? data.heroSlides.slice(0, 3)
        : [{
          eyebrow: data.heroEyebrow ?? blankSlide().eyebrow,
          title: data.heroTitle ?? blankSlide().title,
          description: data.heroDescription ?? blankSlide().description,
          imageUrl: data.heroImageUrl ?? "",
          buttonLabel: "Ver ofertas",
          buttonHref: "/celulares",
        }];
      const catalogBanner = data.catalogBanner && typeof data.catalogBanner === "object"
        ? { ...defaultCatalogBanner(), ...data.catalogBanner, imageUrl: data.catalogBanner.imageUrl ?? "" }
        : defaultCatalogBanner();
      setContent({ storeName: data.storeName ?? "DroidStore", heroSlides: savedSlides, catalogBanner, navigation: data.navigation ?? [] });
    });
  }, []);

  function updateMenu(index: number, patch: Partial<MenuItem>) {
    setContent((current) => ({ ...current, navigation: current.navigation.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }

  function updateSlide(index: number, patch: Partial<HeroSlide>) {
    setContent((current) => ({ ...current, heroSlides: current.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide) }));
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

  async function uploadCatalog(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await response.json();
    if (response.ok) setContent((current) => ({ ...current, catalogBanner: { ...current.catalogBanner, imageUrl: data.url } }));
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
    setMessage(response.ok ? "Vitrine atualizada. As mudanças já aparecem na loja." : data.error);
    setBusy(false);
  }

  return <form className="admin-easy" onSubmit={save}>
    <header className="admin-title">
      <div><span className="eyebrow">Editor visual</span><h1>Vitrine e menu</h1><p>Edite até três capas e os cinco atalhos principais da loja.</p></div>
      <button className="button primary" disabled={busy}><Save /> Salvar alterações</button>
    </header>
    {message && <p className="admin-message" role="status">{message}</p>}
    <section className="admin-panel hero-editor-panel">
      <div className="panel-heading">
        <div><h2>Carrossel da primeira página</h2><p>Cada capa pode ter uma foto, texto e botão próprios. O degradê é aplicado automaticamente.</p></div>
        <button type="button" className="button ghost" disabled={content.heroSlides.length >= 3} onClick={() => setContent({ ...content, heroSlides: [...content.heroSlides, blankSlide()] })}><Plus /> Adicionar capa</button>
      </div>
      <div className="hero-slides-editor">
        {content.heroSlides.map((slide, index) => <article className="hero-slide-editor" key={index}>
          <div className="hero-slide-editor-head"><strong>Capa {index + 1}</strong>{content.heroSlides.length > 1 && <button type="button" onClick={() => setContent({ ...content, heroSlides: content.heroSlides.filter((_, slideIndex) => slideIndex !== index) })}><Trash2 /> Remover</button>}</div>
          <div className="hero-slide-fields">
            <label>Texto pequeno<input value={slide.eyebrow} onChange={(event) => updateSlide(index, { eyebrow: event.target.value })} /></label>
            <label>Título principal<textarea rows={2} value={slide.title} onChange={(event) => updateSlide(index, { title: event.target.value })} /></label>
            <label className="wide">Descrição<textarea rows={3} value={slide.description} onChange={(event) => updateSlide(index, { description: event.target.value })} /></label>
            <label>Texto do botão<input value={slide.buttonLabel} onChange={(event) => updateSlide(index, { buttonLabel: event.target.value })} /></label>
            <label>Destino do botão<input value={slide.buttonHref} onChange={(event) => updateSlide(index, { buttonHref: event.target.value })} /></label>
          </div>
          <label className="upload-box">
            <ImagePlus /> {slide.imageUrl ? "Trocar foto desta capa" : "Escolher foto desta capa"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(index, event.target.files?.[0])} />
          </label>
          {slide.imageUrl && <div className="hero-slide-preview" style={{ backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")` }}><span>{slide.title}</span></div>}
        </article>)}
      </div>
    </section>

    <section className="admin-panel catalog-banner-editor">
      <div className="panel-heading"><div><h2>Banner do catálogo</h2><p>Edite a área “Catálogo completo”. A foto é opcional e recebe o degradê automaticamente.</p></div></div>
      <div className="catalog-banner-fields">
        <label>Texto pequeno<input value={content.catalogBanner.eyebrow} onChange={(event) => setContent({ ...content, catalogBanner: { ...content.catalogBanner, eyebrow: event.target.value } })} /></label>
        <label>Título<input value={content.catalogBanner.title} onChange={(event) => setContent({ ...content, catalogBanner: { ...content.catalogBanner, title: event.target.value } })} /></label>
        <label className="wide">Descrição<textarea rows={3} value={content.catalogBanner.description} onChange={(event) => setContent({ ...content, catalogBanner: { ...content.catalogBanner, description: event.target.value } })} /></label>
      </div>
      <label className="upload-box">
        <ImagePlus /> {content.catalogBanner.imageUrl ? "Trocar foto do catálogo" : "Adicionar foto ao catálogo"}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadCatalog(event.target.files?.[0])} />
      </label>
      {content.catalogBanner.imageUrl && <div className="catalog-banner-preview" style={{ backgroundImage: `url("${content.catalogBanner.imageUrl.replaceAll('"', '\\"')}")` }}><div><small>{content.catalogBanner.eyebrow}</small><strong>{content.catalogBanner.title}</strong><span>{content.catalogBanner.description}</span></div><button type="button" onClick={() => setContent({ ...content, catalogBanner: { ...content.catalogBanner, imageUrl: "" } })}><Trash2 /> Remover foto</button></div>}
    </section>

    <section className="admin-panel menu-editor-panel">
      <div className="panel-heading"><div><h2>Menu principal</h2><p>Somente os cinco primeiros itens ativos aparecem no cabeçalho.</p></div><button type="button" className="button ghost" onClick={() => setContent({ ...content, navigation: [...content.navigation, { label: "Novo item", href: "/celulares", active: true }] })}><Plus /> Adicionar</button></div>
      <div className="menu-editor">{content.navigation.map((item, index) => <div key={item.id ?? index}><GripVertical /><input aria-label="Nome do menu" value={item.label} onChange={(event) => updateMenu(index, { label: event.target.value })} /><input aria-label="Link do menu" value={item.href} onChange={(event) => updateMenu(index, { href: event.target.value })} /><button type="button" title={item.active ? "Ocultar" : "Exibir"} onClick={() => updateMenu(index, { active: !item.active })}>{item.active ? <Eye /> : <EyeOff />}</button><button type="button" title="Remover" onClick={() => setContent({ ...content, navigation: content.navigation.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></button></div>)}</div>
    </section>
  </form>;
}

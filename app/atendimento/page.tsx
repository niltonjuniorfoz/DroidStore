"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { createMailtoUrl, createWhatsAppUrl, normalizeInstagramUrl } from "../../src/lib/contact";
import { formatBrazilPhone } from "../../src/lib/brazil";

type SiteContent = {
  storeName?: string | null;
  contactEmail?: string | null;
  whatsapp?: string | null;
  instagramUrl?: string | null;
};

type SupportForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const emptyForm: SupportForm = { name: "", email: "", subject: "", message: "" };

export default function AtendimentoPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [form, setForm] = useState<SupportForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/site-content?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os canais de atendimento.");
        setContent(data.content ?? {});
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os canais de atendimento."))
      .finally(() => setLoading(false));
  }, []);

  const storeName = content?.storeName?.trim() || "Brasil Store";
  const whatsapp = content?.whatsapp?.trim() || "";
  const email = content?.contactEmail?.trim() || "";
  const instagramUrl = normalizeInstagramUrl(content?.instagramUrl);

  const composedMessage = useMemo(() => {
    const parts = [
      `Olá! Meu nome é ${form.name || "cliente"}.`,
      form.subject ? `Assunto: ${form.subject}.` : "",
      form.message,
      form.email ? `Meu e-mail para retorno: ${form.email}.` : "",
    ].filter(Boolean);
    return parts.join("\n\n");
  }, [form]);

  function update(field: keyof SupportForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("Preencha nome, e-mail, assunto e mensagem antes de enviar.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Informe um e-mail válido para receber o retorno da equipe.");
      return false;
    }
    setError("");
    return true;
  }

  function sendEmail() {
    if (!validate()) return;
    const url = createMailtoUrl(email, form.subject, composedMessage);
    if (!url) {
      setError("O e-mail de atendimento ainda não foi cadastrado no painel administrativo.");
      return;
    }
    window.location.href = url;
  }

  function sendWhatsApp() {
    if (!validate()) return;
    const url = createWhatsAppUrl(whatsapp, composedMessage);
    if (!url) {
      setError("O WhatsApp de atendimento ainda não foi cadastrado no painel administrativo.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return <main className="support-page support-center-page">
    <nav className="support-breadcrumb" aria-label="Navegação estrutural">
      <Link href="/">Início</Link><span>›</span><strong>Central de Ajuda</strong>
    </nav>

    <section className="support-form-card">
      <header className="support-form-heading">
        <span>Atendimento</span>
        <h1>Central de Ajuda</h1>
        <p>Preencha o formulário e escolha como deseja falar com a equipe da {storeName}.</p>
      </header>

      {loading ? <div className="support-loading">Carregando canais de atendimento...</div> : <form className="support-contact-form" onSubmit={(event) => event.preventDefault()}>
        <div className="support-form-grid">
          <label>
            Nome <b>*</b>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Seu nome" autoComplete="name" required />
          </label>
          <label>
            E-mail <b>*</b>
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="seu@email.com" autoComplete="email" required />
          </label>
          <label className="wide">
            Assunto <b>*</b>
            <input value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Qual é o assunto?" required />
          </label>
          <label className="wide">
            Mensagem <b>*</b>
            <textarea value={form.message} onChange={(event) => update("message", event.target.value.slice(0, 5000))} placeholder="Descreva sua dúvida ou problema..." rows={6} required />
            <small>{form.message.length}/5000</small>
          </label>
        </div>

        {error && <div className="support-form-error" role="alert">{error}</div>}

        <div className="support-form-actions">
          <button type="button" className="support-send-email" onClick={sendEmail} disabled={!email}>
            <Mail /> {email ? "Enviar por e-mail" : "E-mail não cadastrado"}
          </button>
          <button type="button" className="support-send-whatsapp" onClick={sendWhatsApp} disabled={!whatsapp}>
            <MessageCircle /> {whatsapp ? "Falar no WhatsApp" : "WhatsApp não cadastrado"}
          </button>
        </div>
      </form>}
    </section>

    {!loading && <section className="support-direct-channels" aria-label="Contatos diretos">
      {whatsapp && <a href={createWhatsAppUrl(whatsapp, `Olá! Gostaria de falar com o atendimento da ${storeName}.`) ?? "#"} target="_blank" rel="noreferrer">
        <MessageCircle /><span><strong>WhatsApp</strong><small>{formatBrazilPhone(whatsapp)}</small></span>
      </a>}
      {email && <a href={createMailtoUrl(email, `Atendimento ${storeName}`) ?? "#"}>
        <Mail /><span><strong>E-mail</strong><small>{email}</small></span>
      </a>}
      {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer">
        <Instagram /><span><strong>Instagram</strong><small>Abrir perfil da loja</small></span>
      </a>}
      {!whatsapp && !email && !instagramUrl && <div className="support-empty">
        <strong>Canais ainda não cadastrados</strong>
        <p>Cadastre WhatsApp, e-mail e Instagram em Painel Admin → Configurações.</p>
      </div>}
    </section>}
  </main>;
}

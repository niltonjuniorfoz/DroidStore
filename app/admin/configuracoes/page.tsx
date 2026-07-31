"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatBrazilPhone } from "../../../src/lib/brazil";
import {
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  Instagram,
  LogIn,
  Mail,
  MessageCircle,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type SettingsResponse = {
  content: {
    storeName: string;
    contactEmail: string | null;
    whatsapp: string | null;
    instagramUrl: string | null;
    pixDiscount: number;
    maxInstallments: number;
    companyLegalName: string | null;
    companyTaxId: string | null;
    companyPhone: string | null;
    companyAddress: string | null;
    companyCity: string | null;
    companyState: string | null;
    companyZipCode: string | null;
    customerLoginEnabled: boolean;
    loginTitle: string;
    loginSubtitle: string;
    transactionalEmailEnabled: boolean;
    transactionalFromName: string | null;
    transactionalFromEmail: string | null;
    transactionalReplyTo: string | null;
  };
  integrations: { ollama: boolean; mercadoPago: boolean; email: boolean };
  ownerView: boolean;
};

export default function AdminConfiguracoes() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/settings", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível carregar as configurações.");
      else setData({ ...body, content: { ...body.content, whatsapp: formatBrazilPhone(body.content.whatsapp ?? "") } });
      setLoading(false);
    });
  }, []);

  function update(field: keyof SettingsResponse["content"], value: string | number | boolean) {
    if (!data) return;
    setData({ ...data, content: { ...data.content, [field]: value } });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.content),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível salvar.");
    else {
      setData({ ...body, content: { ...body.content, whatsapp: formatBrazilPhone(body.content.whatsapp ?? "") } });
      setMessage("Configurações salvas. Os dados da empresa, login e comunicações já estão atualizados.");
    }
    setSaving(false);
  }

  if (loading) return <div className="admin-loading">Carregando configurações...</div>;
  if (!data) return <div className="form-error">{error}</div>;

  return <div className="admin-easy settings-page">
    <div className="admin-title">
      <div>
        <span className="eyebrow">Preferências</span>
        <h1>Configurações</h1>
        <p>Identidade da loja, canais de atendimento, Instagram e regras comerciais.</p>
      </div>
    </div>

    {!data.ownerView && <div className="admin-message">Você pode consultar as configurações, mas somente o administrador proprietário pode alterá-las.</div>}
    {message && <div className="admin-message">{message}</div>}
    {error && <div className="form-error">{error}</div>}

    <form onSubmit={submit} className="settings-grid">
      <section className="admin-panel settings-form">
        <header>
          <ShieldCheck />
          <div><h2>Dados da loja</h2><p>Informações públicas usadas no site e no atendimento.</p></div>
        </header>
        <div className="admin-form-grid">
          <label className="wide">
            Nome da loja
            <input disabled={!data.ownerView} value={data.content.storeName} onChange={(event) => update("storeName", event.target.value)} />
          </label>

          <label>
            <span className="settings-field-title"><Mail /> E-mail de atendimento</span>
            <input disabled={!data.ownerView} type="email" value={data.content.contactEmail ?? ""} onChange={(event) => update("contactEmail", event.target.value)} placeholder="contato@sualoja.com" />
            <small>Será usado no rodapé e na página de atendimento.</small>
          </label>

          <label>
            <span className="settings-field-title"><MessageCircle /> WhatsApp de atendimento</span>
            <input disabled={!data.ownerView} value={data.content.whatsapp ?? ""} onChange={(event) => update("whatsapp", formatBrazilPhone(event.target.value))} placeholder="+55 (00) 00000-0000" inputMode="tel" maxLength={19} />
            <small>Padrão Brasil: +55 (DDD) número. Ex.: +55 (11) 99999-9999.</small>
          </label>

          <label className="wide">
            <span className="settings-field-title"><Instagram /> Instagram</span>
            <input disabled={!data.ownerView} value={data.content.instagramUrl ?? ""} onChange={(event) => update("instagramUrl", event.target.value)} placeholder="@sualoja ou https://instagram.com/sualoja" />
            <small>O ícone do Instagram no cabeçalho abrirá exatamente este perfil.</small>
          </label>

          <label>
            Desconto no Pix (%)
            <input disabled={!data.ownerView} type="number" min={0} max={30} value={data.content.pixDiscount} onChange={(event) => update("pixDiscount", Number(event.target.value))} />
          </label>

          <label>
            Parcelamento máximo
            <input disabled={!data.ownerView} type="number" min={1} max={24} value={data.content.maxInstallments} onChange={(event) => update("maxInstallments", Number(event.target.value))} />
          </label>
        </div>
        {data.ownerView && <button disabled={saving} className="button primary"><Save /> {saving ? "Salvando..." : "Salvar configurações"}</button>}
      </section>

      <section className="admin-panel settings-form settings-wide-panel">
        <header>
          <Building2 />
          <div><h2>Dados da empresa</h2><p>Dados usados nos e-mails, documentos e identificação da loja.</p></div>
        </header>
        <div className="admin-form-grid">
          <label className="wide">Razão social ou nome empresarial<input disabled={!data.ownerView} value={data.content.companyLegalName ?? ""} onChange={(event) => update("companyLegalName", event.target.value)} /></label>
          <label>CNPJ ou CPF<input disabled={!data.ownerView} value={data.content.companyTaxId ?? ""} onChange={(event) => update("companyTaxId", event.target.value)} /></label>
          <label>Telefone da empresa<input disabled={!data.ownerView} value={data.content.companyPhone ?? ""} onChange={(event) => update("companyPhone", event.target.value)} /></label>
          <label className="wide">Endereço<input disabled={!data.ownerView} value={data.content.companyAddress ?? ""} onChange={(event) => update("companyAddress", event.target.value)} placeholder="Rua, número, complemento e bairro" /></label>
          <label>Cidade<input disabled={!data.ownerView} value={data.content.companyCity ?? ""} onChange={(event) => update("companyCity", event.target.value)} /></label>
          <label>Estado (UF)<input disabled={!data.ownerView} maxLength={2} value={data.content.companyState ?? ""} onChange={(event) => update("companyState", event.target.value.toUpperCase())} /></label>
          <label>CEP<input disabled={!data.ownerView} value={data.content.companyZipCode ?? ""} onChange={(event) => update("companyZipCode", event.target.value)} /></label>
        </div>
      </section>

      <section className="admin-panel settings-form settings-wide-panel">
        <header>
          <LogIn />
          <div><h2>Área de login</h2><p>Edite a mensagem ou pause temporariamente o acesso dos clientes.</p></div>
        </header>
        <label className="settings-switch-row">
          <span><strong>Login de clientes ativo</strong><small>O acesso administrativo continua funcionando mesmo com esta opção desligada.</small></span>
          <input disabled={!data.ownerView} type="checkbox" checked={data.content.customerLoginEnabled} onChange={(event) => update("customerLoginEnabled", event.target.checked)} />
        </label>
        <div className="admin-form-grid">
          <label>Título da tela<input disabled={!data.ownerView} value={data.content.loginTitle} onChange={(event) => update("loginTitle", event.target.value)} /></label>
          <label className="wide">Mensagem de apoio<textarea disabled={!data.ownerView} rows={3} value={data.content.loginSubtitle} onChange={(event) => update("loginSubtitle", event.target.value)} /></label>
        </div>
      </section>

      <section className="admin-panel settings-form settings-wide-panel">
        <header>
          <Mail />
          <div><h2>E-mail de compra aprovada</h2><p>Mensagem visual enviada somente depois que o pagamento for confirmado.</p></div>
        </header>
        <label className="settings-switch-row">
          <span><strong>Envio automático ativo</strong><small>Requer a chave RESEND_API_KEY configurada com segurança no servidor.</small></span>
          <input disabled={!data.ownerView || !data.integrations.email} type="checkbox" checked={data.content.transactionalEmailEnabled} onChange={(event) => update("transactionalEmailEnabled", event.target.checked)} />
        </label>
        <div className="admin-form-grid">
          <label>Nome do remetente<input disabled={!data.ownerView} value={data.content.transactionalFromName ?? ""} onChange={(event) => update("transactionalFromName", event.target.value)} placeholder={data.content.storeName} /></label>
          <label>E-mail remetente<input disabled={!data.ownerView} type="email" value={data.content.transactionalFromEmail ?? ""} onChange={(event) => update("transactionalFromEmail", event.target.value)} placeholder="pedidos@seudominio.com" /></label>
          <label className="wide">Responder para<input disabled={!data.ownerView} type="email" value={data.content.transactionalReplyTo ?? ""} onChange={(event) => update("transactionalReplyTo", event.target.value)} placeholder="atendimento@seudominio.com" /></label>
        </div>
        <div className="email-layout-preview" aria-label="Prévia do formato do e-mail">
          <span>COMPRA APROVADA</span><strong>Seu pedido já está sendo embalado</strong><i />
          <p>Mensagem centralizada com resumo do pedido, produtos, pagamento, entrega e totais separados por linhas.</p>
        </div>
      </section>

      <section className="admin-panel integration-panel">
        <h2>Integrações</h2>
        <p>As chaves ficam protegidas no arquivo de ambiente e nunca são exibidas no navegador.</p>
        <Integration icon={<Bot />} name="Ollama Cloud" description="Geração de descrições e especificações" active={data.integrations.ollama} />
        <Integration icon={<CreditCard />} name="Mercado Pago" description="Cobrança e confirmação automática" active={data.integrations.mercadoPago} />
        <Integration icon={<Mail />} name="E-mail transacional" description="Avisos de pedido e atendimento" active={data.integrations.email} />
      </section>
    </form>
  </div>;
}

function Integration({ icon, name, description, active }: { icon: React.ReactNode; name: string; description: string; active: boolean }) {
  return <div className="integration-row"><span>{icon}</span><div><strong>{name}</strong><small>{description}</small></div><em className={active ? "connected" : "disconnected"}>{active ? <CheckCircle2 /> : <XCircle />}{active ? "Configurado" : "Pendente"}</em></div>;
}

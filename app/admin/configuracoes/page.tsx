"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, CheckCircle2, CreditCard, Mail, Save, ShieldCheck, XCircle } from "lucide-react";

type SettingsResponse = {
  content: { storeName: string; contactEmail: string | null; whatsapp: string | null; pixDiscount: number; maxInstallments: number };
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
      else setData(body);
      setLoading(false);
    });
  }, []);

  function update(field: keyof SettingsResponse["content"], value: string | number) {
    if (!data) return;
    setData({ ...data, content: { ...data.content, [field]: value } });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.content),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível salvar.");
    else { setData(body); setMessage("Configurações salvas. Os novos pedidos usarão estas regras."); }
    setSaving(false);
  }

  if (loading) return <div className="admin-loading">Carregando configurações...</div>;
  if (!data) return <div className="form-error">{error}</div>;
  return <div className="admin-easy settings-page">
    <div className="admin-title"><div><span className="eyebrow">Preferências</span><h1>Configurações</h1><p>Identidade da loja, regras comerciais e estado das integrações.</p></div></div>
    {!data.ownerView && <div className="admin-message">Você pode consultar as configurações, mas somente o administrador proprietário pode alterá-las.</div>}
    {message && <div className="admin-message">{message}</div>}
    {error && <div className="form-error">{error}</div>}
    <form onSubmit={submit} className="settings-grid">
      <section className="admin-panel settings-form">
        <header><ShieldCheck /><div><h2>Dados da loja</h2><p>Informações públicas usadas no atendimento.</p></div></header>
        <div className="admin-form-grid">
          <label className="wide">Nome da loja<input disabled={!data.ownerView} value={data.content.storeName} onChange={(event) => update("storeName", event.target.value)} /></label>
          <label>E-mail de contato<input disabled={!data.ownerView} type="email" value={data.content.contactEmail ?? ""} onChange={(event) => update("contactEmail", event.target.value)} placeholder="contato@sualoja.com" /></label>
          <label>WhatsApp<input disabled={!data.ownerView} value={data.content.whatsapp ?? ""} onChange={(event) => update("whatsapp", event.target.value)} placeholder="(00) 00000-0000" /></label>
          <label>Desconto no Pix (%)<input disabled={!data.ownerView} type="number" min={0} max={30} value={data.content.pixDiscount} onChange={(event) => update("pixDiscount", Number(event.target.value))} /></label>
          <label>Parcelamento máximo<input disabled={!data.ownerView} type="number" min={1} max={24} value={data.content.maxInstallments} onChange={(event) => update("maxInstallments", Number(event.target.value))} /></label>
        </div>
        {data.ownerView && <button disabled={saving} className="button primary"><Save /> {saving ? "Salvando..." : "Salvar configurações"}</button>}
      </section>
      <section className="admin-panel integration-panel">
        <h2>Integrações</h2><p>As chaves ficam protegidas no arquivo de ambiente e nunca são exibidas no navegador.</p>
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

"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone, Save, UserRound } from "lucide-react";
import { formatBrazilPhone } from "../../src/lib/brazil";

type Profile = { name: string | null; email: string; phone: string | null; cpf: string | null; birthDate: string | null };

function formatCpf(value: string) {
  return value.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function ContaPerfil() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/account/profile", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível carregar seus dados.");
      else setProfile({ ...body, phone: formatBrazilPhone(body.phone ?? ""), cpf: formatCpf(body.cpf ?? "") });
    });
  }, []);
  function update(field: keyof Profile, value: string) {
    if (profile) setProfile({ ...profile, [field]: value });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/account/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, birthDate: profile.birthDate?.slice(0, 10) ?? "" }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível salvar.");
    else { setProfile({ ...body, phone: formatBrazilPhone(body.phone ?? ""), cpf: formatCpf(body.cpf ?? "") }); setMessage("Seus dados foram atualizados."); }
    setSaving(false);
  }
  return <section className="profile-card">
    <header><div><span className="eyebrow">Perfil</span><h2>Dados pessoais</h2><p>Informações usadas para identificação e comunicação dos pedidos.</p></div><span className="verified"><CheckCircle2 /> Conta protegida</span></header>
    {!profile ? <div className="admin-loading">{error || "Carregando seus dados..."}</div> : <form className="profile-form" onSubmit={submit}>
      <label><span><UserRound /> Nome completo</span><input value={profile.name ?? ""} onChange={(event) => update("name", event.target.value)} required /></label>
      <label><span><Mail /> E-mail</span><input type="email" value={profile.email} disabled /></label>
      <label><span><Phone /> Telefone</span><input type="tel" inputMode="numeric" maxLength={19} value={profile.phone ?? ""} onChange={(event) => update("phone", formatBrazilPhone(event.target.value))} placeholder="+55 (00) 00000-0000" /></label>
      <label><span>CPF</span><input inputMode="numeric" maxLength={14} value={profile.cpf ?? ""} onChange={(event) => update("cpf", formatCpf(event.target.value))} placeholder="000.000.000-00" /></label>
      <label><span>Data de nascimento</span><input type="date" value={profile.birthDate?.slice(0, 10) ?? ""} onChange={(event) => update("birthDate", event.target.value)} /></label>
      {message && <div className="admin-message wide-message">{message}</div>}
      {error && <div className="form-error wide-message">{error}</div>}
      <div className="profile-actions"><p>Seu e-mail de acesso não pode ser alterado por aqui.</p><button disabled={saving} className="button primary"><Save /> {saving ? "Salvando..." : "Salvar alterações"}</button></div>
    </form>}
  </section>;
}

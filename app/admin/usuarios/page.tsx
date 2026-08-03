"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserCheck, UserPlus, UserX } from "lucide-react";

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MANAGER";
  active: boolean;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador proprietário",
  MANAGER: "Gerente",
};

export default function AdminUsuarios() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("MANAGER");

  async function load() {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível carregar a equipe.");
      else {
        setUsers(body.users);
        setSelfId(body.selfId);
      }
    } catch {
      setError("Falha de conexão. Recarregue a página.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function feedback(nextMessage: string) {
    setMessage(nextMessage);
    setError("");
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível criar o acesso.");
      else {
        setName("");
        setEmail("");
        setPassword("");
        setRole("MANAGER");
        feedback(`Acesso criado para ${body.email}.`);
        await load();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    }
    setSaving(false);
  }

  async function patchUser(id: string, patch: { role?: "ADMIN" | "MANAGER"; active?: boolean; password?: string }, successMessage: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível salvar.");
      else {
        feedback(successMessage);
        setPasswordFor(null);
        setNewPassword("");
        await load();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    }
    setSaving(false);
  }

  if (loading) return <div className="admin-loading">Carregando equipe...</div>;

  return <div className="admin-easy">
    <div className="admin-title">
      <div>
        <span className="eyebrow">Acessos</span>
        <h1>Equipe</h1>
        <p>Quem entra no painel, com qual papel, e reset de senha. Contas desativadas perdem o acesso na hora.</p>
      </div>
    </div>

    {message && <div className="admin-message">{message}</div>}
    {error && <div className="form-error">{error}</div>}

    <section className="admin-panel">
      <header>
        <UserPlus />
        <div><h2>Novo acesso</h2><p>Gerente opera a loja sem ver custos; administrador vê tudo e gerencia a equipe.</p></div>
      </header>
      <form onSubmit={createUser} className="admin-form-grid">
        <label>Nome<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>E-mail<input required type="email" maxLength={180} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Senha temporária<input required type="password" minLength={10} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mín. 10, com maiúscula, minúscula e número" /></label>
        <label>Papel
          <select value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "MANAGER")}>
            <option value="MANAGER">Gerente</option>
            <option value="ADMIN">Administrador proprietário</option>
          </select>
        </label>
        <button disabled={saving} className="button primary"><UserPlus /> {saving ? "Salvando..." : "Criar acesso"}</button>
      </form>
    </section>

    <section className="admin-data-card">
      <div className="customer-grid">
        {users.map((user) => {
          const isSelf = user.id === selfId;
          return <article key={user.id}>
            <div className="customer-avatar">{(user.name ?? user.email).slice(0, 1).toUpperCase()}</div>
            <div className="customer-info">
              <h2>{user.name ?? user.email}{isSelf && " (você)"}</h2>
              <span>{user.email}</span>
              <span><ShieldCheck /> {roleLabels[user.role]}</span>
              <span>{user.active ? "Ativo" : "Desativado"} · desde {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="customer-stats">
              {!isSelf && <>
                {user.role === "MANAGER"
                  ? <button disabled={saving} className="button ghost sm" onClick={() => void patchUser(user.id, { role: "ADMIN" }, "Promovido a administrador.")}>Promover a admin</button>
                  : <button disabled={saving} className="button ghost sm" onClick={() => void patchUser(user.id, { role: "MANAGER" }, "Rebaixado para gerente.")}>Tornar gerente</button>}
                {user.active
                  ? <button disabled={saving} className="button danger sm" onClick={() => { if (confirm(`Desativar o acesso de ${user.email}? A pessoa perde o painel imediatamente.`)) void patchUser(user.id, { active: false }, "Acesso desativado."); }}><UserX /> Desativar</button>
                  : <button disabled={saving} className="button primary sm" onClick={() => void patchUser(user.id, { active: true }, "Acesso reativado.")}><UserCheck /> Reativar</button>}
              </>}
              {passwordFor === user.id
                ? <form onSubmit={(event) => { event.preventDefault(); void patchUser(user.id, { password: newPassword }, "Senha redefinida."); }}>
                    <input autoFocus type="password" minLength={10} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nova senha" />
                    <button disabled={saving} className="button primary sm">Salvar</button>
                    <button type="button" className="button ghost sm" onClick={() => { setPasswordFor(null); setNewPassword(""); }}>Cancelar</button>
                  </form>
                : <button disabled={saving} className="button ghost sm" onClick={() => { setPasswordFor(user.id); setNewPassword(""); }}><KeyRound /> Redefinir senha</button>}
            </div>
          </article>;
        })}
        {!users.length && <p className="empty-inline">Nenhum membro além de você.</p>}
      </div>
    </section>
  </div>;
}

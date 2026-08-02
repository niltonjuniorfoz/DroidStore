"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { UserRound, X } from "lucide-react";
import { useSiteContent } from "./SiteContentProvider";

type Props = {
  onClose?: () => void;
  onAuthenticated?: () => void;
};

export default function AuthPanel({ onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const { content } = useSiteContent();
  const loginContent = {
    enabled: content?.customerLoginEnabled !== false,
    title: content?.loginTitle || "Faça seu login",
    subtitle: content?.loginSubtitle || "Entre para acompanhar seus pedidos e finalizar suas compras.",
  };
  const adminAccess = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("callbackUrl") ?? "").startsWith("/admin");
  useEffect(() => {
    void fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((providers) => setGoogleEnabled(Boolean(providers.google)))
      .catch(() => undefined);
  }, []);

  function callbackUrl() {
    return new URLSearchParams(window.location.search).get("callbackUrl") || window.location.pathname;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));

    if (mode === "register") {
      const response = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setMessage("E-mail ou senha incorretos.");
    } else {
      window.dispatchEvent(new CustomEvent("auth-session-changed", { detail: { authenticated: true } }));
      if (onAuthenticated) {
        onAuthenticated();
      } else {
        window.location.href = callbackUrl() === "/login" ? "/conta" : callbackUrl();
      }
    }
    setLoading(false);
  }

  function googleLogin() {
    if (!googleEnabled) {
      setMessage("O acesso pelo Google será liberado assim que as credenciais da loja forem configuradas.");
      return;
    }
    void signIn("google", { callbackUrl: callbackUrl() === "/login" ? "/conta" : callbackUrl() });
  }

  if (!loginContent.enabled && !adminAccess) return <section className="auth-panel auth-disabled-panel">
    <header className="auth-panel-header"><span><UserRound /></span><strong>Área de clientes indisponível</strong>{onClose ? <button type="button" onClick={onClose} aria-label="Fechar"><X /></button> : <i />}</header>
    <p>O acesso de clientes foi pausado temporariamente pela loja. Tente novamente mais tarde.</p>
  </section>;

  return <form className="auth-panel" onSubmit={submit}>
    <header className="auth-panel-header">
      <span><UserRound /></span>
      <strong>{mode === "login" ? loginContent.title : "Crie sua conta"}</strong>
      {onClose ? <button type="button" onClick={onClose} aria-label="Fechar"><X /></button> : <i />}
    </header>
    {mode === "login" && <p className="auth-panel-subtitle">{loginContent.subtitle}</p>}
    <div className="auth-panel-fields">
      {mode === "register" && <label><span>Nome completo</span><input name="name" required autoComplete="name" /></label>}
      <label><span>E-mail</span><input name="email" type="email" required autoComplete="email" /></label>
      <label><span>Senha</span><input name="password" type="password" required minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
    </div>
    {message && <p className="auth-panel-message" role="alert">{message}</p>}
    <button className="auth-access-button" disabled={loading}>{loading ? "AGUARDE..." : mode === "login" ? "ACESSAR" : "CRIAR CONTA"}</button>
    <button type="button" className="auth-google-button" onClick={googleLogin}><span className="google-g">G</span> Continuar com Google</button>
    <div className="auth-or"><span>OU</span></div>
    <button type="button" className="auth-mode-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "CADASTRE-SE" : "JÁ TENHO CONTA"}</button>
  </form>;
}

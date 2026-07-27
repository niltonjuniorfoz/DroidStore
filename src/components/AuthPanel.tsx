"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { MessageCircle, UserRound, X } from "lucide-react";
import { createWhatsAppUrl } from "../lib/contact";

type Props = {
  onClose?: () => void;
  onAuthenticated?: () => void;
};

export default function AuthPanel({ onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/auth/providers").then((response) => response.json()),
      fetch("/api/site-content").then((response) => response.json()),
    ]).then(([providers, siteData]) => {
      setGoogleEnabled(Boolean(providers.google));
      setWhatsappUrl(createWhatsAppUrl(siteData.content?.whatsapp, "Olá! Preciso de ajuda para acessar minha conta."));
    }).catch(() => undefined);
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
    } else if (onAuthenticated) {
      onAuthenticated();
    } else {
      window.location.href = callbackUrl() === "/login" ? "/conta" : callbackUrl();
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

  return <form className="auth-panel" onSubmit={submit}>
    <header className="auth-panel-header">
      <span><UserRound /></span>
      <strong>{mode === "login" ? "Faça seu login" : "Crie sua conta"}</strong>
      {onClose ? <button type="button" onClick={onClose} aria-label="Fechar"><X /></button> : <i />}
    </header>
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
    {whatsappUrl && <a className="auth-whatsapp-support" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Precisa de ajuda? Chame no WhatsApp</a>}
  </form>;
}

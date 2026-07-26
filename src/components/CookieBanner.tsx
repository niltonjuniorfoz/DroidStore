"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!window.localStorage.getItem("droidstore-cookie-consent")), []);
  function save(value: "essential" | "all") {
    window.localStorage.setItem("droidstore-cookie-consent", JSON.stringify({ value, savedAt: new Date().toISOString() }));
    setVisible(false);
  }
  if (!visible) return null;
  return <aside className="cookie-banner" aria-label="Preferências de cookies"><div><strong>Sua privacidade importa</strong><p>Usamos armazenamento essencial para manter o carrinho. Cookies analíticos só serão ativados com sua permissão.</p></div><button className="button ghost" onClick={() => save("essential")}>Somente essenciais</button><button className="button primary" onClick={() => save("all")}>Aceitar todos</button></aside>;
}

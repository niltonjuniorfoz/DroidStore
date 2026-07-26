"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const [store, setStore] = useState({ name: "DroidStore", email: "", whatsapp: "" });
  useEffect(() => {
    void fetch("/api/site-content").then((response) => response.json()).then((data) => {
      if (data.content) setStore({
        name: data.content.storeName ?? "DroidStore",
        email: data.content.contactEmail ?? "",
        whatsapp: data.content.whatsapp ?? "",
      });
    }).catch(() => undefined);
  }, []);
  if (admin) return <>{children}</>;
  return <div className="storefront-theme">
    <Header />
    {children}
    <footer className="site-footer">
      <div><strong>{store.name}</strong><p>Especialistas em celulares Android.</p></div>
      <div><strong>Compra segura</strong><p>Pagamento processado pelo Mercado Pago.</p></div>
      <div><strong>Atendimento</strong><p>{store.whatsapp || store.email || "Cadastre seus canais de contato no painel."}</p></div>
    </footer>
    <CookieBanner />
  </div>;
}

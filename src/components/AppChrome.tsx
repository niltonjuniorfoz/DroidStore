"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const [store, setStore] = useState({ name: "Brasil Store", email: "", whatsapp: "" });
  useEffect(() => {
    void fetch("/api/site-content").then((response) => response.json()).then((data) => {
      if (data.content) setStore({
        name: data.content.storeName ?? "Brasil Store",
        email: data.content.contactEmail ?? "",
        whatsapp: data.content.whatsapp ?? "",
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (admin || !window.matchMedia("(pointer: coarse)").matches) return;

    let touchStartY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".mobile-filter-sheet-content, .mobile-menu-panel")) return;

      const currentY = event.touches[0]?.clientY ?? touchStartY;
      const pullingPastTop = window.scrollY <= 0 && currentY > touchStartY;
      const pageBottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight;
      const pullingPastBottom = pageBottom && currentY < touchStartY;

      if (pullingPastTop || pullingPastBottom) event.preventDefault();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [admin]);
  if (admin) return <>{children}</>;
  return <div className="storefront-theme">
    <Header />
    {children}
    <footer className="site-footer">
      <div><strong>{store.name}</strong><p>Especialistas em tecnologia.</p></div>
      <div><strong>Compra segura</strong><p>Pagamento processado pelo Mercado Pago.</p></div>
      <div><strong>Atendimento</strong><p>{store.whatsapp || store.email || "Cadastre seus canais de contato no painel."}</p></div>
    </footer>
    <CookieBanner />
  </div>;
}

"use client";

import { usePathname } from "next/navigation";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";
import { createMailtoUrl, createWhatsAppUrl, normalizeInstagramUrl } from "../lib/contact";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const [store, setStore] = useState({ name: "Brasil Store", email: "", whatsapp: "", instagramUrl: "" });

  useEffect(() => {
    void fetch("/api/site-content").then((response) => response.json()).then((data) => {
      if (data.content) setStore({
        name: data.content.storeName ?? "Brasil Store",
        email: data.content.contactEmail ?? "",
        whatsapp: data.content.whatsapp ?? "",
        instagramUrl: data.content.instagramUrl ?? "",
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

  const contactLinks = useMemo(() => ({
    email: createMailtoUrl(store.email),
    whatsapp: createWhatsAppUrl(store.whatsapp),
    instagram: normalizeInstagramUrl(store.instagramUrl),
  }), [store.email, store.instagramUrl, store.whatsapp]);

  if (admin) return <>{children}</>;

  return <div className="storefront-theme">
    <Header />
    {children}
    <footer className="site-footer">
      <div>
        <strong>{store.name}</strong>
        <p>Especialistas em tecnologia.</p>
      </div>
      <div>
        <strong>Compra segura</strong>
        <p>Pagamento processado pelo Mercado Pago.</p>
      </div>
      <div className="footer-support">
        <strong>Atendimento</strong>
        <p>Escolha o canal mais fácil para falar com a loja.</p>
        <div className="footer-contact-actions">
          {contactLinks.whatsapp && <a href={contactLinks.whatsapp} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>}
          {contactLinks.email && <a href={contactLinks.email}><Mail /> E-mail</a>}
          {contactLinks.instagram && <a href={contactLinks.instagram} target="_blank" rel="noreferrer"><Instagram /> Instagram</a>}
          {!contactLinks.whatsapp && !contactLinks.email && !contactLinks.instagram && <small>Cadastre os canais no painel administrativo.</small>}
        </div>
      </div>
    </footer>
    <CookieBanner />
  </div>;
}

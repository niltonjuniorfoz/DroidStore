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
    let clampFrame = 0;

    const getScroller = () => document.scrollingElement ?? document.documentElement;
    const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight;
    const getMaxScroll = () => Math.max(0, getScroller().scrollHeight - getViewportHeight());

    const clampScroll = () => {
      cancelAnimationFrame(clampFrame);
      clampFrame = requestAnimationFrame(() => {
        const maxScroll = getMaxScroll();
        const current = getScroller().scrollTop;
        if (current < 0) window.scrollTo(0, 0);
        else if (current > maxScroll + 1) window.scrollTo(0, maxScroll);
      });
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".mobile-filter-sheet-content, .mobile-menu-panel, .auth-panel, .address-modal, .admin-modal")) return;

      const currentY = event.touches[0]?.clientY ?? touchStartY;
      const scrollTop = getScroller().scrollTop;
      const maxScroll = getMaxScroll();
      const pullingPastTop = scrollTop <= 1 && currentY > touchStartY;
      const pullingPastBottom = scrollTop >= maxScroll - 1 && currentY < touchStartY;

      if (pullingPastTop || pullingPastBottom) event.preventDefault();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", clampScroll, { passive: true });
    window.addEventListener("resize", clampScroll);
    window.visualViewport?.addEventListener("resize", clampScroll);

    return () => {
      cancelAnimationFrame(clampFrame);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", clampScroll);
      window.removeEventListener("resize", clampScroll);
      window.visualViewport?.removeEventListener("resize", clampScroll);
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

"use client";

import { usePathname } from "next/navigation";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";
import CartDrawer from "./CartDrawer";
import { createMailtoUrl, createWhatsAppUrl, normalizeInstagramUrl } from "../lib/contact";
import { useSiteContent } from "./SiteContentProvider";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const { content } = useSiteContent();
  const store = {
    name: content?.storeName ?? "Aura Tech",
    email: content?.contactEmail ?? "",
    whatsapp: content?.whatsapp ?? "",
    instagramUrl: content?.instagramUrl ?? "",
  };

  useEffect(() => {
    if (admin || !window.matchMedia("(pointer: coarse)").matches) return;

    let touchStartY = 0;
    let lastTouchY = 0;
    let clampFrame = 0;

    const getScroller = () => document.scrollingElement ?? document.documentElement;
    const getViewportHeight = () => document.documentElement.clientHeight || window.innerHeight;
    const getDocumentHeight = () => Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight,
    );
    const getMaxScroll = () => Math.max(0, getDocumentHeight() - getViewportHeight());

    const clampScroll = () => {
      window.cancelAnimationFrame(clampFrame);
      clampFrame = window.requestAnimationFrame(() => {
        const scroller = getScroller();
        const maxScroll = getMaxScroll();
        const current = scroller.scrollTop;
        if (current < 0) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        else if (current > maxScroll) window.scrollTo({ top: maxScroll, left: 0, behavior: "auto" });
      });
    };

    const nestedScrollerCanMove = (target: HTMLElement | null, fingerDeltaY: number) => {
      let element: HTMLElement | null = target;

      while (element && element !== document.body && element !== document.documentElement) {
        const style = window.getComputedStyle(element);
        const scrollable = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;

        if (scrollable) {
          const movingPageDown = fingerDeltaY < 0;
          const canMoveDown = element.scrollTop + element.clientHeight < element.scrollHeight - 1;
          const canMoveUp = element.scrollTop > 1;
          if ((movingPageDown && canMoveDown) || (!movingPageDown && canMoveUp)) return true;
        }

        element = element.parentElement;
      }

      return false;
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
      lastTouchY = touchStartY;
      clampScroll();
    };

    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? lastTouchY;
      const fingerDeltaY = currentY - lastTouchY;
      lastTouchY = currentY;
      if (Math.abs(fingerDeltaY) < 1) return;

      const target = event.target as HTMLElement | null;
      if (nestedScrollerCanMove(target, fingerDeltaY)) return;

      const scroller = getScroller();
      const maxScroll = getMaxScroll();
      const pullingPastTop = scroller.scrollTop <= 0 && currentY > touchStartY;
      const pullingPastBottom = scroller.scrollTop >= maxScroll - 1 && currentY < touchStartY;

      if ((pullingPastTop || pullingPastBottom) && event.cancelable) event.preventDefault();
    };

    const onTouchEnd = () => {
      touchStartY = 0;
      lastTouchY = 0;
      clampScroll();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", clampScroll);
    window.addEventListener("orientationchange", clampScroll);
    window.visualViewport?.addEventListener("resize", clampScroll);
    clampScroll();

    return () => {
      window.cancelAnimationFrame(clampFrame);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", clampScroll);
      window.removeEventListener("orientationchange", clampScroll);
      window.visualViewport?.removeEventListener("resize", clampScroll);
    };
  }, [admin, pathname]);

  useEffect(() => {
    if (admin) return;
    // Evita que uma página curta herde a posição de rolagem de uma página longa.
    window.requestAnimationFrame(() => {
      const maximum = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
      if (window.scrollY > maximum) window.scrollTo({ top: maximum, left: 0, behavior: "auto" });
    });
  }, [admin, pathname]);

  const contactLinks = useMemo(() => ({
    email: createMailtoUrl(store.email),
    whatsapp: createWhatsAppUrl(store.whatsapp),
    instagram: normalizeInstagramUrl(store.instagramUrl),
  }), [store.email, store.instagramUrl, store.whatsapp]);

  if (admin) return <>{children}</>;

  return <div className="storefront-theme">
    <Header />
    <CartDrawer />
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

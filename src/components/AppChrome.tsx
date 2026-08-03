"use client";

import { usePathname } from "next/navigation";
import { Award, Headphones, Instagram, Mail, MessageCircle, ShieldCheck, Truck } from "lucide-react";
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
    <footer className="site-footer aura-footer">
      <span className="aura-footer-watermark" aria-hidden="true">AURA</span>

      <div className="aura-footer-main">
        <section className="aura-footer-brand" aria-label="Aura Tech">
          <img src="/aura-tech-logo.png" alt="Aura Tech" loading="lazy" decoding="async" />
          <p>Tecnologia que conecta você ao futuro. Produtos selecionados, compra segura e atendimento de verdade.</p>
        </section>

        <nav className="aura-footer-column" aria-label="Categorias do rodapé">
          <strong>Categorias</strong>
          <a href="/celulares?q=iphone">iPhone</a>
          <a href="/celulares?q=samsung">Samsung</a>
          <a href="/celulares?q=motorola">Motorola</a>
          <a href="/celulares?q=xiaomi">Xiaomi</a>
          <a href="/celulares?categoria=notebook">Notebook</a>
        </nav>

        <section className="aura-footer-column aura-footer-payment">
          <strong>Pagamento seguro</strong>
          <p>Ambiente protegido para suas compras.</p>
          <div className="aura-payment-logos" aria-label="Formas de pagamento aceitas">
            <span className="payment-visa" aria-label="Visa">VISA</span>
            <span className="payment-mastercard" aria-label="Mastercard"><i /><i /></span>
            <span className="payment-pix" aria-label="Pix">PIX</span>
            <span className="payment-amex" aria-label="American Express">AMEX</span>
            <span className="payment-apple" aria-label="Apple Pay"> Pay</span>
          </div>
        </section>

        <section className="aura-footer-column aura-footer-contact">
          <strong>Atendimento</strong>
          <p>Fale com a Aura Tech.</p>
          <div className="aura-footer-contact-icons">
            {contactLinks.whatsapp && <a href={contactLinks.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp"><MessageCircle /></a>}
            {contactLinks.instagram && <a href={contactLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"><Instagram /></a>}
            {contactLinks.email && <a href={contactLinks.email} aria-label="E-mail" title="E-mail"><Mail /></a>}
            {!contactLinks.whatsapp && !contactLinks.email && !contactLinks.instagram && <small>Cadastre os canais no painel administrativo.</small>}
          </div>
        </section>
      </div>

      <div className="aura-footer-benefits" aria-label="Benefícios da Aura Tech">
        <div><ShieldCheck /><span><b>Compra 100% segura</b><small>Seus dados protegidos</small></span></div>
        <div><Award /><span><b>Produtos de qualidade</b><small>Seleção e procedência</small></span></div>
        <div><Truck /><span><b>Envio para todo o Brasil</b><small>Entrega rápida e rastreada</small></span></div>
        <div><Headphones /><span><b>Atendimento especializado</b><small>Antes e depois da compra</small></span></div>
      </div>

      <div className="aura-footer-bottom">© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</div>
    </footer>
    <CookieBanner />
  </div>;
}

"use client";

import Link from "next/link";
import {
  ChevronRight,
  Headphones,
  Heart,
  Home,
  Instagram,
  Menu,
  PackageCheck,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import MegaMenu from "./MegaMenu";
import { normalizeInstagramUrl } from "../lib/contact";

type MenuItem = { label: string; href: string };

const defaultNavigation: MenuItem[] = [
  { label: "Todos os celulares", href: "/celulares" },
  { label: "Novos", href: "/celulares?condition=Novo" },
  { label: "Seminovos", href: "/celulares?condition=Excelente" },
  { label: "Samsung", href: "/celulares?brand=Samsung" },
  { label: "Motorola", href: "/celulares?brand=Motorola" },
  { label: "iPhone", href: "/celulares?brand=Apple" },
];

const mobileCategories: MenuItem[] = [
  { label: "Categorias", href: "/celulares" },
  { label: "iPhone", href: "/celulares?brand=Apple" },
  { label: "Samsung", href: "/celulares?brand=Samsung" },
  { label: "Motorola", href: "/celulares?brand=Motorola" },
  { label: "Xiaomi", href: "/celulares?brand=Xiaomi" },
  { label: "Notebook", href: "/celulares?tipo-de-produto=notebook" },
  { label: "Smartwatches", href: "/celulares?tipo-de-produto=smartwatch" },
  { label: "Tablets", href: "/celulares?tipo-de-produto=tablet" },
  { label: "Acessórios", href: "/celulares?tipo-de-produto=acessorio" },
  { label: "Seminovos", href: "/celulares?condition=Excelente" },
];

export default function Header() {
  const { count } = useCart();
  const [navigation, setNavigation] = useState<MenuItem[]>(defaultNavigation);
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesHidden, setCategoriesHidden] = useState(false);
  const categoriesHiddenRef = useRef(false);

  useEffect(() => {
    fetch("/api/site-content")
      .then((response) => response.json())
      .then((data) => {
        if (data.navigation?.length) setNavigation(data.navigation.slice(0, 8));
        setInstagramUrl(normalizeInstagramUrl(data.content?.instagramUrl));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshAuthentication = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = response.ok ? await response.json() : null;
        if (!cancelled) setAuthenticated(Boolean(session?.user));
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
    };

    const handleAuthenticationChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ authenticated?: boolean }>).detail;
      if (typeof detail?.authenticated === "boolean") {
        setAuthenticated(detail.authenticated);
        return;
      }
      void refreshAuthentication();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshAuthentication();
    };

    void refreshAuthentication();
    window.addEventListener("focus", refreshAuthentication);
    window.addEventListener("auth-session-changed", handleAuthenticationChanged);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAuthentication);
      window.removeEventListener("auth-session-changed", handleAuthenticationChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let previousScrollY = Math.max(0, window.scrollY);
    let downwardDistance = 0;
    let upwardDistance = 0;
    let ignoreScrollUntil = 0;
    let ticking = false;

    const applyCategoriesVisibility = (hidden: boolean, currentScrollY: number) => {
      if (categoriesHiddenRef.current === hidden) return;

      categoriesHiddenRef.current = hidden;
      setCategoriesHidden(hidden);
      downwardDistance = 0;
      upwardDistance = 0;
      previousScrollY = currentScrollY;

      // Ao esconder/mostrar, a altura do cabeçalho muda e o navegador ajusta o scrollY.
      // Durante a animação ignoramos esse ajuste automático para não interpretar como
      // uma rolagem real no sentido contrário e ficar abrindo/fechando a barra.
      ignoreScrollUntil = performance.now() + 360;
    };

    const updateCategories = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const now = performance.now();

      // Perto do topo, a barra sempre deve ficar visível.
      if (currentScrollY <= 18) {
        applyCategoriesVisibility(false, currentScrollY);
        previousScrollY = currentScrollY;
        ticking = false;
        return;
      }

      // Absorve somente a variação provocada pela animação da própria barra.
      if (now < ignoreScrollUntil) {
        previousScrollY = currentScrollY;
        ticking = false;
        return;
      }

      const distance = currentScrollY - previousScrollY;
      previousScrollY = currentScrollY;

      // Ignora tremores pequenos do touchpad, do navegador mobile e do scroll inercial.
      if (Math.abs(distance) < 3) {
        ticking = false;
        return;
      }

      if (distance > 0) {
        downwardDistance += distance;
        upwardDistance = 0;
      } else {
        upwardDistance += Math.abs(distance);
        downwardDistance = 0;
      }

      // Histerese com trava de animação: desce 30 px para esconder e sobe 70 px
      // para mostrar novamente. Assim uma pequena oscilação não alterna o menu.
      if (!categoriesHiddenRef.current && currentScrollY > 95 && downwardDistance >= 30) {
        applyCategoriesVisibility(true, currentScrollY);
      } else if (categoriesHiddenRef.current && upwardDistance >= 70) {
        applyCategoriesVisibility(false, currentScrollY);
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateCategories);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const drawerCategories = useMemo(() => {
    const combined = [...mobileCategories, ...navigation];
    const unique = new Map(combined.map((item) => [`${item.label}-${item.href}`, item]));
    return Array.from(unique.values());
  }, [navigation]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`storefront-header-wrapper ${categoriesHidden ? "categories-hidden" : ""}`}>
        <div className="top-utility-bar">
          <div className="top-utility-container">
            <div className="top-bar-announcement">
              <span>Especialistas em tecnologia!</span>
            </div>
            <div className="top-bar-links">
              <Link href="/atendimento" className="top-link">
                <Headphones size={13} />
                <span>Atendimento</span>
              </Link>
              <Link href="/conta/pedidos" className="top-link">
                <PackageCheck size={13} />
                <span>Meus Pedidos</span>
              </Link>
              {instagramUrl && <div className="top-social-pills">
                <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Abrir Instagram da loja" className="social-pill">
                  <Instagram size={12} />
                </a>
              </div>}
            </div>
          </div>
        </div>

        <div className="main-header-bar">
          <div className="main-header-container">
            <Link
              href="/"
              className="brand storefront-brand brasil-store-logo-link"
              aria-label="Brasil Store, página inicial"
              onClick={closeMenu}
            >
              <img
                src="/brasil-store-logo.png"
                alt="Brasil Store"
                className="brasil-store-logo-img"
              />
            </Link>

            <form action="/celulares" className="trocafone-search-bar">
              <input
                name="q"
                aria-label="Buscar celulares e tecnologia"
                placeholder="O que você procura?"
              />
              <button type="submit" aria-label="Buscar">
                <Search size={18} />
              </button>
            </form>

            <nav className="header-user-actions" aria-label="Ações da conta">
              <Link
                href="/carrinho"
                className="cart-action-btn interactive-cart-btn"
                aria-label={`Carrinho com ${count} itens`}
              >
                <div className="cart-icon-shell">
                  <ShoppingCart size={20} className="cart-icon" />
                  {count > 0 && <b className="cart-badge-pulse">{count}</b>}
                </div>
                <span className="action-label">Carrinho</span>
              </Link>

              <Link
                href="/conta"
                className="user-login-btn interactive-user-btn"
                aria-label={authenticated ? "Minha conta" : "Entrar na conta"}
              >
                <div className="user-icon-shell">
                  <UserRound size={20} className="user-icon" />
                </div>
                <span className="action-label">{authenticated ? "Minha Conta" : "Entrar"}</span>
              </Link>

              <button
                type="button"
                className="mobile-menu-toggle"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </nav>
          </div>

          <MegaMenu customNavigation={navigation} />

          <nav className="mobile-category-strip" aria-label="Categorias da loja">
            {mobileCategories.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Fechar menu"
            onClick={closeMenu}
          />
          <aside className="mobile-menu-panel" aria-label="Menu principal">
            <div className="mobile-drawer-header">
              <strong>Links úteis</strong>
              <button type="button" onClick={closeMenu} aria-label="Fechar menu">
                <X size={18} />
              </button>
            </div>

            <nav className="mobile-useful-links" aria-label="Links úteis">
              <Link href="/conta/pedidos" onClick={closeMenu}>Meus pedidos</Link>
              <Link href="/conta" onClick={closeMenu}>Minha conta</Link>
              <Link href="/conta/favoritos" onClick={closeMenu}>Favoritos</Link>
              <Link href="/atendimento" onClick={closeMenu}>Atendimento</Link>
              <Link href="/celulares" onClick={closeMenu}>Todos os produtos</Link>
            </nav>

            <div className="mobile-drawer-section-title">Categorias</div>
            <nav className="mobile-drawer-categories" aria-label="Categorias">
              {drawerCategories.map((item) => (
                <Link key={`${item.label}-${item.href}`} href={item.href} onClick={closeMenu}>
                  <span><Smartphone size={15} />{item.label}</span>
                  <ChevronRight size={15} />
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}

      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        <Link href="/" aria-label="Início">
          <Home size={20} />
          <span>Início</span>
        </Link>
        <Link href="/conta/favoritos" aria-label="Favoritos">
          <Heart size={20} />
          <span>Favoritos</span>
        </Link>
        <Link href="/carrinho" className="mobile-bag-link" aria-label={`Sacola com ${count} itens`}>
          <span className="mobile-bag-icon">
            <ShoppingBag size={20} />
            {count > 0 && <b>{count}</b>}
          </span>
          <span>Sacola</span>
        </Link>
        <Link href="/conta/pedidos" aria-label="Meus pedidos">
          <PackageCheck size={20} />
          <span>Pedidos</span>
        </Link>
        <button
          type="button"
          className={menuOpen ? "active" : ""}
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}

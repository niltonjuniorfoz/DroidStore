"use client";

import Link from "next/link";
import {
  ChevronRight,
  Facebook,
  Headphones,
  Heart,
  Home,
  Instagram,
  Linkedin,
  Menu,
  PackageCheck,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import MegaMenu from "./MegaMenu";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesHidden, setCategoriesHidden] = useState(false);

  useEffect(() => {
    fetch("/api/site-content")
      .then((response) => response.json())
      .then((data) => {
        if (data.navigation?.length) setNavigation(data.navigation.slice(0, 8));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const distance = currentScrollY - previousScrollY;

      if (Math.abs(distance) < 7) return;
      setCategoriesHidden(distance > 0 && currentScrollY > 72);
      previousScrollY = currentScrollY;
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
              <div className="top-social-pills">
                <a href="#" aria-label="Facebook" className="social-pill">
                  <Facebook size={12} />
                </a>
                <a href="#" aria-label="X / Twitter" className="social-pill">
                  <span className="x-icon">X</span>
                </a>
                <a href="#" aria-label="Instagram" className="social-pill">
                  <Instagram size={12} />
                </a>
                <a href="#" aria-label="LinkedIn" className="social-pill">
                  <Linkedin size={12} />
                </a>
              </div>
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
                aria-label="Minha conta ou entrar"
              >
                <div className="user-icon-shell">
                  <UserRound size={20} className="user-icon" />
                </div>
                <span className="action-label">Entrar</span>
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

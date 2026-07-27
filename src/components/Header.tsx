"use client";

import Link from "next/link";
import {
  Facebook,
  Headphones,
  Heart,
  Instagram,
  Linkedin,
  Menu,
  PackageCheck,
  RefreshCw,
  Rss,
  Search,
  ShoppingCart,
  Smartphone,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

import MegaMenu from "./MegaMenu";

type MenuItem = { label: string; href: string };

export default function Header() {
  const { count } = useCart();
  const [storeName, setStoreName] = useState("Brasil Store");
  const [navigation, setNavigation] = useState<MenuItem[]>([
    { label: "Todos os celulares", href: "/celulares" },
    { label: "Novos", href: "/celulares?condition=Novo" },
    { label: "Seminovos", href: "/celulares?condition=Excelente" },
    { label: "Samsung", href: "/celulares?brand=Samsung" },
    { label: "Motorola", href: "/celulares?brand=Motorola" },
    { label: "iPhone", href: "/celulares?brand=Apple" },
  ]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/site-content")
      .then((response) => response.json())
      .then((data) => {
        if (data.content?.storeName) setStoreName(data.content.storeName);
        if (data.navigation?.length) setNavigation(data.navigation.slice(0, 8));
      })
      .catch(() => undefined);
  }, []);

  const visibleNavigation = navigation.slice(0, 8);

  return (
    <header className="storefront-header-wrapper">
      {/* Top Utility Bar (Trocafone style) */}
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
            <Link href="/blog" className="top-link">
              <Rss size={13} />
              <span>Blog</span>
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

      {/* Main Header */}
      <div className="main-header-bar">
        <div className="main-header-container">
          {/* Official Brasil Store Logo */}
          <Link
            href="/"
            className="brand storefront-brand brasil-store-logo-link"
            aria-label="Brasil Store, página inicial"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src="/brasil-store-logo.png"
              alt="Brasil Store"
              className="brasil-store-logo-img"
            />
          </Link>

          {/* Centralized Search Bar with Orange Button */}
          <form action="/celulares" className="trocafone-search-bar">
            <input
              name="q"
              aria-label="Buscar celulares e tecnologia"
              placeholder="Encontre a sua tecnologia..."
            />
            <button type="submit" aria-label="Buscar">
              <Search size={18} />
            </button>
          </form>

          {/* Actions: Cart & Account (Interactive & Alive) */}
          <nav className="header-user-actions" aria-label="Ações da conta">
            <Link href="/carrinho" className="cart-action-btn interactive-cart-btn" aria-label={`Carrinho com ${count} itens`}>
              <div className="cart-icon-shell">
                <ShoppingCart size={20} className="cart-icon" />
                {count > 0 && <b className="cart-badge-pulse">{count}</b>}
              </div>
              <span className="action-label">Carrinho</span>
            </Link>

            <Link href="/conta" className="user-login-btn interactive-user-btn" aria-label="Minha conta ou entrar">
              <div className="user-icon-shell">
                <UserRound size={20} className="user-icon" />
              </div>
              <span className="action-label">Entrar</span>
            </Link>

            <button
              className="mobile-menu-toggle"
              onClick={() => setMenuOpen((val) => !val)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
        </div>

        {/* Sub-Header Category Navigation (Trocafone Style Mega Menu) */}
        <MegaMenu customNavigation={navigation} />
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="mobile-menu-panel">
          <form action="/celulares" className="mobile-search-form">
            <input name="q" aria-label="Buscar produtos" placeholder="Encontre a sua tecnologia..." />
            <button type="submit">
              <Search size={16} />
            </button>
          </form>
          <nav className="mobile-nav">
            {visibleNavigation.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-user-links">
            <Link href="/carrinho" onClick={() => setMenuOpen(false)}>
              <ShoppingCart size={18} /> Carrinho ({count})
            </Link>
            <Link href="/conta" onClick={() => setMenuOpen(false)}>
              <UserRound size={18} /> Minha conta
            </Link>
            <Link href="/conta/favoritos" onClick={() => setMenuOpen(false)}>
              <Heart size={18} /> Favoritos
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}



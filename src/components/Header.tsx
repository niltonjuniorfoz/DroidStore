"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

type MenuItem = { label: string; href: string };

export default function Header() {
  const { count } = useCart();
  const [storeName, setStoreName] = useState("DroidStore");
  const [navigation, setNavigation] = useState<MenuItem[]>([
    { label: "Todos os celulares", href: "/celulares" },
    { label: "Novos", href: "/celulares?condition=Novo" },
    { label: "Seminovos", href: "/celulares?condition=Excelente" },
    { label: "Samsung", href: "/celulares?brand=Samsung" },
    { label: "Motorola", href: "/celulares?brand=Motorola" },
  ]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/site-content").then((response) => response.json()).then((data) => {
      if (data.content?.storeName) setStoreName(data.content.storeName);
      if (data.navigation?.length) setNavigation(data.navigation.slice(0, 5));
    }).catch(() => undefined);
  }, []);

  const visibleNavigation = navigation.slice(0, 5);
  return <header className="storefront-header">
    <div className="glass-header">
      <Link href="/" className="brand storefront-brand" aria-label={`${storeName}, página inicial`} onClick={() => setMenuOpen(false)}>
        <img className="header-mascot" src="/android-mascot.png" alt="" />
        <span><strong>Droid</strong><em>Store</em></span>
      </Link>
      <nav className="main-menu" aria-label="Menu principal">
        {visibleNavigation.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href}>{item.label}</Link>)}
      </nav>
      <form action="/celulares" className="glass-search">
        <Search aria-hidden />
        <input name="q" aria-label="Buscar produtos" placeholder="Buscar produtos..." />
      </form>
      <nav className="storefront-actions" aria-label="Ações da conta">
        <Link href="/conta" aria-label="Minha conta"><UserRound /></Link>
        <Link href="/conta/favoritos" aria-label="Favoritos"><Heart /></Link>
        <Link href="/carrinho" className="glass-cart" aria-label={`Carrinho com ${count} itens`}><ShoppingBag />{count > 0 && <b>{count}</b>}</Link>
      </nav>
      <button className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
    {menuOpen && <div className="mobile-menu-panel">
      <form action="/celulares"><Search /><input name="q" aria-label="Buscar produtos" placeholder="Buscar produtos..." /></form>
      <nav>{visibleNavigation.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</nav>
      <div><Link href="/conta" onClick={() => setMenuOpen(false)}><UserRound /> Minha conta</Link><Link href="/conta/favoritos" onClick={() => setMenuOpen(false)}><Heart /> Favoritos</Link></div>
    </div>}
  </header>;
}

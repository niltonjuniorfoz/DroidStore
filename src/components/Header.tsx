"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
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
import { signOut } from "next-auth/react";
import { useCart } from "./CartProvider";
import MegaMenu from "./MegaMenu";
import { useSiteContent } from "./SiteContentProvider";
import ProductImage from "./ProductImage";

type MenuItem = { label: string; href: string };
type SearchProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  condition: string;
  storage: string;
  color: string;
  price: number;
  stock: number;
  imageUrl?: string;
};
type QuickBuyState = {
  active: boolean;
  title: string;
  imageUrl?: string;
  details: string;
  pixDiscount: number;
  pixPrice: string;
  installments: string;
  disabled: boolean;
};

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
  { label: "Notebook", href: "/celulares?categoria=notebook" },
  { label: "Smartwatches", href: "/celulares?categoria=smartwatch" },
  { label: "Tablets", href: "/celulares?categoria=tablets" },
  { label: "Acessórios", href: "/celulares?categoria=acessorios" },
  { label: "Seminovos", href: "/celulares?condition=Excelente" },
];

const popularSearches = ["iPhone", "Samsung", "Xiaomi", "Notebook gamer", "Seminovos"];
const searchMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Header() {
  const { count } = useCart();
  const { content, navigation: siteNavigation } = useSiteContent();
  const navigation = siteNavigation.length ? siteNavigation.slice(0, 8) : defaultNavigation;
  const customerLoginEnabled = content?.customerLoginEnabled !== false;
  const [quickBuy, setQuickBuy] = useState<QuickBuyState | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionRole, setSessionRole] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesHidden, setCategoriesHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const categoriesHiddenRef = useRef(false);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      const params = new URLSearchParams({ limit: "6" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      else params.set("featured", "1");

      try {
        const response = await fetch(`/api/products?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("search-failed");
        setSearchResults(await response.json());
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, searchQuery.trim() ? 180 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const closeSearch = (event: PointerEvent) => {
      if (!searchShellRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    window.addEventListener("pointerdown", closeSearch);
    return () => window.removeEventListener("pointerdown", closeSearch);
  }, [searchOpen]);


  useEffect(() => {
    if (!accountOpen) return;

    const closeAccountMenu = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    window.addEventListener("pointerdown", closeAccountMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeAccountMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    const updateQuickBuy = (event: Event) => {
      setQuickBuy((event as CustomEvent<QuickBuyState>).detail);
    };
    window.addEventListener("product-quick-buy-state", updateQuickBuy);
    return () => window.removeEventListener("product-quick-buy-state", updateQuickBuy);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshAuthentication = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = response.ok ? await response.json() : null;
        if (!cancelled) {
          setAuthenticated(Boolean(session?.user));
          setSessionRole(String(session?.user?.role ?? ""));
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setSessionRole("");
        }
      }
    };

    const handleAuthenticationChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ authenticated?: boolean }>).detail;
      if (typeof detail?.authenticated === "boolean") {
        setAuthenticated(detail.authenticated);
        if (!detail.authenticated) {
          setSessionRole("");
          setAccountOpen(false);
        } else {
          void refreshAuthentication();
        }
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
  const closeSearch = () => {
    setSearchOpen(false);
    setActiveSearchIndex(-1);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeSearch();
      event.currentTarget.blur();
      return;
    }
    if (!searchResults.length || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    if (event.key === "Enter" && activeSearchIndex < 0) return;
    event.preventDefault();
    if (event.key === "ArrowDown") setActiveSearchIndex((current) => (current + 1) % searchResults.length);
    if (event.key === "ArrowUp") setActiveSearchIndex((current) => (current <= 0 ? searchResults.length - 1 : current - 1));
    if (event.key === "Enter") window.location.href = `/produto/${searchResults[activeSearchIndex].slug}`;
  };

  return (
    <>
      <header className={`storefront-header-wrapper ${categoriesHidden || quickBuy?.active ? "categories-hidden" : ""}`}>
        <div className="main-header-bar">
          <div className="main-header-container">
            <Link
              href="/"
              className="brand storefront-brand brasil-store-logo-link"
              aria-label="Aura Tech, página inicial"
              onClick={closeMenu}
            >
              <Image
                src="/aura-tech-logo.png"
                alt="Aura Tech"
                className="brasil-store-logo-img"
                width={1200}
                height={507}
                priority
                sizes="160px"
              />
            </Link>

            <div className="header-search-shell" ref={searchShellRef}>
              <form action="/celulares" className="trocafone-search-bar" onSubmit={closeSearch}>
                <Search className="header-search-leading-icon" size={17} aria-hidden="true" />
                <input
                  name="q"
                  value={searchQuery}
                  role="combobox"
                  aria-label="Buscar celulares e tecnologia"
                  aria-expanded={searchOpen}
                  aria-controls="header-search-suggestions"
                  aria-autocomplete="list"
                  placeholder="O que você procura?"
                  autoComplete="off"
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchOpen(true);
                    setActiveSearchIndex(-1);
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery && (
                  <button className="header-search-clear" type="button" aria-label="Limpar busca" onClick={() => setSearchQuery("")}>
                    <X size={16} />
                  </button>
                )}
                <button className="header-search-submit" type="submit" aria-label="Buscar">
                  <Search size={18} />
                </button>
              </form>

              {searchOpen && (
                <div id="header-search-suggestions" className="header-search-suggestions" role="listbox">
                  {!searchQuery.trim() && (
                    <div className="header-search-trending">
                      <span>Em alta</span>
                      <div>
                        {popularSearches.map((term) => (
                          <Link key={term} href={`/celulares?q=${encodeURIComponent(term)}`} onClick={closeSearch}>{term}</Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="header-search-results-head">
                    <strong>{searchQuery.trim() ? "Produtos encontrados" : "Produtos em destaque"}</strong>
                    {searchLoading && <span>Buscando...</span>}
                  </div>

                  <div className="header-search-results">
                    {!searchLoading && searchResults.length === 0 && (
                      <div className="header-search-empty">Nenhum produto encontrado.</div>
                    )}
                    {searchResults.map((product, index) => (
                      <Link
                        key={product.id}
                        href={`/produto/${product.slug}`}
                        role="option"
                        aria-selected={activeSearchIndex === index}
                        className={activeSearchIndex === index ? "is-active" : ""}
                        onMouseEnter={() => setActiveSearchIndex(index)}
                        onClick={closeSearch}
                      >
                        <div className="header-search-product-image">
                          <ProductImage src={product.imageUrl} alt={product.name} />
                        </div>
                        <div className="header-search-product-copy">
                          <strong>{product.name}</strong>
                          <span>{[product.brand, product.storage, product.condition].filter(Boolean).join(" • ")}</span>
                        </div>
                        <div className="header-search-product-price">
                          <strong>{searchMoney.format(product.price * (1 - (content?.pixDiscount ?? 10) / 100))}</strong>
                          <span>{product.stock > 0 ? "no PIX" : "Esgotado"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {searchQuery.trim() && (
                    <Link className="header-search-all" href={`/celulares?q=${encodeURIComponent(searchQuery.trim())}`} onClick={closeSearch}>
                      Ver todos os resultados <ChevronRight size={15} />
                    </Link>
                  )}
                </div>
              )}
            </div>

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

              {customerLoginEnabled && (
                <div className="account-menu-shell" ref={accountMenuRef}>
                  {authenticated ? (
                    <button
                      type="button"
                      className={`user-login-btn interactive-user-btn account-menu-trigger ${accountOpen ? "is-open" : ""}`}
                      aria-label="Abrir opções da minha conta"
                      aria-expanded={accountOpen}
                      aria-haspopup="menu"
                      onClick={() => {
                        setSearchOpen(false);
                        setAccountOpen((value) => !value);
                      }}
                    >
                      <div className="user-icon-shell">
                        <UserRound size={20} className="user-icon" />
                      </div>
                      <span className="action-label">Minha Conta</span>
                      <ChevronDown size={14} className="account-menu-chevron" aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="user-login-btn interactive-user-btn"
                      aria-label="Entrar na conta"
                    >
                      <div className="user-icon-shell">
                        <UserRound size={20} className="user-icon" />
                      </div>
                      <span className="action-label">Entrar</span>
                    </Link>
                  )}

                  {authenticated && accountOpen && (
                    <div className="account-menu-dropdown" role="menu" aria-label="Opções da minha conta">
                      <div className="account-menu-heading">
                        <strong>Minha conta</strong>
                        <span>Gerencie suas compras e dados</span>
                      </div>
                      <Link href="/conta" role="menuitem" onClick={() => setAccountOpen(false)}>
                        <UserRound size={17} />
                        <span><strong>Acessar minha conta</strong><small>Perfil, dados e endereços</small></span>
                      </Link>
                      <Link href="/conta/pedidos" role="menuitem" onClick={() => setAccountOpen(false)}>
                        <PackageCheck size={17} />
                        <span><strong>Meus pedidos</strong><small>Acompanhar compras e entregas</small></span>
                      </Link>
                      <Link href="/conta/favoritos" role="menuitem" onClick={() => setAccountOpen(false)}>
                        <Heart size={17} />
                        <span><strong>Favoritos</strong><small>Produtos salvos</small></span>
                      </Link>
                      {["ADMIN", "MANAGER"].includes(sessionRole) && (
                        <Link href="/admin" role="menuitem" className="account-menu-admin" onClick={() => setAccountOpen(false)}>
                          <LayoutDashboard size={17} />
                          <span><strong>Acessar área admin</strong><small>Painel de gestão da Aura Tech</small></span>
                        </Link>
                      )}
                      <button
                        type="button"
                        className="account-menu-logout"
                        role="menuitem"
                        onClick={() => {
                          setAccountOpen(false);
                          void signOut({ callbackUrl: "/" });
                        }}
                      >
                        <LogOut size={17} />
                        <span><strong>Sair da conta</strong><small>Encerrar sessão neste aparelho</small></span>
                      </button>
                    </div>
                  )}
                </div>
              )}

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

          {quickBuy && (
            <div
              className={`product-quick-buy-bar ${quickBuy.active ? "is-visible" : "is-hidden"}`}
              aria-label="Compra rápida do produto"
              aria-hidden={!quickBuy.active}
            >
              <div className="product-quick-buy-product">
                <div className="product-quick-buy-thumb" aria-hidden="true">
                  <ProductImage src={quickBuy.imageUrl} alt="" />
                </div>
                <div className="product-quick-buy-copy">
                  <small>Você está vendo</small>
                  <strong>{quickBuy.title}</strong>
                  <span>{quickBuy.details}</span>
                </div>
              </div>

              <div className="product-quick-buy-action">
                <div className="product-quick-buy-price">
                  <small>{quickBuy.pixDiscount}% OFF NO PIX</small>
                  <strong>{quickBuy.pixPrice}</strong>
                  <span>{quickBuy.installments}</span>
                </div>
                <button type="button" tabIndex={quickBuy.active ? 0 : -1} disabled={quickBuy.disabled} onClick={() => window.dispatchEvent(new Event("product-quick-buy-request"))}>
                  <ShoppingBag size={18} />
                  <span>{quickBuy.disabled ? "Produto esgotado" : "Adicionar à sacola"}</span>
                </button>
              </div>
            </div>
          )}
          <MegaMenu customNavigation={navigation} />
          <nav className="mobile-category-strip" aria-label="Categorias da loja">
            {mobileCategories.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href}>{item.label}</Link>
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

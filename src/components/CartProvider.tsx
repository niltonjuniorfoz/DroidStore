"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "../lib/catalog";

export type CartLine = Pick<CatalogProduct, "id" | "slug" | "name" | "brand" | "condition" | "storage" | "color" | "price" | "accent" | "imageUrl"> & { quantity: number };
type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  priceNotice: string | null;
  dismissPriceNotice: () => void;
  add: (product: CatalogProduct) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_KEY = "auratech-cart";
const LEGACY_CART_KEY = "droidstore-cart";

function loadSavedCart(): CartLine[] {
  const saved = window.localStorage.getItem(CART_KEY) ?? window.localStorage.getItem(LEGACY_CART_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved) as CartLine[];
  window.localStorage.removeItem(LEGACY_CART_KEY);
  return Array.isArray(parsed) ? parsed : [];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const savedItems = loadSavedCart();
      if (savedItems.length) {
        setItems(savedItems);

        // O preço salvo no navegador é só exibição: revalida contra a loja
        // para o cliente não ver um valor no carrinho e outro no checkout.
        void fetch("/api/products")
          .then((response) => response.json())
          .then((catalog: CatalogProduct[]) => {
            if (cancelled || !Array.isArray(catalog)) return;
            const byId = new Map(catalog.map((product) => [product.id, product]));
            let changed = 0;
            setItems((current) => current.map((item) => {
              const fresh = byId.get(item.id);
              if (!fresh) return item;
              if (fresh.price !== item.price) changed += 1;
              return {
                ...item,
                price: fresh.price,
                imageUrl: item.imageUrl ?? fresh.images?.[0] ?? fresh.imageUrl,
              };
            }));
            if (changed) {
              setPriceNotice(changed === 1
                ? "O preço de um item do carrinho foi atualizado pela loja."
                : `Os preços de ${changed} itens do carrinho foram atualizados pela loja.`);
            }
          })
          .catch(() => undefined);
      }
    } catch {
      // Carrinho corrompido no storage: começa vazio.
    } finally {
      setReady(true);
    }
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    drawerOpen,
    priceNotice,
    dismissPriceNotice() { setPriceNotice(null); },
    add(product) {
      setItems((current) => {
        const found = current.find((item) => item.id === product.id);
        if (found) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(5, item.quantity + 1) } : item);
        return [...current, {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          condition: product.condition,
          storage: product.storage,
          color: product.color,
          price: product.price,
          accent: product.accent,
          imageUrl: product.images?.[0] ?? product.imageUrl,
          quantity: 1,
        }];
      });
      setDrawerOpen(true);
    },
    remove(id) { setItems((current) => current.filter((item) => item.id !== id)); },
    setQuantity(id, quantity) {
      setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Math.min(5, quantity)) } : item));
    },
    clear() { setItems([]); },
    openDrawer() { setDrawerOpen(true); },
    closeDrawer() { setDrawerOpen(false); },
  }), [drawerOpen, items, priceNotice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de CartProvider");
  return context;
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "../lib/catalog";

export type CartLine = Pick<CatalogProduct, "id" | "slug" | "name" | "brand" | "condition" | "storage" | "color" | "price" | "accent" | "imageUrl"> & { quantity: number };
type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  add: (product: CatalogProduct) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = window.localStorage.getItem("droidstore-cart");
      if (saved) {
        const parsed = JSON.parse(saved) as CartLine[];
        const savedItems = Array.isArray(parsed) ? parsed : [];
        setItems(savedItems);

        const missingSlugs = Array.from(new Set(savedItems.filter((item) => !item.imageUrl).map((item) => item.slug)));
        if (missingSlugs.length) {
          void Promise.all(missingSlugs.map(async (slug) => {
            const response = await fetch(`/api/products/${encodeURIComponent(slug)}`);
            if (!response.ok) return [slug, undefined] as const;
            const product = await response.json() as CatalogProduct;
            return [slug, product.images?.[0] ?? product.imageUrl] as const;
          })).then((entries) => {
            if (cancelled) return;
            const images = new Map(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
            if (images.size) setItems((current) => current.map((item) => ({ ...item, imageUrl: item.imageUrl ?? images.get(item.slug) })));
          }).catch(() => undefined);
        }
      }
    } finally {
      setReady(true);
    }
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem("droidstore-cart", JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    drawerOpen,
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
  }), [drawerOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de CartProvider");
  return context;
}

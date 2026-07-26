"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "../lib/catalog";

export type CartLine = Pick<CatalogProduct, "id" | "slug" | "name" | "brand" | "condition" | "storage" | "color" | "price" | "accent"> & { quantity: number };
type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotal: number;
  add: (product: CatalogProduct) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("droidstore-cart");
      if (saved) setItems(JSON.parse(saved));
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem("droidstore-cart", JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    add(product) {
      setItems((current) => {
        const found = current.find((item) => item.id === product.id);
        if (found) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(5, item.quantity + 1) } : item);
        const { stock: _stock, description: _description, ...line } = product;
        return [...current, { ...line, quantity: 1 }];
      });
    },
    remove(id) { setItems((current) => current.filter((item) => item.id !== id)); },
    setQuantity(id, quantity) {
      setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Math.min(5, quantity)) } : item));
    },
    clear() { setItems([]); },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de CartProvider");
  return context;
}

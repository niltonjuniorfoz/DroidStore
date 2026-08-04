"use client";

import Link from "next/link";
import { Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "./CartProvider";
import { useSiteContent } from "./SiteContentProvider";
import ProductImage from "./ProductImage";

const drawerMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CartDrawer() {
  const { items, count, subtotal, drawerOpen, closeDrawer, remove, setQuantity, priceNotice, dismissPriceNotice } = useCart();
  const { content } = useSiteContent();
  const pixDiscount = content?.pixDiscount ?? 10;
  const pixTotal = subtotal * (1 - pixDiscount / 100);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeDrawer, drawerOpen]);

  if (!drawerOpen) return null;

  return (
    <div className="cart-drawer-layer" role="dialog" aria-modal="true" aria-label="Seu carrinho">
      <button className="cart-drawer-backdrop" type="button" aria-label="Fechar carrinho" onClick={closeDrawer} />
      <aside className="cart-drawer-panel">
        <header className="cart-drawer-header">
          <div className="cart-drawer-title-icon"><ShoppingBag size={20} /></div>
          <div>
            <strong>Seu carrinho</strong>
            <span>{count} {count === 1 ? "item" : "itens"}</span>
          </div>
          <button type="button" aria-label="Fechar carrinho" onClick={closeDrawer}><X size={20} /></button>
        </header>

        <div className="cart-drawer-benefits">
          <span><Truck size={15} /> Entrega calculada no checkout</span>
          <span><ShieldCheck size={15} /> Compra segura e protegida</span>
        </div>

        {priceNotice && items.length > 0 && (
          <div className="cart-drawer-benefits" role="status" style={{ background: "#fff7ee", color: "#8a5200" }}>
            <span>{priceNotice}</span>
            <button type="button" onClick={dismissPriceNotice} aria-label="Entendi" style={{ background: "none", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer" }}>OK</button>
          </div>
        )}

        <div className="cart-drawer-items">
          {items.length === 0 ? (
            <div className="cart-drawer-empty">
              <ShoppingBag size={30} />
              <strong>Sua sacola está vazia</strong>
              <span>Escolha seus produtos e eles aparecerão aqui.</span>
            </div>
          ) : items.map((item) => (
            <article className="cart-drawer-item" key={item.id}>
              <Link className="cart-drawer-item-image" href={`/produto/${item.slug}`} onClick={closeDrawer}>
                <ProductImage src={item.imageUrl} alt={item.name} />
              </Link>
              <div className="cart-drawer-item-main">
                <span>{item.brand} • {item.condition}</span>
                <Link href={`/produto/${item.slug}`} onClick={closeDrawer}>{item.name}</Link>
                <small>{item.storage} • {item.color}</small>
                <div className="cart-drawer-item-controls">
                  <div className="cart-drawer-quantity" aria-label={`Quantidade de ${item.name}`}>
                    <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Diminuir quantidade"><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label="Aumentar quantidade"><Plus size={14} /></button>
                  </div>
                  <strong>{drawerMoney.format(item.price * item.quantity)}</strong>
                  <button className="cart-drawer-remove" type="button" onClick={() => remove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="cart-drawer-summary">
          <div><span>Subtotal</span><strong>{drawerMoney.format(subtotal)}</strong></div>
          <div><span>Desconto no PIX</span><strong className="cart-drawer-saving">- {drawerMoney.format(subtotal - pixTotal)}</strong></div>
          <div className="cart-drawer-total"><span>Total no PIX</span><strong>{drawerMoney.format(pixTotal)}</strong></div>
          <Link className={`cart-drawer-checkout ${items.length ? "" : "is-disabled"}`} href={items.length ? "/checkout" : "#"} onClick={items.length ? closeDrawer : undefined} aria-disabled={!items.length}>
            <ShieldCheck size={18} /> Finalizar compra
          </Link>
          <button className="cart-drawer-continue" type="button" onClick={closeDrawer}>Continuar comprando</button>
        </footer>
      </aside>
    </div>
  );
}

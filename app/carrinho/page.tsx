"use client";

import Link from "next/link";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart } from "../../src/components/CartProvider";
import { useSiteContent } from "../../src/components/SiteContentProvider";
import { money } from "../../src/lib/catalog";

export default function CartPage() {
  const { items, subtotal, remove, setQuantity } = useCart();
  const { content } = useSiteContent();
  const pixDiscount = content?.pixDiscount ?? 10;
  const pixTotal = subtotal * (1 - pixDiscount / 100);
  if (!items.length) return <main className="empty-state page-empty"><h1>Seu carrinho está vazio</h1><p>Encontre um Android que combina com você.</p><Link className="button primary" href="/celulares">Ver celulares</Link></main>;
  return (
    <main className="cart-page">
      <h1>Seu carrinho</h1>
      <div className="cart-layout">
        <section className="cart-lines">
          {items.map((item) => (
            <article key={item.id} className="cart-line">
              <div className="mini-phone" style={{ background: item.accent }} />
              <div className="cart-description"><span>{item.brand} • {item.condition}</span><Link href={`/produto/${item.slug}`}>{item.name}</Link><small>{item.storage} • {item.color}</small></div>
              <div className="quantity"><button onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Diminuir quantidade"><Minus /></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label="Aumentar quantidade"><Plus /></button></div>
              <strong>{money(item.price * item.quantity)}</strong>
              <button className="remove" onClick={() => remove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 /></button>
            </article>
          ))}
        </section>
        <aside className="cart-summary"><h2>Resumo</h2><p><span>Subtotal</span><b>{money(subtotal)}</b></p><p><span>Frete</span><b>Calculado no checkout</b></p><hr /><small>Total no Pix ({pixDiscount}% de desconto)</small><strong>{money(pixTotal)}</strong><em>Você economiza {money(subtotal - pixTotal)}</em><Link className="button primary" href="/checkout">Ir para o checkout</Link><span className="secure-note"><ShieldCheck /> Compra protegida</span></aside>
      </div>
    </main>
  );
}

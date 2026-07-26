"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useCart } from "../../src/components/CartProvider";
import { money } from "../../src/lib/catalog";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pixDiscount, setPixDiscount] = useState(10);
  useEffect(() => {
    void fetch("/api/site-content").then((response) => response.json()).then((data) => setPixDiscount(data.content?.pixDiscount ?? 10));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      items: items.map((item) => ({ variantId: item.id, quantity: item.quantity })),
      shippingAddress: {
        zipCode: String(form.get("zipCode")).replace(/\D/g, ""),
        street: form.get("street"), number: form.get("number"), complement: form.get("complement") || undefined,
        neighborhood: form.get("neighborhood"), city: form.get("city"), state: String(form.get("state")).toUpperCase(),
      },
    };
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.demoMode) { clear(); setMessage(`${result.message} Pedido ${result.orderId}.`); }
      else if (result.checkoutUrl) { clear(); window.location.assign(result.checkoutUrl); }
      else if (result.preferenceId) setMessage(`Pagamento criado com segurança. Referência: ${result.preferenceId}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir."); }
    finally { setLoading(false); }
  }
  if (!items.length && !message) return <main className="empty-state page-empty"><h1>Não há itens para finalizar</h1><Link className="button primary" href="/celulares">Escolher celular</Link></main>;
  return (
    <main className="checkout-page">
      <div className="checkout-heading"><Link href="/carrinho">← Voltar ao carrinho</Link><span><LockKeyhole /> Checkout seguro</span></div>
      {message ? <section className="checkout-success" role="status"><h1>Pedido recebido</h1><p>{message}</p><Link className="button primary" href="/conta/pedidos">Acompanhar pedidos</Link></section> :
      <form onSubmit={submit} className="checkout-layout">
        <div className="checkout-form">
          <section><span className="step">1</span><h2>Entrega</h2><div className="form-grid"><label>CEP<input required name="zipCode" inputMode="numeric" pattern="[0-9 -]{8,9}" /></label><label className="wide">Rua<input required name="street" /></label><label>Número<input required name="number" /></label><label>Complemento<input name="complement" /></label><label>Bairro<input required name="neighborhood" /></label><label>Cidade<input required name="city" /></label><label>UF<input required name="state" maxLength={2} /></label></div></section>
          <section><span className="step">2</span><h2>Pagamento</h2><div className="payment-choice"><label><input type="radio" defaultChecked name="payment" /> Pix <small>{pixDiscount}% de desconto</small></label><label><input type="radio" name="payment" disabled /> Cartão <small>Disponível após configurar o gateway</small></label></div></section>
        </div>
        <aside className="cart-summary"><h2>Seu pedido</h2>{items.map((item) => <p key={item.id}><span>{item.quantity}x {item.name}</span><b>{money(item.price * item.quantity)}</b></p>)}<hr /><small>Total no Pix</small><strong>{money(subtotal * (1 - pixDiscount / 100))}</strong><button className="button primary" disabled={loading}>{loading ? "Processando..." : "Finalizar pedido"}</button><em>O valor e o estoque serão confirmados novamente pelo servidor.</em></aside>
      </form>}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import ProductImage from "../../../src/components/ProductImage";

type Favorite = {
  id: string; product: { id: string; slug: string; name: string; brand: string; imageUrl: string | null; images: Array<{ url: string }>; variants: Array<{ price: string; storage: string | null }> };
};
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FavoritosPage() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    const response = await fetch("/api/account/favorites", { cache: "no-store" });
    if (response.ok) setItems(await response.json());
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function remove(productId: string) {
    await fetch("/api/account/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    await load();
  }
  return <section className="profile-card">
    <header><div><span className="eyebrow">Lista salva</span><h2>Favoritos</h2><p>Produtos que você guardou para consultar depois.</p></div><span className="verified"><Heart /> {items.length} salvo(s)</span></header>
    {loading ? <div className="admin-loading">Carregando favoritos...</div> : <div className="favorite-grid">{items.map(({ product }) => {
      const image = product.images[0]?.url ?? product.imageUrl;
      const variant = product.variants[0];
      return <article key={product.id}><Link href={`/produto/${product.slug}`} className="favorite-image"><ProductImage src={image} alt={product.name} /></Link><div><small>{product.brand}</small><Link href={`/produto/${product.slug}`}><strong>{product.name}</strong></Link>{variant ? <span>A partir de {money(Number(variant.price))}</span> : <span>Indisponível</span>}</div><button onClick={() => void remove(product.id)} aria-label="Remover favorito"><Trash2 /></button></article>;
    })}{!items.length && <div className="empty-inline"><Heart /><p>Nenhum favorito salvo ainda.</p><Link className="button primary" href="/celulares">Explorar celulares</Link></div>}</div>}
  </section>;
}

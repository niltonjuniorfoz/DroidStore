"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { useAuthGate } from "./AuthGateProvider";
import { money, type CatalogProduct } from "../lib/catalog";

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const { add } = useCart();
  const { requireAuth } = useAuthGate();
  const pixPrice = product.price * 0.9;
  const productType = product.filters?.find((filter) => filter.groupSlug === "tipo-de-produto")?.optionLabel;
  const primaryImage = product.images?.[0] ?? product.imageUrl;
  const secondaryImage = product.images?.[1];

  return <article className="product-card">
    <div className="product-visual" style={{ "--phone": product.accent } as React.CSSProperties}>
      <Link href={`/produto/${product.slug}`} className="product-image-link" aria-label={`Ver ${product.name}`}>
        <span className="condition">{product.condition}</span>
        {primaryImage ? <>
          <img className="catalog-photo product-photo-primary" src={primaryImage} alt={product.name} />
          {secondaryImage && <img className="catalog-photo product-photo-secondary" src={secondaryImage} alt="" />}
        </> : <span className="phone-shape"><i /></span>}
      </Link>
    </div>
    <div className="product-body">
      <Link href={`/produto/${product.slug}`}><h3>{product.name}</h3></Link>
      <div className="product-card-taxonomy">{productType && <span>{productType}</span>}<b>{product.brand}</b></div>
      <div className="product-price"><small>no Pix</small><strong>{money(pixPrice)}</strong><span>ou 12x de {money(product.price / 12)}</span></div>
      <button className="card-buy-button" disabled={product.stock === 0} onClick={() => void requireAuth(() => add(product))} aria-label={product.stock === 0 ? `${product.name} indisponível` : `Adicionar ${product.name} ao carrinho`}><ShoppingBag /><span>{product.stock === 0 ? "Indisponível" : "Comprar"}</span></button>
    </div>
  </article>;
}

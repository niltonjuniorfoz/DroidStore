"use client";

import Link from "next/link";
import { CreditCard, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { useAuthGate } from "./AuthGateProvider";
import { money, type CatalogProduct } from "../lib/catalog";

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const { add } = useCart();
  const { requireAuth } = useAuthGate();
  
  // Configuração do Desconto PIX (10% OFF)
  const pixDiscountPercent = 10;
  const pixPrice = product.price * (1 - pixDiscountPercent / 100);

  // Parcelamento no Cartão
  const installmentNoInterest = product.price > 0 ? product.price / 12 : 0;
  const totalWithInterest = product.price * 1.285;
  const installmentWithInterest = product.price > 0 ? totalWithInterest / 21 : 0;

  const primaryImage = product.images?.[0] ?? product.imageUrl;
  const secondaryImage = product.images?.[1];
  const isAvailable = product.stock > 0;

  return (
    <article className={`product-card ${!isAvailable ? "is-out-of-stock" : ""}`}>
      <div className="product-visual" style={{ "--phone": product.accent } as React.CSSProperties}>
        <Link href={`/produto/${product.slug}`} className="product-image-link" aria-label={`Ver ${product.name}`}>
          <span className="condition">{product.condition}</span>
          <span className="discount-badge-top-right">{pixDiscountPercent}% OFF NO PIX</span>
          {primaryImage ? (
            <>
              <img className="catalog-photo product-photo-primary" src={primaryImage} alt={product.name} />
              {secondaryImage && <img className="catalog-photo product-photo-secondary" src={secondaryImage} alt="" />}
            </>
          ) : (
            <span className="phone-shape"><i /></span>
          )}
        </Link>
      </div>

      <div className="product-body">
        <div className="product-info-top">
          <Link href={`/produto/${product.slug}`} className="product-title-link">
            <h3 className="product-card-clean-title">{product.name}</h3>
          </Link>
        </div>
        
        {/* BLOCO DE PREÇO E DESTAQUE DE PARCELAMENTO */}
        <div className="product-price">
          <div className="pix-amount-wrapper">
            <span className="pix-from-label">A partir de</span>
            <div className="pix-main-row">
              <strong className="pix-amount-val">{money(pixPrice)}</strong>
            </div>
            <span className="pix-sub-label">no pix à vista</span>
          </div>

          <div className="card-installments-block">
            <CreditCard className="card-payment-icon" />
            <div className="installments-lines">
              <span className="installment-line-item">
                Até <b>12x</b> de <b className="val-text">{money(installmentNoInterest)}</b> s/ juros
              </span>
              <span className="installment-line-item">
                ou <b>21x</b> de <b className="val-text">{money(installmentWithInterest)}</b> c/ juros
              </span>
            </div>
          </div>
        </div>

        <button
          className={`card-buy-button ${!isAvailable ? "disabled-btn" : ""}`}
          disabled={!isAvailable}
          onClick={() => void requireAuth(() => add(product))}
          aria-label={!isAvailable ? `${product.name} indisponível` : `Adicionar ${product.name} ao carrinho`}
        >
          {isAvailable && <ShoppingBag className="btn-bag-icon" />}
          <span>{isAvailable ? "Comprar" : "Indisponível"}</span>
        </button>
      </div>
    </article>
  );
}

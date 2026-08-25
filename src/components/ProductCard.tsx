"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, CreditCard, Flame, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { useAuthGate } from "./AuthGateProvider";
import ProductImage from "./ProductImage";
import { money, type CatalogProduct } from "../lib/catalog";
import { useSiteContent } from "./SiteContentProvider";
import { isCatalogProductAvailable } from "../lib/storeMode";

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const { add } = useCart();
  const { requireAuth } = useAuthGate();
  const { content } = useSiteContent();
  // Desconto próprio do produto vence o padrão da loja.
  const pixDiscountPercent = product.pixDiscountPct ?? content?.pixDiscount ?? 10;
  const pixPrice = product.price * (1 - pixDiscountPercent / 100);
  const installmentNoInterest = product.price > 0 ? product.price / 12 : 0;
  const totalWithInterest = product.price * 1.285;
  const installmentWithInterest = product.price > 0 ? totalWithInterest / 21 : 0;
  const primaryImage = product.images?.[0] ?? product.imageUrl;
  const secondaryImage = product.images?.[1];
  const isAvailable = isCatalogProductAvailable(product);
  const isOutlet = product.condition === "Outlet";
  const hasGroupedVariants = (product.variantCount ?? 1) > 1;
  const productHref = `/produto/${product.slug}`;
  const variantSummary = hasGroupedVariants
    ? `${product.availableColors?.length ?? 0} cores · ${product.availableStorages?.join(", ") ?? ""}`
    : "";

  return (
    <article
      className={`product-card ${!isAvailable ? "is-out-of-stock" : ""}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a, button")) return;
        router.push(productHref);
      }}
    >
      <div className="product-visual" style={{ "--phone": product.accent } as React.CSSProperties}>
        <Link href={productHref} className="product-image-link" aria-label={`Ver ${product.name}`}>
          <span className={`condition ${isOutlet ? "is-outlet" : ""}`}>{isOutlet && <Flame aria-hidden="true" />}{product.condition}</span>
          <span className="discount-badge-top-right">{pixDiscountPercent}% OFF NO PIX</span>
          {product.model3dUrl && (
            <span
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                zIndex: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(16, 185, 129, 0.95)",
                color: "#ffffff",
                padding: "3px 8px",
                borderRadius: "999px",
                fontSize: "0.65rem",
                fontWeight: 800,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                backdropFilter: "blur(4px)",
              }}
            >
              <Box style={{ width: "12px", height: "12px" }} />
              <span>3D 360°</span>
            </span>
          )}
          {primaryImage ? (
            <>
              <ProductImage className="catalog-photo product-photo-primary" src={primaryImage} alt={product.name} />
              {secondaryImage && <ProductImage className="catalog-photo product-photo-secondary" src={secondaryImage} alt="" />}
            </>
          ) : (
            <ProductImage alt="" />
          )}
        </Link>
      </div>

      <div className="product-body">
        <div className="product-info-top">
          <Link href={productHref} className="product-title-link">
            <h3 className="product-card-clean-title">{product.name}</h3>
          </Link>
          {variantSummary && <span className="product-variant-summary">{variantSummary}</span>}
        </div>

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

        {hasGroupedVariants && isAvailable ? (
          <Link className="card-buy-button" href={productHref} aria-label={`Ver opções de ${product.name}`}>
            <span>Ver opções</span>
          </Link>
        ) : (
          <button
            className={`card-buy-button ${!isAvailable ? "disabled-btn" : ""}`}
            disabled={!isAvailable}
            onClick={() => void requireAuth(() => add(product))}
            aria-label={!isAvailable ? `${product.name} indisponível` : `Adicionar ${product.name} ao carrinho`}
          >
            {isAvailable && <ShoppingBag className="btn-bag-icon" />}
            <span>{isAvailable ? "Comprar" : "Indisponível"}</span>
          </button>
        )}
      </div>
    </article>
  );
}

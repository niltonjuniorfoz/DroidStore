import Link from "next/link";
import { ArrowRight, ShoppingBag, Tag } from "lucide-react";
import type { CatalogProduct } from "../lib/catalog";
import { money } from "../lib/catalog";
import ProductImage from "./ProductImage";

type Props = {
  title: string;
  buttonLabel: string;
  buttonHref: string;
  products: CatalogProduct[];
};

function productCategory(product: CatalogProduct) {
  return product.filters?.find((filter) =>
    ["categoria", "tipo-de-produto"].includes(filter.groupSlug)
  )?.optionLabel ?? product.brand;
}

function OutletProductCard({ product, featured = false }: { product: CatalogProduct; featured?: boolean }) {
  const href = `/produto/${product.slug}`;
  const primaryImage = product.images?.[0] ?? product.imageUrl;
  const secondaryImage = product.images?.[1];
  const category = productCategory(product);

  return (
    <article className={`outlet-mosaic-card ${featured ? "is-featured" : "is-compact"}`}>
      <Link className="outlet-card-media" href={href} aria-label={`Ver ${product.name}`}>
        {primaryImage ? (
          <>
            <ProductImage className="outlet-product-photo outlet-photo-primary" src={primaryImage} alt={product.name} />
            {secondaryImage && (
              <ProductImage className="outlet-product-photo outlet-photo-secondary" src={secondaryImage} alt="" />
            )}
          </>
        ) : (
          <ProductImage className="outlet-product-photo" alt="" />
        )}
      </Link>

      <div className="outlet-card-copy">
        <div className="outlet-card-main">
          <span className="outlet-card-brand">{product.brand}</span>
          <Link href={href} className="outlet-card-title-link">
            <h3>{product.name}</h3>
          </Link>
          <span className="outlet-card-category">{category}</span>
          <span className="outlet-card-meta">{[product.storage, product.color].filter(Boolean).join(" · ")}</span>
        </div>

        <div className="outlet-card-bottom">
          <div className="outlet-card-price">
            <small>A partir de</small>
            <strong>{money(product.price)}</strong>
            <span>no pix à vista</span>
          </div>

          <div className="outlet-card-footer">
            <span className="outlet-card-sku">{product.sku ?? ""}</span>
            <Link className="outlet-card-action" href={href} aria-label={`Comprar ${product.name}`}>
              <ShoppingBag size={featured ? 17 : 14} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HomeOutletMosaic({ title, buttonLabel, buttonHref, products }: Props) {
  const visible = products.slice(0, 6);
  if (!visible.length) return null;

  return (
    <section className="home-section home-outlet-section">
      <header className="special-home-heading">
        <h2><Tag size={17} aria-hidden="true" /> {title}</h2>
        <Link href={buttonHref}>{buttonLabel} <ArrowRight size={14} /></Link>
      </header>

      <div className="outlet-mosaic-grid">
        {visible.map((product, index) => (
          <OutletProductCard
            key={product.id}
            product={product}
            featured={index === 0 || index === 5}
          />
        ))}
      </div>
    </section>
  );
}

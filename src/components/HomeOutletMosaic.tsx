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

function OutletProductCard({ product, featured = false }: { product: CatalogProduct; featured?: boolean }) {
  const href = `/produto/${product.slug}`;
  const image = product.images?.[0] ?? product.imageUrl;

  return (
    <article className={`outlet-mosaic-card ${featured ? "is-featured" : "is-compact"}`}>
      <Link className="outlet-card-media" href={href} aria-label={`Ver ${product.name}`}>
        {image ? <ProductImage src={image} alt={product.name} /> : <ProductImage alt="" />}
      </Link>
      <div className="outlet-card-copy">
        <span className="outlet-card-brand">{product.brand}</span>
        <Link href={href}><h3>{product.name}</h3></Link>
        <span className="outlet-card-meta">{[product.storage, product.color].filter(Boolean).join(" · ")}</span>
        <div className="outlet-card-price">
          <small>{featured ? "Preço Outlet" : "Outlet"}</small>
          <strong>{money(product.price)}</strong>
          <span>à vista</span>
        </div>
        <Link className="outlet-card-action" href={href} aria-label={`Comprar ${product.name}`}>
          <ShoppingBag size={featured ? 17 : 14} />
        </Link>
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

import type { CatalogProduct } from "../lib/catalog";
import ProductCard from "./ProductCard";

export default function FeaturedCarousel({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (!products.length) return null;

  return (
    <section className="home-section featured-carousel-section">
      <header className="home-shelf-heading">
        <h2>{title}</h2>
      </header>
      <div className="featured-carousel-viewport">
        <div className="product-grid featured-grid">
          {products.slice(0, 10).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

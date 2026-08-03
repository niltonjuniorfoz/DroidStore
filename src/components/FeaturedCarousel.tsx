import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";
import type { CatalogProduct } from "../lib/catalog";
import ProductCard from "./ProductCard";

export default function FeaturedCarousel({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (!products.length) return null;

  return (
    <section className="home-section featured-carousel-section best-sellers-section">
      <header className="home-shelf-heading">
        <h2>
          <Smartphone className="mobile-shelf-icon" aria-hidden="true" />
          <span>{title}</span>
        </h2>
        <Link className="mobile-shelf-link" href="/celulares?categoria=smartphones">
          Ver todos <ArrowRight size={14} />
        </Link>
      </header>

      <div className="best-sellers-grid" aria-label={`${title}: 10 produtos`}>
        {products.slice(0, 10).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

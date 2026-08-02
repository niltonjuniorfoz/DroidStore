import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";
import type { CatalogProduct } from "../lib/catalog";
import MobileAutoCarousel from "./MobileAutoCarousel";
import ProductCard from "./ProductCard";

export default function FeaturedCarousel({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (!products.length) return null;

  return (
    <section className="home-section featured-carousel-section">
      <header className="home-shelf-heading">
        <h2>
          <Smartphone className="mobile-shelf-icon" aria-hidden="true" />
          <span className="desktop-shelf-title">{title}</span>
          <span className="mobile-shelf-title">Smartphones</span>
        </h2>
        <Link className="mobile-shelf-link" href="/celulares?categoria=smartphones">
          Ver todos <ArrowRight size={14} />
        </Link>
      </header>
      <div className="featured-carousel-viewport">
        <MobileAutoCarousel className="featured-grid" label="Smartphones em destaque">
          {products.slice(0, 10).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </MobileAutoCarousel>
      </div>
    </section>
  );
}

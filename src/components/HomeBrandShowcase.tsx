import Link from "next/link";
import { ArrowRight, Watch } from "lucide-react";
import type { CatalogProduct } from "../lib/catalog";
import type { HomeBrandShowcase } from "../lib/homeContent";
import MobileAutoCarousel from "./MobileAutoCarousel";
import ProductCard from "./ProductCard";
import ProductImage from "./ProductImage";

export default function HomeBrandShowcase({
  config,
  products,
}: {
  config: HomeBrandShowcase;
  products: CatalogProduct[];
}) {
  return (
    <section className="home-section home-brand-showcase garmin-showcase">
      <header className="special-home-heading">
        <h2><Watch size={17} aria-hidden="true" /> {config.title}</h2>
        <Link href={config.buttonHref}>{config.buttonLabel} <ArrowRight size={14} /></Link>
      </header>

      <div className="home-brand-showcase-body">
        <Link className="home-brand-banner" href={config.buttonHref} aria-label={`Ver linha ${config.title}`}>
          <ProductImage src={config.bannerImageUrl} alt={`Linha ${config.title} Aura Tech`} />
        </Link>

        <div className="home-brand-products">
          {products.length ? (
            <MobileAutoCarousel label={`Produtos ${config.title}`} className="brand-showcase-track">
              {products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
            </MobileAutoCarousel>
          ) : (
            <div className="home-brand-empty">
              <strong>Produtos {config.title} em breve</strong>
              <span>O banner já está ativo e o carrossel aparece assim que houver produtos correspondentes.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

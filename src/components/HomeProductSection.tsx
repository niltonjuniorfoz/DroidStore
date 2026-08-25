import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import type { CatalogProduct } from "../lib/catalog";
import MobileAutoCarousel from "./MobileAutoCarousel";
import ProductCard from "./ProductCard";

type Props = {
  title: string;
  buttonLabel: string;
  buttonHref: string;
  products: CatalogProduct[];
};

export default function HomeProductSection({ title, buttonLabel, buttonHref, products }: Props) {
  if (!products.length) return null;

  return (
    <section className="home-section home-product-shelf">
      <header className="home-shelf-heading">
        <h2><Tags className="mobile-shelf-icon" aria-hidden="true" />{title}</h2>
        <Link href={buttonHref}>{buttonLabel} <ArrowRight size={14} /></Link>
      </header>
      <MobileAutoCarousel label={`Produtos de ${title}`}>
        {products.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}
      </MobileAutoCarousel>
    </section>
  );
}

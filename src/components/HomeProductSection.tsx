import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CatalogProduct } from "../lib/catalog";
import ProductCard from "./ProductCard";

type Props = {
  title: string;
  buttonLabel: string;
  buttonHref: string;
  products: CatalogProduct[];
};

export default function HomeProductSection({ title, buttonLabel, buttonHref, products }: Props) {
  return (
    <section className="home-section home-product-shelf">
      <header className="home-shelf-heading">
        <h2>{title}</h2>
        <Link href={buttonHref}>{buttonLabel} <ArrowRight size={14} /></Link>
      </header>
      {products.length ? (
        <div className="product-grid">
          {products.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="home-shelf-empty"><strong>Novidades em breve</strong><span>Estamos preparando novos produtos para esta seleção.</span></div>
      )}
    </section>
  );
}

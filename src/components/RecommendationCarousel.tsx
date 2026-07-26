"use client";

import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useRef } from "react";
import type { CatalogProduct } from "../lib/catalog";
import ProductCard from "./ProductCard";

export default function RecommendationCarousel({ products }: { products: CatalogProduct[] }) {
  const rail = useRef<HTMLDivElement>(null);

  function move(direction: number) {
    rail.current?.scrollBy({ left: direction * Math.min(760, rail.current.clientWidth * .8), behavior: "smooth" });
  }

  if (!products.length) return null;
  return <section className="recommendation-shell">
    <header className="recommendation-header">
      <span><Home /> Quem viu esse produto também gostou</span>
      <div>
        <button type="button" onClick={() => move(-1)} aria-label="Produtos anteriores"><ChevronLeft /></button>
        <button type="button" onClick={() => move(1)} aria-label="Próximos produtos"><ChevronRight /></button>
      </div>
    </header>
    <div className="recommendation-rail" ref={rail}>
      {products.map((product) => <ProductCard product={product} key={product.id} />)}
    </div>
  </section>;
}

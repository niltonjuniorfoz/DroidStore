"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct } from "../lib/catalog";
import ProductCard from "./ProductCard";

export default function FeaturedCarousel({ products }: { products: CatalogProduct[] }) {
  const [currentPage, setCurrentPage] = useState(0);

  // 10 telefones por passada (60 telefones no total = 6 passadas)
  const itemsPerPage = 10;
  const totalPages = Math.min(6, Math.ceil(products.length / itemsPerPage)) || 1;

  // Auto-play a cada 7.5 segundos para alternar automaticamente as passadas de ofertas
  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 7500);
    return () => clearInterval(timer);
  }, [totalPages]);

  if (!products.length) return null;

  const currentProducts = products.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <section className="home-section featured-carousel-section">
      <div className="featured-carousel-viewport">
        <div className="product-grid featured-grid">
          {currentProducts.map((product) => (
            <ProductCard key={`${product.id}-${currentPage}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

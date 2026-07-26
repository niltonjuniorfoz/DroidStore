"use client";

import Link from "next/link";
import {
  BadgeCheck, CreditCard, Heart, PackageCheck, ShieldCheck, ShoppingBag, Truck,
} from "lucide-react";
import { use, useEffect, useMemo, useState } from "react";
import { useCart } from "../../../src/components/CartProvider";
import { useAuthGate } from "../../../src/components/AuthGateProvider";
import RecommendationCarousel from "../../../src/components/RecommendationCarousel";
import { findProduct, money, type CatalogProduct } from "../../../src/lib/catalog";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [product, setProduct] = useState<CatalogProduct | undefined>(findProduct(slug));
  const [selectedImage, setSelectedImage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [pixDiscount, setPixDiscount] = useState(10);
  const [maxInstallments, setMaxInstallments] = useState(12);
  const [recommendations, setRecommendations] = useState<CatalogProduct[]>([]);
  const { add } = useCart();
  const { requireAuth } = useAuthGate();

  useEffect(() => {
    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((item) => {
        setProduct(item);
        setSelectedImage(0);
      })
      .catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    void fetch("/api/site-content").then((response) => response.json()).then((data) => {
      if (data.content) {
        setPixDiscount(data.content.pixDiscount ?? 10);
        setMaxInstallments(data.content.maxInstallments ?? 12);
      }
    });
    void fetch("/api/account/favorites", { cache: "no-store" }).then(async (response) => {
      if (response.ok) {
        const favorites: Array<{ product: { slug: string } }> = await response.json();
        setFavorite(favorites.some((item) => item.product.slug === slug));
      }
    });
    void fetch("/api/products").then((response) => response.json()).then((items: CatalogProduct[]) => {
      setRecommendations(items.filter((item) => item.slug !== slug).slice(0, 12));
    }).catch(() => undefined);
  }, [slug]);

  async function toggleFavorite() {
    if (!product) return;
    const response = await fetch("/api/account/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.productId ?? product.id }),
    });
    if (response.status === 401) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(`/produto/${slug}`)}`;
      return;
    }
    if (response.ok) setFavorite((await response.json()).favorite);
  }

  const images = useMemo(() => {
    if (!product) return [];
    return product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  if (!product) {
    return <main className="empty-state page-empty"><h1>Carregando produto...</h1></main>;
  }

  const specifications = product.specifications?.length ? product.specifications : [
    { label: "Marca", value: product.brand },
    { label: "Armazenamento", value: product.storage },
    { label: "Cor", value: product.color },
    { label: "Sistema operacional", value: "Android" },
    { label: "Condição", value: product.condition },
  ];
  const descriptionParagraphs = product.description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="product-page">
      <nav className="breadcrumbs">
        <Link href="/">Início</Link><span>/</span>
        <Link href="/celulares">Smartphones</Link><span>/</span>
        <span>{product.brand}</span>
      </nav>

      <section className="product-showcase">
        <div className="product-gallery">
          <div className="gallery-main" style={{ "--phone": product.accent } as React.CSSProperties}>
            {images[selectedImage]
              ? <img src={images[selectedImage]} alt={`${product.name} - foto ${selectedImage + 1}`} />
              : <span className="phone-shape large"><i /></span>}
          </div>
          {images.length > 1 && <div className="gallery-thumbnails" aria-label="Fotos do produto">
            {images.slice(0, 4).map((image, index) => <button
              type="button"
              key={`${image}-${index}`}
              className={selectedImage === index ? "active" : ""}
              onClick={() => setSelectedImage(index)}
              aria-label={`Ver foto ${index + 1}`}
            >
              <img src={image} alt="" />
            </button>)}
          </div>}
        </div>

        <div className="product-summary">
          <div className="product-code"><span>{product.brand}</span><small>Cód. {product.id.slice(0, 8).toUpperCase()}</small></div>
          <h1>{product.name}</h1>
          <button className={`favorite-button ${favorite ? "active" : ""}`} onClick={() => void toggleFavorite()}><Heart /> {favorite ? "Salvo nos favoritos" : "Adicionar aos favoritos"}</button>
          <div className="summary-chips">
            <span>{product.storage}</span><span>{product.color}</span><span>{product.condition}</span>
          </div>

          <div className="availability">
            <PackageCheck />
            <div><strong>{product.stock ? "Disponível para compra" : "Produto esgotado"}</strong><small>{product.stock ? "Envio após a confirmação do pagamento" : "Avise-me quando chegar"}</small></div>
          </div>

          <div className="purchase-card">
            <small>Preço no Pix com {pixDiscount}% de desconto</small>
            <strong>{money(product.price * (1 - pixDiscount / 100))}</strong>
            <p><CreditCard /> ou {maxInstallments}x de <b>{money(product.price / maxInstallments)}</b> sem juros</p>
            <span>Preço normal: {money(product.price)}</span>
            <button className="buy-button" disabled={!product.stock} onClick={() => void requireAuth(() => add(product))}>
              <ShoppingBag /> Adicionar ao carrinho
            </button>
          </div>

          <div className="summary-trust">
            <span><BadgeCheck /><b>Compra segura</b><small>Pagamento protegido</small></span>
            <span><Truck /><b>Envio rastreado</b><small>Acompanhe o pedido</small></span>
            <span><ShieldCheck /><b>Garantia</b><small>Conforme o anúncio</small></span>
          </div>
        </div>
      </section>

      <section className="product-content">
        <article className="product-description">
          <span className="eyebrow">Conheça o produto</span>
          <h2>Descrição</h2>
          <div className="description-copy">{descriptionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        </article>

        <article className="product-specifications">
          <span className="eyebrow">Ficha técnica</span>
          <h2>Especificações</h2>
          <div className="specification-table">
            {specifications.map((item, index) => <div key={`${item.label}-${index}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>)}
          </div>
          <p className="spec-disclaimer">Confira as informações antes da compra. Características e itens inclusos podem variar conforme o modelo cadastrado.</p>
        </article>
      </section>

      <RecommendationCarousel products={recommendations} />
    </main>
  );
}

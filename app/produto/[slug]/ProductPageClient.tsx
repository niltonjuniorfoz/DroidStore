"use client";

import Link from "next/link";
import {
  BadgeCheck, Box, CreditCard, Heart, PackageCheck, ShieldCheck, ShoppingBag, Truck,
} from "lucide-react";
import ModelViewer3D from "../../../src/components/ModelViewer3D";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../../../src/components/CartProvider";
import { useAuthGate } from "../../../src/components/AuthGateProvider";
import { useSiteContent } from "../../../src/components/SiteContentProvider";
import RecommendationCarousel from "../../../src/components/RecommendationCarousel";
import ProductImage from "../../../src/components/ProductImage";
import {
  getBaseModelName,
  getCatalogSection,
  money,
  type CatalogProduct,
} from "../../../src/lib/catalog";
import { getProductColorHex } from "../../../src/lib/productStandards";

type ProductVariantOption = {
  id: string;
  productId: string;
  slug: string;
  color: string;
  storage: string;
  condition: CatalogProduct["condition"];
  price: number;
  stock: number;
  available: boolean;
  imageUrl?: string;
  model3dUrl?: string | null;
};


function parseStorageInMb(storageStr: string): number {
  const match = storageStr.match(/(\d+)\s*(GB|TB|MB)/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();
  if (unit === "TB") return num * 1024 * 1024;
  if (unit === "GB") return num * 1024;
  return num;
}

type ProductPageClientProps = {
  slug: string;
  initialProduct: CatalogProduct & { familyVariants?: ProductVariantOption[] };
};

export default function ProductPageClient({ slug, initialProduct }: ProductPageClientProps) {
  const [product, setProduct] = useState<CatalogProduct | undefined>(initialProduct);
  const [familyVariants, setFamilyVariants] = useState<ProductVariantOption[]>(initialProduct?.familyVariants ?? []);
  const [selectedColor, setSelectedColor] = useState<string>(initialProduct.color ?? "");
  const [selectedStorage, setSelectedStorage] = useState<string>(initialProduct.storage ?? "");
  const [selectedCondition, setSelectedCondition] = useState<CatalogProduct["condition"]>(initialProduct.condition ?? "Excelente");
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewing3D, setViewing3D] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [recommendations, setRecommendations] = useState<CatalogProduct[]>([]);
  const { add } = useCart();
  const { requireAuth } = useAuthGate();
  const { content } = useSiteContent();
  // Desconto próprio do produto vence o padrão da loja (mesma regra do checkout).
  const pixDiscount = product?.pixDiscountPct ?? content?.pixDiscount ?? 10;

  // Mede a procura real pelo aparelho (alimenta a inteligência do admin).
  useEffect(() => {
    void fetch(`/api/products/${encodeURIComponent(slug)}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [slug]);
  const maxInstallments = content?.maxInstallments ?? 12;
  const buyButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!product) return;
    let active = false;
    let frame = 0;
    const publish = (nextActive: boolean) => {
      active = nextActive;
      window.dispatchEvent(new CustomEvent("product-quick-buy-state", { detail: {
        active: nextActive,
        title: getBaseModelName(product.name),
        imageUrl: product.images?.[0] || product.imageUrl,
        details: [product.storage, product.color, product.condition].filter(Boolean).join(" • "),
        pixDiscount,
        pixPrice: money(product.price * (1 - pixDiscount / 100)),
        installments: `ou ${maxInstallments}x de ${money(product.price / maxInstallments)} sem juros`,
        disabled: !product.available,
      } }));
    };
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const button = buyButtonRef.current;
        if (!button) return;
        const headerBottom = document.querySelector(".storefront-header-wrapper")?.getBoundingClientRect().bottom ?? 0;
        const nextActive = button.getBoundingClientRect().bottom < headerBottom;
        if (nextActive !== active) publish(nextActive);
      });
    };
    const quickAdd = () => void requireAuth(() => add(product));
    publish(false);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("product-quick-buy-request", quickAdd);
    measure();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("product-quick-buy-request", quickAdd);
      window.dispatchEvent(new CustomEvent("product-quick-buy-state", { detail: {
        active: false,
        title: "",
        details: "",
        pixDiscount: 0,
        pixPrice: "",
        installments: "",
        disabled: true,
      } }));
    };
  }, [add, maxInstallments, pixDiscount, product, requireAuth]);

  useEffect(() => {
    void fetch("/api/account/favorites", { cache: "no-store" }).then(async (response) => {
      if (response.ok) {
        const favorites: Array<{ product: { slug: string } }> = await response.json();
        setFavorite(favorites.some((item) => item.product.slug === slug));
      }
    });
    void fetch(`/api/products?limit=12&exclude=${encodeURIComponent(slug)}`).then((response) => response.json()).then((items: CatalogProduct[]) => {
      setRecommendations(items);
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

  // Derivar cores disponíveis SEM REPETIÇÃO
  const availableColors = useMemo(() => {
    const rawList: string[] = familyVariants.map((v) => v.color).filter(Boolean);
    if (product?.color) rawList.push(product.color);

    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of rawList) {
      const key = c.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(c.trim());
      }
    }
    return result;
  }, [familyVariants, product]);

  // Derivar armazenamentos ORDENADOS DO MENOR PARA O MAIOR (64 GB até a maior capacidade)
  const availableStorages = useMemo(() => {
    const rawList: string[] = familyVariants.map((v) => v.storage).filter(Boolean);
    if (product?.storage) rawList.push(product.storage);

    const unique = Array.from(new Set(rawList));
    return unique.sort((a, b) => parseStorageInMb(a) - parseStorageInMb(b));
  }, [familyVariants, product]);

  const availableConditions = useMemo(() => {
    if (!product) return [];
    const section = getCatalogSection(product.condition);
    const values = familyVariants
      .map((variant) => variant.condition)
      .filter((variantCondition) => getCatalogSection(variantCondition) === section);
    values.push(product.condition);
    return Array.from(new Set(values));
  }, [familyVariants, product]);

  // Troca dinâmica de variante / produto ao clicar em Cor, Capacidade ou Condição
  async function selectVariantOption(color: string, storage: string, condition: CatalogProduct["condition"]) {
    setSelectedColor(color);
    setSelectedStorage(storage);
    setSelectedCondition(condition);

    const exactMatch = familyVariants.find(
      (v) => (v.color?.toLowerCase() === color.toLowerCase() || !v.color) &&
             (v.storage === storage || !v.storage) &&
             v.condition === condition
    );

    const colorStorageMatch = familyVariants.find(
      (v) => (v.color?.toLowerCase() === color.toLowerCase() || !v.color) &&
             (v.storage === storage || !v.storage)
    );

    const colorMatch = familyVariants.find(
      (v) => v.color?.toLowerCase() === color.toLowerCase()
    );

    const match = exactMatch || colorStorageMatch || colorMatch;

    if (match) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(match.slug)}`);
        if (res.ok) {
          const fullItem: CatalogProduct & { familyVariants?: ProductVariantOption[] } = await res.json();
          setProduct(fullItem);
          setSelectedImage(0);
          setViewing3D(false);
          setSelectedColor(fullItem.color);
          setSelectedStorage(fullItem.storage);
          setSelectedCondition(fullItem.condition);
          if (fullItem.familyVariants?.length) setFamilyVariants(fullItem.familyVariants);
          window.history.replaceState(null, "", `/produto/${fullItem.slug}`);
          return;
        }
      } catch {
        // Fallback para estado local se a API falhar
      }
    }

    if (!match) return;

    setProduct((prev) => {
      if (!prev) return prev;
      const baseModel = getBaseModelName(prev.name);

      const newTitle = `${baseModel} - ${match.storage} - ${match.color} - ${match.condition}`;
      const basePrice = prev.price > 0 ? prev.price : 3499;

      return {
        ...prev,
        name: newTitle,
        color: match.color,
        storage: match.storage,
        condition: match.condition,
        price: match?.price ?? basePrice,
        stock: match.stock,
        available: match.available,
        imageUrl: match?.imageUrl ?? prev.imageUrl,
        model3dUrl: match?.model3dUrl ?? prev.model3dUrl,
        images: match?.imageUrl ? [match.imageUrl] : prev.images,
        slug: match?.slug ?? prev.slug,
      };
    });
    setSelectedColor(match.color);
    setSelectedStorage(match.storage);
    setSelectedCondition(match.condition);
    setSelectedImage(0);
  }


  if (!product) {
    return <main className="empty-state page-empty"><h1>Carregando produto...</h1></main>;
  }

  const specifications = product.specifications?.length ? product.specifications : [
    { label: "Marca", value: product.brand },
    { label: "Armazenamento", value: product.storage },
    { label: "Cor", value: product.color },
    { label: "Sistema operacional", value: "iOS" },
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
            {viewing3D && product.model3dUrl ? (
              <ModelViewer3D src={product.model3dUrl} alt={`Modelo 3D de ${product.name}`} />
            ) : images[selectedImage] ? (
              <ProductImage src={images[selectedImage]} alt={`${product.name} - foto ${selectedImage + 1}`} priority />
            ) : (
              <ProductImage alt="" />
            )}
          </div>
          {(images.length > 0 || Boolean(product.model3dUrl)) && (
            <div className="gallery-thumbnails" aria-label="Fotos e modelo 3D do produto" style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
              {/* 1. PRIMEIRO O BOTÃO 3D 360° */}
              {product.model3dUrl && (
                <button
                  type="button"
                  className={`thumbnail-3d-button ${viewing3D ? "active" : ""}`}
                  onClick={() => setViewing3D(true)}
                  title="Ver Modelo 3D Interativo 360°"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    width: "90px",
                    height: "90px",
                    background: viewing3D ? "var(--store-orange, #f97316)" : "#ffffff",
                    color: viewing3D ? "#ffffff" : "#1f2937",
                    border: viewing3D ? "2px solid var(--store-orange, #f97316)" : "1px solid #e2e8f0",
                    borderRadius: "12px",
                    cursor: "pointer",
                    padding: "4px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Box style={{ width: "22px", height: "22px", color: viewing3D ? "#ffffff" : "var(--store-orange, #f97316)" }} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 800 }}>3D 360°</span>
                </button>
              )}

              {/* 2. DEPOIS AS FOTOS NA SEQUÊNCIA */}
              {images.slice(0, 4).map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  className={!viewing3D && selectedImage === index ? "active" : ""}
                  onClick={() => {
                    setViewing3D(false);
                    setSelectedImage(index);
                  }}
                  aria-label={`Ver foto ${index + 1}`}
                >
                  <ProductImage src={image} alt="" sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-summary">
          <div className="product-code"><span>{product.brand}</span><small>Cód. {product.id.slice(0, 8).toUpperCase()}</small></div>
          <h1>{getBaseModelName(product.name)}</h1>
          <button className={`favorite-button ${favorite ? "active" : ""}`} onClick={() => void toggleFavorite()}><Heart /> {favorite ? "Salvo nos favoritos" : "Adicionar aos favoritos"}</button>
          
          {/* SELETOR INTERATIVO DE VARIANTES (COR, ARMAZENAMENTO E CONDIÇÃO ESTILO TROCAFONE) */}
          <div className="variant-selector-group">
            {/* 1. SELEÇÃO DE COR */}
            {availableColors.length > 0 && (
              <div className="variant-section">
                <div className="variant-label">
                  Cor: <strong>{(selectedColor || product.color).toUpperCase()}</strong>
                </div>
                <div className="color-swatch-list">
                  {availableColors.map((colorName) => {
                    const isActive = (selectedColor || product.color).toLowerCase() === colorName.toLowerCase();
                    const matchingVariant = familyVariants.find(
                      (variant) => variant.color?.toLowerCase() === colorName.toLowerCase()
                        && variant.storage === (selectedStorage || product.storage)
                        && variant.condition === selectedCondition,
                    );
                    const isCurrentVariant = colorName.toLowerCase() === product.color.toLowerCase()
                      && (selectedStorage || product.storage) === product.storage
                      && selectedCondition === product.condition;
                    const available = matchingVariant ? matchingVariant.available : isCurrentVariant && product.available;
                    return (
                      <button
                        key={colorName}
                        type="button"
                        className={`color-swatch-btn ${isActive ? "active" : ""} ${!available ? "out-of-stock" : ""}`}
                        onClick={() => void selectVariantOption(colorName, selectedStorage || product.storage, selectedCondition)}
                        disabled={!available}
                        title={available ? `Cor: ${colorName}` : `${colorName} indisponível`}
                      >
                        <span className="color-circle" style={{ backgroundColor: getProductColorHex(colorName) }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. SELEÇÃO DE CAPACIDADE */}
            {availableStorages.length > 0 && (
              <div className="variant-section">
                <div className="variant-label">Capacidade</div>
                <div className="storage-pill-list">
                  {availableStorages.map((storageVal) => {
                    const activeColor = selectedColor || product.color;
                    const isActive = (selectedStorage || product.storage) === storageVal;
                    const exactVariant = familyVariants.find(
                      (variant) => variant.color?.toLowerCase() === activeColor.toLowerCase()
                        && variant.storage === storageVal
                        && variant.condition === selectedCondition,
                    );
                    const isCurrentVariant =
                      activeColor.toLowerCase() === product.color.toLowerCase()
                      && storageVal === product.storage
                      && selectedCondition === product.condition;
                    const available = exactVariant ? exactVariant.available : isCurrentVariant && product.available;
                    const unavailable = !available;

                    return (
                      <button
                        key={storageVal}
                        type="button"
                        className={`storage-pill-btn ${isActive ? "active" : ""} ${unavailable ? "out-of-stock" : ""}`}
                        onClick={() => void selectVariantOption(activeColor, storageVal, selectedCondition)}
                        disabled={unavailable}
                        aria-disabled={unavailable}
                        title={unavailable ? `${storageVal} indisponível nesta cor` : `Selecionar ${storageVal}`}
                      >
                        {storageVal}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SELEÇÃO DE CONDIÇÃO ESTILO TROCAFONE */}
            <div className="variant-section">
              <div className="variant-label">Condição:</div>
              <div className="condition-grid">
                {availableConditions.map((condName) => {
                  const isActive = selectedCondition === condName;
                  const matchingVar = familyVariants.find(
                    (v) => (v.color?.toLowerCase() === (selectedColor || product.color).toLowerCase() || !v.color) &&
                           (v.storage === (selectedStorage || product.storage) || !v.storage) &&
                           v.condition === condName
                  );
                  const isCurrentVariant =
                    condName === product.condition &&
                    (selectedColor || product.color).toLowerCase() === product.color.toLowerCase() &&
                    (selectedStorage || product.storage) === product.storage;
                  const available = matchingVar ? matchingVar.available : isCurrentVariant && product.available;
                  const priceVal = matchingVar?.price ?? (isCurrentVariant ? product.price : 0);
                  const priceDisplay = available && priceVal > 0 ? money(priceVal) : "Indisponível";

                  return (
                    <button
                      key={condName}
                      type="button"
                      className={`condition-card-btn ${isActive ? "active" : ""} ${!available ? "out-of-stock" : ""}`}
                      disabled={!available}
                      onClick={() => void selectVariantOption(selectedColor || product.color, selectedStorage || product.storage, condName)}
                    >
                      <span className="condition-name">{condName}</span>
                      <span className="condition-price">{priceDisplay}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`availability ${product.available ? "" : "is-sold-out"}`.trim()}>
            <PackageCheck />
            <div><strong>{product.available ? "Disponível para compra" : "Produto indisponível"}</strong><small>{product.available ? "Envio após a confirmação do pagamento" : "Consulte novamente em breve"}</small></div>
          </div>

          <div className="purchase-card">
            <div className="pix-badge-header">
              <span className="pix-tag-green-lg">{pixDiscount}% OFF no PIX</span>
              <small>Preço à vista no PIX</small>
            </div>
            <strong className="pix-price-highlight">{money(product.price * (1 - pixDiscount / 100))}</strong>
            
            <div className="card-payment-breakdown">
              <p className="card-total-row">
                <CreditCard className="card-icon-lg" />
                <span><b>{money(product.price)}</b> no cartão</span>
              </p>
              <p className="installment-detail-line">
                Em <b>{maxInstallments}x</b> de <b>{money(product.price / maxInstallments)}</b> s/ juros
              </p>
              <p className="installment-detail-line">
                Ou <b>21x</b> de <b>{money((product.price * 1.285) / 21)}</b> c/ juros
              </p>
            </div>

            <button ref={buyButtonRef} className="buy-button" disabled={!product.available} onClick={() => void requireAuth(() => add(product))}>
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

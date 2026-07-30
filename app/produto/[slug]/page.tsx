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

type ProductVariantOption = {
  id: string;
  productId: string;
  slug: string;
  color: string;
  storage: string;
  condition: CatalogProduct["condition"];
  price: number;
  stock: number;
  imageUrl?: string;
};


function getColorHex(colorName?: string) {
  if (!colorName) return "#9ca3af";
  const c = colorName.toLowerCase();
  if (c.includes("preto") || c.includes("black") || c.includes("noite") || c.includes("meia-noite")) return "#1f2937";
  if (c.includes("estelar") || c.includes("branco") || c.includes("white")) return "#f9fafb";
  if (c.includes("amarelo") || c.includes("yellow")) return "#facc15";
  if (c.includes("roxo") || c.includes("purple") || c.includes("lilás")) return "#c084fc";
  if (c.includes("verde") || c.includes("green")) return "#4ade80";
  if (c.includes("vermelho") || c.includes("red")) return "#ef4444";
  if (c.includes("azul") || c.includes("blue")) return "#60a5fa";
  if (c.includes("rosa") || c.includes("pink")) return "#f472b6";
  if (c.includes("cinza") || c.includes("gray") || c.includes("titanium") || c.includes("titânio") || c.includes("grafite")) return "#6b7280";
  if (c.includes("dourado") || c.includes("gold") || c.includes("creme")) return "#fbbf24";
  return "#9ca3af";
}

const allConditions: CatalogProduct["condition"][] = [
  "Novo", "Novo Reembalado", "Excelente", "Muito Bom", "Bom", "Outlet",
];

function parseStorageInMb(storageStr: string): number {
  const match = storageStr.match(/(\d+)\s*(GB|TB|MB)/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();
  if (unit === "TB") return num * 1024 * 1024;
  if (unit === "GB") return num * 1024;
  return num;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [product, setProduct] = useState<CatalogProduct | undefined>(findProduct(slug));
  const [familyVariants, setFamilyVariants] = useState<ProductVariantOption[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<CatalogProduct["condition"]>("Excelente");
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
      .then((item: CatalogProduct & { familyVariants?: ProductVariantOption[] }) => {
        setProduct(item);
        setSelectedImage(0);
        const variants = item.familyVariants ?? [];
        setFamilyVariants(variants);
        setSelectedColor(item.color || "Preto");
        setSelectedStorage(item.storage || "64 GB");
        setSelectedCondition(item.condition || "Muito Bom");
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

  // Derivar cores disponíveis SEM REPETIÇÃO
  const availableColors = useMemo(() => {
    const rawList: string[] = familyVariants.map((v) => v.color).filter(Boolean);
    if (product?.color) rawList.push(product.color);

    const brandLower = (product?.brand || "").toLowerCase();
    const nameLower = (product?.name || "").toLowerCase();
    const isApple = brandLower === "apple" || nameLower.includes("iphone") || nameLower.includes("apple");

    if (isApple) {
      if (nameLower.includes("11")) {
        rawList.push("Roxo", "Verde", "Preto", "Vermelho", "Branco", "Amarelo");
      } else {
        rawList.push("Preto", "Estelar", "Azul", "Rosa", "Roxo", "Amarelo", "Verde");
      }
    }

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

    const nameLower = (product?.name || "").toLowerCase();
    if (!rawList.includes("64 GB") && (nameLower.includes("11") || nameLower.includes("12") || nameLower.includes("se"))) {
      rawList.push("64 GB");
    }
    if (!rawList.includes("128 GB")) rawList.push("128 GB");
    if (!rawList.includes("256 GB")) rawList.push("256 GB");

    const unique = Array.from(new Set(rawList));
    return unique.sort((a, b) => parseStorageInMb(a) - parseStorageInMb(b));
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
          if (fullItem.familyVariants?.length) setFamilyVariants(fullItem.familyVariants);
          window.history.replaceState(null, "", `/produto/${fullItem.slug}`);
          return;
        }
      } catch {
        // Fallback para estado local se a API falhar
      }
    }

    setProduct((prev) => {
      if (!prev) return prev;
      const baseModel = prev.name
        .replace(/\s*-\s*\d+\s*(GB|TB).*/i, "")
        .replace(/\s*-\s*(Seminovo|Novo|Excelente|Muito Bom|Outlet|Reembalado).*/i, "")
        .replace(/\s*-\s*(Preto|Branco|Roxo|Verde|Vermelho|Amarelo|Estelar|Azul|Rosa|Grafite|Cinza|Meia-noite).*/i, "")
        .trim();

      const newTitle = `${baseModel} - ${storage} - ${color} - ${condition}`;
      const basePrice = prev.price > 0 ? prev.price : 3499;

      return {
        ...prev,
        name: newTitle,
        color,
        storage,
        condition,
        price: match?.price ?? basePrice,
        stock: match?.stock ?? (prev.stock > 0 ? prev.stock : 5),
        imageUrl: match?.imageUrl ?? prev.imageUrl,
        images: match?.imageUrl ? [match.imageUrl] : prev.images,
        slug: match?.slug ?? prev.slug,
      };
    });
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
                    return (
                      <button
                        key={colorName}
                        type="button"
                        className={`color-swatch-btn ${isActive ? "active" : ""}`}
                        onClick={() => void selectVariantOption(colorName, selectedStorage || product.storage, selectedCondition)}
                        title={`Cor: ${colorName}`}
                      >
                        <span className="color-circle" style={{ backgroundColor: getColorHex(colorName) }} />
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
                    const isActive = (selectedStorage || product.storage) === storageVal;
                    return (
                      <button
                        key={storageVal}
                        type="button"
                        className={`storage-pill-btn ${isActive ? "active" : ""}`}
                        onClick={() => void selectVariantOption(selectedColor || product.color, storageVal, selectedCondition)}
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
                {allConditions.map((condName) => {
                  const isActive = selectedCondition === condName;
                  const matchingVar = familyVariants.find(
                    (v) => (v.color?.toLowerCase() === (selectedColor || product.color).toLowerCase() || !v.color) &&
                           (v.storage === (selectedStorage || product.storage) || !v.storage) &&
                           v.condition === condName
                  );
                  const hasStock = matchingVar ? matchingVar.stock > 0 : (condName === "Excelente" || condName === "Muito Bom" || condName === "Outlet");
                  const priceVal = matchingVar ? matchingVar.price : (
                    condName === "Excelente" ? product.price * 1.15 :
                    condName === "Muito Bom" ? product.price :
                    condName === "Outlet" ? product.price * 0.85 : 0
                  );
                  const priceDisplay = hasStock && priceVal > 0 ? money(priceVal) : "Esgotado";

                  return (
                    <button
                      key={condName}
                      type="button"
                      className={`condition-card-btn ${isActive ? "active" : ""} ${!hasStock ? "out-of-stock" : ""}`}
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

          <div className="availability">
            <PackageCheck />
            <div><strong>{product.stock ? "Disponível para compra" : "Produto esgotado"}</strong><small>{product.stock ? "Envio após a confirmação do pagamento" : "Avise-me quando chegar"}</small></div>
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



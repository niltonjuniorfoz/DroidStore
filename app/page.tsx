import Link from "next/link";
import { BadgeCheck, Check, PackageCheck, ShieldCheck } from "lucide-react";
import HeroCarousel, { type HeroSlide } from "../src/components/HeroCarousel";
import ProductCard from "../src/components/ProductCard";
import QuickActions from "../src/components/QuickActions";
import { getProducts, getSiteContent } from "../src/lib/storefront";

export const dynamic = "force-dynamic";

function readSlides(content: Awaited<ReturnType<typeof getSiteContent>>["content"]): HeroSlide[] {
  const defaults: HeroSlide = {
    eyebrow: content?.heroEyebrow ?? "",
    title: content?.heroTitle ?? "",
    description: content?.heroDescription ?? "",
    imageUrl: content?.heroImageUrl ?? "",
    buttonLabel: "Ver ofertas",
    buttonHref: "/celulares",
  };
  if (!content || !Array.isArray(content.heroSlides)) return [defaults];
  const slides = content.heroSlides.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const value = entry as Record<string, unknown>;
    return [{
      eyebrow: typeof value.eyebrow === "string" ? value.eyebrow : "",
      title: typeof value.title === "string" ? value.title : "",
      description: typeof value.description === "string" ? value.description : "",
      imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "",
      buttonLabel: typeof value.buttonLabel === "string" ? value.buttonLabel : "Ver ofertas",
      buttonHref: typeof value.buttonHref === "string" && value.buttonHref.startsWith("/") ? value.buttonHref : "/celulares",
    }];
  });
  return slides.length ? slides.slice(0, 5) : [defaults];
}

export default async function Home() {
  const [{ content }, featuredProducts] = await Promise.all([getSiteContent(), getProducts(true)]);
  const selected = featuredProducts.slice(0, 10);

  return <main className="storefront-home">
    <HeroCarousel slides={readSlides(content)} />

    {/* 4 Quick Action Cards (Mais Vendidos & Ofertas with Live Fire Effect) */}
    <QuickActions />

    <section className="home-section">
      <div className="section-heading"><div><h2>Destaques da semana</h2></div><Link href="/celulares">Ver catálogo completo →</Link></div>
      <div className="product-grid">{selected.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>

    <section className="benefits" aria-label="Benefícios">
      <div><ShieldCheck /><span><strong>Garantia</strong>Produtos Originais</span></div>
      <div><BadgeCheck /><span><strong>100% Revisados</strong>Testados por especialistas</span></div>
      <div><PackageCheck /><span><strong>Frete Grátis</strong>Para todo o Brasil</span></div>
    </section>
  </main>;
}

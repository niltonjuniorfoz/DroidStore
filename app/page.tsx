import Link from "next/link";
import HeroCarousel, { type HeroSlide } from "../src/components/HeroCarousel";
import FeaturedCarousel from "../src/components/FeaturedCarousel";
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
  const selected = featuredProducts.slice(0, 60);

  return <main className="storefront-home">
    <HeroCarousel slides={readSlides(content)} />

    {/* 4 Quick Action Cards (Mais Vendidos & Ofertas com efeito de fogo vivo) */}
    <QuickActions />

    {/* Carrossel de 60 Telefones em 6 Passadas de Ofertas */}
    <FeaturedCarousel products={selected} />
  </main>;
}

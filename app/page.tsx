import Link from "next/link";
import { BadgeCheck, Check, PackageCheck, ShieldCheck } from "lucide-react";
import HeroCarousel, { type HeroSlide } from "../src/components/HeroCarousel";
import ProductCard from "../src/components/ProductCard";
import { getProducts, getSiteContent } from "../src/lib/storefront";

export const dynamic = "force-dynamic";

function readSlides(content: Awaited<ReturnType<typeof getSiteContent>>["content"]): HeroSlide[] {
  const defaults: HeroSlide = {
    eyebrow: content?.heroEyebrow ?? "Tecnologia boa cabe no seu bolso",
    title: content?.heroTitle ?? "Tecnologia Android, sem complicação.",
    description: content?.heroDescription ?? "Novos e seminovos com procedência, garantia e uma compra simples do início ao fim.",
    imageUrl: content?.heroImageUrl ?? "",
    buttonLabel: "Ver ofertas",
    buttonHref: "/celulares",
  };
  if (!content || !Array.isArray(content.heroSlides)) return [defaults];
  const slides = content.heroSlides.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const value = entry as Record<string, unknown>;
    if (typeof value.title !== "string" || typeof value.description !== "string") return [];
    return [{
      eyebrow: typeof value.eyebrow === "string" ? value.eyebrow : defaults.eyebrow,
      title: value.title,
      description: value.description,
      imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "",
      buttonLabel: typeof value.buttonLabel === "string" ? value.buttonLabel : "Ver ofertas",
      buttonHref: typeof value.buttonHref === "string" && value.buttonHref.startsWith("/") ? value.buttonHref : "/celulares",
    }];
  });
  return slides.length ? slides.slice(0, 3) : [defaults];
}

export default async function Home() {
  const [{ content }, featuredProducts] = await Promise.all([getSiteContent(), getProducts(true)]);
  const selected = featuredProducts.slice(0, 8);

  return <main className="storefront-home">
    <HeroCarousel slides={readSlides(content)} />

    <section className="benefits" aria-label="Benefícios">
      <div><ShieldCheck /><span><strong>Compra protegida</strong>Ambiente seguro</span></div>
      <div><BadgeCheck /><span><strong>Garantia</strong>Em todos os aparelhos</span></div>
      <div><PackageCheck /><span><strong>Envio rastreado</strong>Para todo o Brasil</span></div>
    </section>

    <section className="home-section">
      <div className="section-heading"><div><span className="eyebrow">Seleção da loja</span><h2>Destaques da semana</h2></div><Link href="/celulares">Ver catálogo completo →</Link></div>
      <div className="product-grid">{selected.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>

    <section className="condition-banner">
      <div><span className="eyebrow">Seminovos certificados</span><h2>Economize sem abrir mão da tranquilidade.</h2><p>Cada aparelho passa por verificação funcional e recebe uma classificação clara de conservação.</p><Link className="button primary" href="/celulares?condition=Excelente">Encontrar meu seminovo</Link></div>
      <div className="quality-list"><span><Check /> Tela e câmeras testadas</span><span><Check /> Bateria verificada</span><span><Check /> IMEI e procedência conferidos</span><span><Check /> Garantia incluída</span></div>
    </section>
  </main>;
}

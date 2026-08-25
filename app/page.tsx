import HeroCarousel, { type HeroSlide } from "../src/components/HeroCarousel";
import FeaturedCarousel from "../src/components/FeaturedCarousel";
import HomeProductSection from "../src/components/HomeProductSection";
import HomePromoBanners from "../src/components/HomePromoBanners";
import HomeFooterBanner from "../src/components/HomeFooterBanner";
import QuickActions from "../src/components/QuickActions";
import { getProducts, getProductsForSection, getSiteContent } from "../src/lib/storefront";
import {
  DEFAULT_HOME_FEATURED_TITLE,
  DEFAULT_HOME_FOOTER_BANNER,
  DEFAULT_HOME_PRODUCT_SECTIONS,
  DEFAULT_HOME_PROMO_BANNERS,
} from "../src/lib/homeContent";

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
  const [{ content }, products] = await Promise.all([getSiteContent(), getProducts(false, { take: 20 })]);
  const featured = products.filter((product) => product.featured).slice(0, 10);
  const selected = featured.length ? featured : products.slice(0, 10);
  const featuredTitle = content?.homeFeaturedTitle ?? DEFAULT_HOME_FEATURED_TITLE;
  const promoBanners = content?.homePromoBanners ?? DEFAULT_HOME_PROMO_BANNERS;
  const productSections = content?.homeProductSections ?? DEFAULT_HOME_PRODUCT_SECTIONS;
  const footerBanner = content?.homeFooterBanner ?? DEFAULT_HOME_FOOTER_BANNER;
  const sectionProducts = await Promise.all(productSections.map((section) => getProductsForSection(section.query, 5)));

  return <main className="storefront-home">
    <HeroCarousel slides={readSlides(content)} />

    <QuickActions />

    <FeaturedCarousel title={featuredTitle} products={selected} />

    <HomePromoBanners banners={promoBanners} />

    {productSections.map((section, index) => (
      <HomeProductSection
        key={`${section.title}-${index}`}
        title={section.title}
        buttonLabel={section.buttonLabel}
        buttonHref={section.buttonHref}
        products={sectionProducts[index] ?? []}
      />
    ))}

    <HomeFooterBanner banner={footerBanner} />
  </main>;
}

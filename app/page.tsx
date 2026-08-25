import { Fragment } from "react";
import HeroCarousel, { type HeroSlide } from "../src/components/HeroCarousel";
import FeaturedCarousel from "../src/components/FeaturedCarousel";
import HomeProductSection from "../src/components/HomeProductSection";
import HomePromoBanners from "../src/components/HomePromoBanners";
import HomeFooterBanner from "../src/components/HomeFooterBanner";
import HomeOutletMosaic from "../src/components/HomeOutletMosaic";
import HomeBrandShowcase from "../src/components/HomeBrandShowcase";
import QuickActions from "../src/components/QuickActions";
import { getProducts, getProductsForSection, getSiteContent } from "../src/lib/storefront";
import {
  DEFAULT_HOME_FEATURED_TITLE,
  DEFAULT_HOME_FOOTER_BANNER,
  DEFAULT_HOME_GARMIN_SHOWCASE,
  DEFAULT_HOME_OUTLET_SECTION,
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
  const outletSection = content?.homeOutletSection ?? DEFAULT_HOME_OUTLET_SECTION;
  const garminShowcase = content?.homeGarminShowcase ?? DEFAULT_HOME_GARMIN_SHOWCASE;
  const [sectionProducts, outletProducts, garminProducts] = await Promise.all([
    Promise.all(productSections.map((section) => getProductsForSection(section.query, 5))),
    outletSection.active ? getProducts(false, { take: 6, condition: "Outlet" }) : Promise.resolve([]),
    garminShowcase.active ? getProductsForSection(garminShowcase.query, 8) : Promise.resolve([]),
  ]);
  const xiaomiSectionIndex = Math.max(
    0,
    productSections.findIndex((section) => `${section.title} ${section.query}`.toLocaleLowerCase("pt-BR").includes("xiaomi")),
  );

  return <main className="storefront-home">
    <HeroCarousel slides={readSlides(content)} />

    <QuickActions />

    <FeaturedCarousel title={featuredTitle} products={selected} />

    <HomePromoBanners banners={promoBanners} />

    {outletSection.active && (
      <HomeOutletMosaic
        title={outletSection.title}
        buttonLabel={outletSection.buttonLabel}
        buttonHref={outletSection.buttonHref}
        products={outletProducts}
      />
    )}

    {productSections.map((section, index) => (
      <Fragment key={`${section.title}-${index}`}>
        <HomeProductSection
          title={section.title}
          buttonLabel={section.buttonLabel}
          buttonHref={section.buttonHref}
          products={sectionProducts[index] ?? []}
        />
        {garminShowcase.active && index === xiaomiSectionIndex && (
          <HomeBrandShowcase config={garminShowcase} products={garminProducts} />
        )}
      </Fragment>
    ))}

    <HomeFooterBanner banner={footerBanner} />
  </main>;
}

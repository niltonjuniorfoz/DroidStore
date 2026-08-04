import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomePromoBanner } from "../lib/homeContent";

export default function HomePromoBanners({ banners }: { banners: HomePromoBanner[] }) {
  return (
    <section className="home-section home-promo-grid" aria-label="Destaques da loja">
      {banners.slice(0, 2).map((banner, index) => (
        <article className="home-promo-banner" key={`${banner.title}-${index}`}>
          <img src={banner.imageUrl} alt="" loading="lazy" decoding="async" />
          <div className="home-promo-shade" />
          <div className="home-promo-copy">
            <span>{banner.eyebrow}</span>
            <h2>{banner.title}</h2>
            <p>{banner.description}</p>
            <Link href={banner.buttonHref}>
              {banner.buttonLabel} <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

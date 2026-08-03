import Link from "next/link";
import type { HomeFooterBanner as HomeFooterBannerData } from "../lib/homeContent";

export default function HomeFooterBanner({ banner }: { banner: HomeFooterBannerData }) {
  if (!banner.active || !banner.imageUrl) return null;

  const image = (
    <img
      src={banner.imageUrl}
      alt="Aura Tech — tecnologia que conecta você ao futuro"
      loading="lazy"
      decoding="async"
    />
  );

  return (
    <section className="home-footer-banner" aria-label="Destaques e benefícios da Aura Tech">
      {banner.linkHref ? <Link href={banner.linkHref}>{image}</Link> : image}
    </section>
  );
}

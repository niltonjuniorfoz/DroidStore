"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import AutoplayVideo from "./AutoplayVideo";

export type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonLabel: string;
  buttonHref: string;
};

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
}

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [mediaRatios, setMediaRatios] = useState<Record<number, string>>({});
  const available = slides.slice(0, 5);

  const activeSlide = available[active];
  const isCurrentVideo = isVideoUrl(activeSlide?.imageUrl);

  useEffect(() => {
    if (available.length < 2) return;

    // Se o slide atual for um vídeo, esperamos ele terminar (onEnded) para mudar.
    // Usamos um fallback de segurança de 60s apenas se o vídeo falhar no carregamento.
    if (isCurrentVideo) {
      const fallbackTimer = window.setTimeout(() => {
        setActive((current) => (current + 1) % available.length);
      }, 60000);
      return () => window.clearTimeout(fallbackTimer);
    }

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % available.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [active, available.length, isCurrentVideo]);

  function move(direction: number) {
    setActive((current) => (current + direction + available.length) % available.length);
  }

  function handleVideoEnded() {
    if (available.length > 1) {
      setActive((current) => (current + 1) % available.length);
    }
  }

  function rememberMediaRatio(index: number, width: number, height: number) {
    if (!width || !height) return;
    const ratio = `${width} / ${height}`;
    setMediaRatios((current) => current[index] === ratio ? current : { ...current, [index]: ratio });
  }

  const adaptiveStyle = { "--adaptive-banner-ratio": mediaRatios[active] ?? "16 / 9" } as CSSProperties;

  return (
    <section className="hero-carousel adaptive-banner-frame" style={adaptiveStyle} aria-roledescription="carrossel" aria-label="Destaques da loja">
      {available.map((slide, index) => {
        const hasEyebrow = Boolean(slide.eyebrow?.trim());
        const hasTitle = Boolean(slide.title?.trim());
        const hasDesc = Boolean(slide.description?.trim());
        const hasButton = Boolean(slide.buttonLabel?.trim());
        const hasCopyText = hasEyebrow || hasTitle || hasDesc;
        const isVideoMedia = isVideoUrl(slide.imageUrl);

        return (
          <article
            key={`${slide.title || index}-${index}`}
            className={`hero-slide ${index === active ? "active" : ""} ${slide.imageUrl ? "has-cover" : ""} ${!hasCopyText ? "image-only-slide" : ""}`}
            aria-hidden={index !== active}
          >
            {slide.imageUrl && (
              isVideoMedia ? (
                <AutoplayVideo
                  src={slide.imageUrl}
                  active={index === active}
                  loop={false}
                  onEnded={handleVideoEnded}
                  onLoadedMetadata={(event) => rememberMediaRatio(index, event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
                  className="hero-slide-video"
                  aria-label={slide.title || `Banner ${index + 1}`}
                />
              ) : (
                <img
                  className="hero-slide-cover"
                  src={slide.imageUrl}
                  alt=""
                  decoding="async"
                  onLoad={(event) => rememberMediaRatio(index, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                />
              )
            )}

            {(hasCopyText || hasButton) && (
              <div className={`hero-slide-copy ${!hasCopyText ? "no-copy-text" : ""}`}>
                {hasEyebrow && (
                  <span className="hero-kicker">
                    <Sparkles /> {slide.eyebrow}
                  </span>
                )}
                {hasTitle && <h1>{slide.title}</h1>}
                {hasDesc && <p>{slide.description}</p>}
                {hasButton && (
                  <Link className="button primary" href={slide.buttonHref || "/celulares"}>
                    {slide.buttonLabel}
                  </Link>
                )}
              </div>
            )}
          </article>
        );
      })}
      {available.length > 1 && (
        <>
          <button className="hero-arrow previous" type="button" onClick={() => move(-1)} aria-label="Capa anterior">
            <ChevronLeft />
          </button>
          <button className="hero-arrow next" type="button" onClick={() => move(1)} aria-label="Próxima capa">
            <ChevronRight />
          </button>
          <div className="hero-dots" aria-label="Escolher capa">
            {available.map((slide, index) => (
              <button
                key={`${slide.title || index}-dot`}
                type="button"
                className={index === active ? "active" : ""}
                onClick={() => setActive(index)}
                aria-label={`Ver capa ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

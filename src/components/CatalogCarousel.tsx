"use client";

import { useEffect, useState } from "react";
import AutoplayVideo from "./AutoplayVideo";

export type CatalogSlide = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
};

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
}

export default function CatalogCarousel({ slides }: { slides: CatalogSlide[] }) {
  const [active, setActive] = useState(0);
  const available = slides.slice(0, 5);

  useEffect(() => {
    if (available.length < 2) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % available.length), 6500);
    return () => window.clearInterval(timer);
  }, [available.length]);

  if (!available.length) return null;

  return (
    <div className="catalog-carousel" aria-roledescription="carrossel" aria-label="Banners do catálogo">
      {available.map((slide, index) => {
        const hasEyebrow = Boolean(slide.eyebrow?.trim());
        const hasTitle = Boolean(slide.title?.trim());
        const hasDesc = Boolean(slide.description?.trim());
        const hasCopyText = hasEyebrow || hasTitle || hasDesc;
        const isVideoMedia = isVideoUrl(slide.imageUrl);

        return (
          <div
            key={index}
            className={`catalog-slide ${index === active ? "active" : ""} ${slide.imageUrl ? "has-cover" : ""}`}
            aria-hidden={index !== active}
          >
            {slide.imageUrl && (
              isVideoMedia ? (
                <AutoplayVideo
                  src={slide.imageUrl}
                  active={index === active}
                  className="catalog-slide-video"
                  aria-label={slide.title || `Banner do catálogo ${index + 1}`}
                />
              ) : (
                <div
                  className="catalog-slide-cover"
                  style={{ backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")` }}
                />
              )
            )}

            {hasCopyText && (
              <div className="catalog-title-copy">
                {hasEyebrow && <span className="eyebrow">{slide.eyebrow}</span>}
                {hasTitle && <h1>{slide.title}</h1>}
                {hasDesc && <p>{slide.description}</p>}
              </div>
            )}
          </div>
        );
      })}

      {available.length > 1 && (
        <div className="catalog-dots">
          {available.map((_, index) => (
            <button
              key={index}
              className={index === active ? "active" : ""}
              onClick={() => setActive(index)}
              aria-label={`Ir para banner do catálogo ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonLabel: string;
  buttonHref: string;
};

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const available = slides.slice(0, 3);

  useEffect(() => {
    if (available.length < 2) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % available.length), 6500);
    return () => window.clearInterval(timer);
  }, [available.length]);

  function move(direction: number) {
    setActive((current) => (current + direction + available.length) % available.length);
  }

  return <section className="hero-carousel" aria-roledescription="carrossel" aria-label="Destaques da loja">
    {available.map((slide, index) => <article
      key={`${slide.title}-${index}`}
      className={`hero-slide ${index === active ? "active" : ""} ${slide.imageUrl ? "has-cover" : ""}`}
      aria-hidden={index !== active}
    >
      {slide.imageUrl && <div className="hero-slide-cover" style={{ backgroundImage: `url("${slide.imageUrl.replaceAll('"', '\\"')}")` }} />}
      <div className="hero-slide-copy">
        <span className="hero-kicker"><Sparkles /> {slide.eyebrow}</span>
        <h1>{slide.title}</h1>
        <p>{slide.description}</p>
        <Link className="button primary" href={slide.buttonHref}>{slide.buttonLabel}</Link>
      </div>
    </article>)}
    {available.length > 1 && <>
      <button className="hero-arrow previous" type="button" onClick={() => move(-1)} aria-label="Capa anterior"><ChevronLeft /></button>
      <button className="hero-arrow next" type="button" onClick={() => move(1)} aria-label="Próxima capa"><ChevronRight /></button>
      <div className="hero-dots" aria-label="Escolher capa">
        {available.map((slide, index) => <button key={`${slide.title}-dot`} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Ver capa ${index + 1}`} />)}
      </div>
    </>}
  </section>;
}

"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  label: string;
};

export default function MobileAutoCarousel({ children, className = "", label }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    const mobile = window.matchMedia("(max-width: 650px)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!track || !mobile.matches || reduceMotion.matches || track.children.length < 2) return;

    const advance = () => {
      if (pausedRef.current || document.hidden) return;
      const firstCard = track.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const end = track.scrollWidth - track.clientWidth;
      track.scrollTo({ left: track.scrollLeft + step >= end - 4 ? 0 : track.scrollLeft + step, behavior: "smooth" });
    };

    const timer = window.setInterval(advance, 3800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      ref={trackRef}
      className={`product-grid mobile-auto-track ${className}`.trim()}
      aria-label={label}
      onPointerDown={() => { pausedRef.current = true; }}
      onPointerUp={() => { pausedRef.current = false; }}
      onPointerCancel={() => { pausedRef.current = false; }}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocus={() => { pausedRef.current = true; }}
      onBlur={() => { pausedRef.current = false; }}
    >
      {children}
    </div>
  );
}

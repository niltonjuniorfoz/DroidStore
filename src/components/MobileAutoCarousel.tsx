"use client";

import { Children, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  label: string;
};

export default function MobileAutoCarousel({ children, className = "", label }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const lastManualInteractionRef = useRef(0);
  const interactionTimerRef = useRef<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const items = useMemo(() => Children.toArray(children), [children]);

  const markInteracting = () => {
    lastManualInteractionRef.current = Date.now();
    setIsInteracting(true);
    if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = window.setTimeout(() => setIsInteracting(false), 1800);
  };

  useEffect(() => () => {
    if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!track || reduceMotion.matches || items.length < 2) return;

    const normalizeLoop = () => {
      const half = track.scrollWidth / 2;
      if (!half) return;
      if (track.scrollLeft >= half - 2) {
        const previousBehavior = track.style.scrollBehavior;
        track.style.scrollBehavior = "auto";
        track.scrollLeft -= half;
        track.style.scrollBehavior = previousBehavior;
      }
    };

    const advance = () => {
      if (pausedRef.current || document.hidden || Date.now() - lastManualInteractionRef.current < 4500) return;
      normalizeLoop();
      const firstCard = track.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      track.scrollTo({ left: track.scrollLeft + step, behavior: "smooth" });
      window.setTimeout(normalizeLoop, 650);
    };

    const onScroll = () => {
      if (!pausedRef.current) window.requestAnimationFrame(normalizeLoop);
    };

    const timer = window.setInterval(advance, 3600);
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearInterval(timer);
      track.removeEventListener("scroll", onScroll);
    };
  }, [items.length]);

  return (
    <div
      ref={trackRef}
      className={`product-grid mobile-auto-track infinite-carousel-track ${isInteracting ? "is-interacting" : ""} ${className}`.trim()}
      aria-label={label}
      onPointerDown={() => { pausedRef.current = true; markInteracting(); }}
      onPointerMove={() => { if (pausedRef.current) markInteracting(); }}
      onPointerUp={() => { pausedRef.current = false; markInteracting(); }}
      onPointerCancel={() => { pausedRef.current = false; markInteracting(); }}
      onWheel={markInteracting}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocus={() => { pausedRef.current = true; markInteracting(); }}
      onBlur={() => { pausedRef.current = false; }}
    >
      {items}
      {items.map((item, index) => <div className="carousel-clone" aria-hidden="true" key={`carousel-clone-${index}`}>{item}</div>)}
    </div>
  );
}

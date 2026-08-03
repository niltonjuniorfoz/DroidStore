"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Children,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  label: string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
};

export default function MobileAutoCarousel({ children, className = "", label }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pauseUntilRef = useRef(0);
  const suppressClickRef = useRef(false);
  const interactionTimerRef = useRef<number | null>(null);
  const normalizeTimerRef = useRef<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const items = useMemo(() => Children.toArray(children), [children]);

  const markInteracting = (pauseMs = 5200) => {
    pauseUntilRef.current = Date.now() + pauseMs;
    setIsInteracting(true);
    if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = window.setTimeout(() => setIsInteracting(false), 3200);
  };

  const moveByOneItem = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    const firstSlide = track.children.item(0) as HTMLElement | null;
    const secondSlide = track.children.item(1) as HTMLElement | null;
    if (!firstSlide || !secondSlide) return;

    const step = secondSlide.offsetLeft - firstSlide.offsetLeft;
    if (step <= 0) return;

    markInteracting(5600);
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  useEffect(() => () => {
    if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
    if (normalizeTimerRef.current) window.clearTimeout(normalizeTimerRef.current);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length < 2) return;

    const copyStart = (copy: number) => track.querySelector<HTMLElement>(`[data-carousel-copy="${copy}"][data-carousel-index="0"]`);

    const jumpTo = (left: number) => {
      const previousBehavior = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = left;
      track.style.scrollBehavior = previousBehavior;
    };

    const normalizeLoop = () => {
      const firstStart = copyStart(0);
      const secondStart = copyStart(1);
      const thirdStart = copyStart(2);
      if (!firstStart || !secondStart || !thirdStart) return;

      const segmentWidth = secondStart.offsetLeft - firstStart.offsetLeft;
      if (segmentWidth <= 0) return;

      if (track.scrollLeft >= thirdStart.offsetLeft - 2) {
        jumpTo(track.scrollLeft - segmentWidth);
      } else if (track.scrollLeft <= firstStart.offsetLeft + 2) {
        jumpTo(track.scrollLeft + segmentWidth);
      }
    };

    const initialize = () => {
      const secondStart = copyStart(1);
      if (!secondStart) return;
      if (Math.abs(track.scrollLeft - secondStart.offsetLeft) > 2) jumpTo(secondStart.offsetLeft);
    };

    const scheduleNormalize = (delay = 110) => {
      if (normalizeTimerRef.current) window.clearTimeout(normalizeTimerRef.current);
      normalizeTimerRef.current = window.setTimeout(normalizeLoop, delay);
    };

    const advance = () => {
      if (dragRef.current || document.hidden || Date.now() < pauseUntilRef.current) return;
      normalizeLoop();

      const firstSlide = track.children.item(0) as HTMLElement | null;
      const secondSlide = track.children.item(1) as HTMLElement | null;
      if (!firstSlide || !secondSlide) return;

      const step = secondSlide.offsetLeft - firstSlide.offsetLeft;
      if (step <= 0) return;

      track.scrollBy({ left: step, behavior: "smooth" });
      scheduleNormalize(900);
    };

    const onScroll = () => scheduleNormalize(160);
    const frame = window.requestAnimationFrame(initialize);
    const timer = window.setInterval(advance, 3600);
    const resizeObserver = new ResizeObserver(() => window.requestAnimationFrame(initialize));
    resizeObserver.observe(track);
    track.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      resizeObserver.disconnect();
      track.removeEventListener("scroll", onScroll);
    };
  }, [items.length]);

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const drag = dragRef.current;
    if (!track || !drag || drag.pointerId !== event.pointerId) return;

    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setIsDragging(false);
    markInteracting();

    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { suppressClickRef.current = false; }, 120);
  };

  return (
    <div className={`product-carousel-shell ${isInteracting || isDragging ? "is-active" : ""}`.trim()}>
      {items.length > 1 && (
        <div className="product-carousel-controls" aria-label={`Controles do carrossel ${label}`}>
          <button type="button" onClick={() => moveByOneItem(-1)} aria-label={`Voltar produtos de ${label}`}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => moveByOneItem(1)} aria-label={`Avançar produtos de ${label}`}>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}

      <div
        ref={trackRef}
        className={`product-grid mobile-auto-track infinite-carousel-track ${isInteracting ? "is-interacting" : ""} ${isDragging ? "is-dragging" : ""} ${className}`.trim()}
        aria-label={label}
        onPointerDown={(event) => {
          // No celular, o gesto continua nativo, mas também ativa o feedback
          // laranja do título enquanto o usuário toca ou arrasta a prateleira.
          if (event.pointerType !== "mouse") {
            markInteracting(7000);
            return;
          }
          if (event.button !== 0) return;
          const track = trackRef.current;
          if (!track) return;

          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: track.scrollLeft,
            moved: false,
          };
          track.setPointerCapture(event.pointerId);
          setIsDragging(true);
          markInteracting();
        }}
        onPointerMove={(event) => {
          const track = trackRef.current;
          const drag = dragRef.current;
          if (!track || !drag || drag.pointerId !== event.pointerId) return;

          const deltaX = event.clientX - drag.startX;
          if (Math.abs(deltaX) > 5) drag.moved = true;
          if (!drag.moved) return;

          event.preventDefault();
          track.scrollLeft = drag.startScrollLeft - deltaX;
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onTouchStart={() => markInteracting(7000)}
        onTouchMove={() => markInteracting(7000)}
        onTouchEnd={() => markInteracting(6200)}
        onWheel={() => markInteracting(5000)}
        onFocus={() => markInteracting(5000)}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {[0, 1, 2].flatMap((copy) => items.map((item, index) => (
          <div
            className="carousel-slide"
            data-carousel-copy={copy}
            data-carousel-index={index}
            aria-hidden={copy !== 1 ? "true" : undefined}
            key={`carousel-${copy}-${index}`}
          >
            {item}
          </div>
        )))}
      </div>
    </div>
  );
}

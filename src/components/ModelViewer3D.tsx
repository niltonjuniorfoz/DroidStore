"use client";

import React, { useEffect, useState } from "react";
import { RotateCw, Sparkles } from "lucide-react";

type ModelViewer3DProps = {
  src: string;
  alt?: string;
  className?: string;
  autoRotate?: boolean;
};

export default function ModelViewer3D({
  src,
  alt = "Modelo 3D interativo 360°",
  className = "",
  autoRotate = true,
}: ModelViewer3DProps) {
  const [loaded, setLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(src);

  const isIframe = Boolean(
    src && (src.includes("gsmarena.com") || src.includes("binkies3d") || src.includes("sketchfab.com") || src.includes("/embed"))
  );

  useEffect(() => {
    if (typeof window !== "undefined" && src?.startsWith("/")) {
      setResolvedSrc(`${window.location.origin}${src}`);
    } else {
      setResolvedSrc(src);
    }
  }, [src]);

  useEffect(() => {
    if (typeof window === "undefined" || isIframe) return;

    if (customElements.get("model-viewer")) {
      setLoaded(true);
      return;
    }

    const scriptId = "google-model-viewer-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
      script.onload = () => setLoaded(true);
      script.onerror = () => setLoaded(true);
      document.head.appendChild(script);
    }

    customElements.whenDefined("model-viewer").then(() => {
      setLoaded(true);
    });

    const timer = setTimeout(() => {
      setLoaded(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [resolvedSrc, isIframe]);

  if (!src) return null;

  if (isIframe) {
    const proxyUrl = src.includes("gsmarena.com") || src.includes("binkies3d")
      ? `/api/3d-proxy?url=${encodeURIComponent(src)}`
      : src;

    return (
      <div
        className={`model-viewer-container ${className}`}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "380px",
          background: "#ffffff",
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <iframe
          src={proxyUrl}
          title={alt}
          style={{ width: "100%", height: "100%", minHeight: "380px", border: "none", borderRadius: "18px" }}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
      </div>
    );
  }

  const ModelViewerTag = "model-viewer" as unknown as React.ElementType;

  return (
    <div
      className={`model-viewer-container ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "380px",
        background: "#f8faf9",
        borderRadius: "18px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f1f5f3",
            color: "#64748b",
            gap: "0.5rem",
            zIndex: 10,
          }}
        >
          <RotateCw className="animate-spin" style={{ width: "26px", height: "26px", color: "var(--store-orange)" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Carregando Modelo 3D...</span>
        </div>
      )}

      <ModelViewerTag
        src={resolvedSrc}
        alt={alt}
        camera-controls=""
        auto-rotate={autoRotate ? "" : undefined}
        shadow-intensity="1"
        camera-orbit="0deg 75deg 105%"
        field-of-view="30deg"
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        touch-action="pan-y"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "380px",
          outline: "none",
          background: "transparent",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "12px",
          right: "12px",
          pointerEvents: "none",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: "999px",
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.76rem",
          fontWeight: 600,
          color: "#334155",
          zIndex: 5,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
        }}
      >
        <Sparkles style={{ width: "14px", height: "14px", color: "var(--store-orange)" }} />
        <span>Arraste para girar 360°</span>
      </div>
    </div>
  );
}

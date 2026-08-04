"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Imagem acima da dobra (LCP): carrega imediatamente com prioridade alta. */
  priority?: boolean;
  /** Dica de largura renderizada para o srcset (padrão: card de catálogo). */
  sizes?: string;
};

// Espelho da allowlist em next.config.mjs — host fora dela cai no <img> comum
// (o otimizador da Vercel só aceita hosts declarados).
const optimizedHosts = [".public.blob.vercel-storage.com", "cdn.atacadoconnect.com", "www.atlanticoshop.com.py"];

function canOptimize(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === "https:" && optimizedHosts.some((host) =>
      host.startsWith(".") ? hostname.endsWith(host) : hostname === host,
    );
  } catch {
    return false;
  }
}

export default function ProductImage({ src, alt, className = "", priority = false, sizes = "(max-width: 768px) 50vw, 25vw" }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return <span className={`product-image-empty ${className}`.trim()} aria-hidden="true" />;
  }

  if (!canOptimize(src)) {
    return (
      <img
        className={className || undefined}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onError={() => setFailed(true)}
      />
    );
  }

  // width/height só reservam proporção intrínseca; o tamanho visual continua
  // 100% controlado pelas classes CSS existentes (mesmo comportamento do <img>).
  return (
    <Image
      className={className || undefined}
      src={src}
      alt={alt}
      width={640}
      height={640}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}

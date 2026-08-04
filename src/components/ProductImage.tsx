"use client";

import { useEffect, useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Imagem acima da dobra (LCP): carrega imediatamente com prioridade alta. */
  priority?: boolean;
};

export default function ProductImage({ src, alt, className = "", priority = false }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return <span className={`product-image-empty ${className}`.trim()} aria-hidden="true" />;
  }

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

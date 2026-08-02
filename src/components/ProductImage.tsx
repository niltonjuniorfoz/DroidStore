"use client";

import { useEffect, useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
};

export default function ProductImage({ src, alt, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return <span className={`product-image-empty ${className}`.trim()} aria-hidden="true" />;
  }

  return <img className={className || undefined} src={src} alt={alt} onError={() => setFailed(true)} />;
}

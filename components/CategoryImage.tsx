"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";

/**
 * Category banner image. With no image URL (or if it fails to load) a
 * soft placeholder tinted with the storefront accent is shown instead, so
 * there are never broken images. Plain <img> for the same reason as
 * ProductImage: admins can paste image URLs from any domain.
 */
export function CategoryImage({
  src = "",
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no image yet)`}
        className={`flex items-center justify-center bg-gradient-to-br from-accent/15 to-muted ${className}`}
      >
        <LayoutGrid className="h-8 w-8 text-accent/40" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} className={`object-cover ${className}`} />
  );
}

"use client";

import { useState } from "react";
import { ImageOff, Package } from "lucide-react";

/**
 * Shows the product image if an image URL is set and loads correctly.
 * Otherwise shows a neutral placeholder, so there are never broken images.
 *
 * A plain <img> is used on purpose: image URLs are typed in by store
 * admins and can point at any domain, which next/image would need to
 * list in next.config.ts first.
 */
export function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Above-the-fold image (e.g. a hero or the main product photo): load eagerly. */
  priority?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={failed ? `${alt} (image could not be loaded)` : `${alt} (no image yet)`}
        className={`flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground ${className}`}
      >
        {failed ? (
          <ImageOff className="h-8 w-8" aria-hidden />
        ) : (
          <Package className="h-8 w-8" aria-hidden />
        )}
        <span className="text-xs font-medium">{failed ? "Image unavailable" : "No image yet"}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}

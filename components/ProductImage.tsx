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
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={failed ? `${alt} (image could not be loaded)` : `${alt} (no image yet)`}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 ${className}`}
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
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}

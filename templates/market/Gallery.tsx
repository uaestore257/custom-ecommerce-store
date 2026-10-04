"use client";

import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import type { StorefrontImage } from "@/lib/storefront-types";

/** A contained square image on a white tile, with a thumbnail row when there are several. */
export function MarketGallery({ images, name }: { images: StorefrontImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const altFor = (image: StorefrontImage, i: number) => image.alt || `${name}${images.length > 1 ? `, image ${i + 1} of ${images.length}` : ""}`;
  return (
    <div>
      <div className="overflow-hidden rounded-card border border-border bg-surface p-4">
        <ProductImage key={current.url} src={current.url} alt={altFor(current, index)} priority className="aspect-square w-full object-contain!" />
      </div>
      {images.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`block w-16 overflow-hidden rounded-control border-2 bg-surface p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${i === index ? "border-accent" : "border-border"}`}
              >
                <ProductImage src={image.url} alt="" className="aspect-square w-full object-contain!" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

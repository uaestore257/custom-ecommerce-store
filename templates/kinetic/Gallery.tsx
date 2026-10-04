"use client";

import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import type { StorefrontImage } from "@/lib/storefront-types";

/** One large square image on a tinted panel, with a thumbnail rail when there are several. */
export function KineticGallery({ images, name }: { images: StorefrontImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const altFor = (image: StorefrontImage, i: number) =>
    image.alt || `${name}${images.length > 1 ? `, image ${i + 1} of ${images.length}` : ""}`;

  return (
    <div>
      <div className="overflow-hidden rounded-card border-2 border-foreground bg-accent/10">
        <ProductImage key={current.url} src={current.url} alt={altFor(current, index)} priority className="aspect-square w-full" />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label={`${name} images`}>
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`block w-16 overflow-hidden rounded-control border-2 bg-accent/10 transition duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-20 ${
                  i === index ? "border-foreground" : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                <ProductImage src={image.url} alt="" className="aspect-square w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

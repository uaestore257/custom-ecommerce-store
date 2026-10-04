"use client";

import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import type { StorefrontImage } from "@/lib/storefront-types";
import { noorArch, noorArchFrame } from "./styles";
import { useNoor } from "./useNoor";

/**
 * The product in a large arched frame, with small arched thumbnails
 * beneath when there are several photographs.
 */
export function NoorGallery({ images, name }: { images: StorefrontImage[]; name: string }) {
  const { t } = useNoor();
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const altFor = (image: StorefrontImage, i: number) => image.alt || t.imageOf(name, i + 1, images.length);

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className={noorArchFrame}>
        <div className={noorArch}>
          <ProductImage key={current.url} src={current.url} alt={altFor(current, index)} priority className="aspect-[3/4] w-full transition duration-700 ease-out starting:scale-[1.03] starting:opacity-0 motion-reduce:transition-none" />
        </div>
      </div>
      {images.length > 1 && (
        <ul className="mt-5 flex justify-center gap-3">
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t.showImage(i + 1, images.length)}
                aria-pressed={i === index}
                className={`block w-14 rounded-t-full border p-0.5 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-16 ${i === index ? "border-foreground" : "border-border opacity-70 hover:opacity-100"}`}
              >
                <span className="block overflow-hidden rounded-t-full">
                  <ProductImage src={image.url} alt="" className="aspect-[3/4] w-full" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

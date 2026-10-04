"use client";

import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import type { StorefrontImage } from "@/lib/storefront-types";

/**
 * The editorial gallery. Phones: a full-width swipe carousel of 2:3
 * photographs with a "1 / n" counter. Large screens: every photograph in a
 * two-column grid beside the purchase column (the counter is hidden).
 */
export function MaisonGallery({ images, name }: { images: StorefrontImage[]; name: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const altFor = (image: StorefrontImage, i: number) =>
    image.alt || `${name}${images.length > 1 ? `, photograph ${i + 1} of ${images.length}` : ""}`;

  // Which slide is showing, from the carousel's scroll position (mirrors in RTL).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || images.length < 2) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const width = track.clientWidth || 1;
      setIndex(Math.min(images.length - 1, Math.max(0, Math.round(Math.abs(track.scrollLeft) / width))));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    track.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", schedule);
    };
  }, [images.length]);

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:gap-2 lg:overflow-visible"
      >
        {images.map((image, i) => (
          <li key={`${image.url}-${i}`} className="w-full shrink-0 snap-center lg:w-auto">
            <ProductImage src={image.url} alt={altFor(image, i)} priority={i === 0} className="aspect-[2/3] w-full bg-muted" />
          </li>
        ))}
      </ul>
      {images.length > 1 && (
        <p aria-hidden className="absolute bottom-4 end-4 bg-background/80 px-2.5 py-1 text-[11px] tabular-nums tracking-[0.2em] lg:hidden rtl:tracking-normal">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

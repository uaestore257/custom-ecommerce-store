"use client";

import { useState } from "react";
import type { Store } from "@/lib/types";

/** Store logo image, or a coloured initial if there is no (working) logo. */
export function StoreLogo({ store, size = "md" }: { store: Store; size?: "sm" | "md" }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = store.settings.logoUrl;
  const box = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${store.name} logo`}
        onError={() => setFailedSrc(src)}
        className={`${box} shrink-0 rounded-lg object-contain`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-lg font-bold text-white`}
      style={{ backgroundColor: store.settings.accentColor }}
    >
      {store.name.trim().charAt(0).toUpperCase() || "S"}
    </span>
  );
}

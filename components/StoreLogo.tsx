"use client";

import { useState } from "react";
import type { Store } from "@/lib/types";

/** What a logo needs: works for demo stores and database stores. */
export type LogoSource =
  | Pick<Store, "name" | "settings">
  | { name: string; logoUrl: string | null; accentColor: string | null };

function logoParts(store: LogoSource) {
  return "settings" in store
    ? { name: store.name, logoUrl: store.settings.logoUrl, accentColor: store.settings.accentColor }
    : { name: store.name, logoUrl: store.logoUrl ?? "", accentColor: store.accentColor ?? "#0f766e" };
}

/** Store logo image, or a coloured initial if there is no (working) logo. */
export function StoreLogo({ store, size = "md" }: { store: LogoSource; size?: "sm" | "md" }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { name, logoUrl: src, accentColor } = logoParts(store);
  const box = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        onError={() => setFailedSrc(src)}
        className={`${box} shrink-0 rounded-lg object-contain`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-lg font-bold text-white`}
      style={{ backgroundColor: accentColor }}
    >
      {name.trim().charAt(0).toUpperCase() || "S"}
    </span>
  );
}

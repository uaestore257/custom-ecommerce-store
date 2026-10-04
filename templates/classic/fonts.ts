import { Playfair_Display } from "next/font/google";
import type { TemplateFonts } from "../types";

// preload: false — every template's fonts are reachable from the shared
// storefront routes, and Next preloads per importing route. Without
// preloading, a browser downloads a font file only when the active
// template's CSS actually uses it, so stores never fetch other templates'
// fonts. display: "swap" keeps text visible meanwhile.
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false });

export const classicFonts: TemplateFonts = {
  heading: `${playfair.style.fontFamily}, Georgia, serif`,
  // Geist is loaded globally by the root layout (admin and platform UI).
  body: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
};

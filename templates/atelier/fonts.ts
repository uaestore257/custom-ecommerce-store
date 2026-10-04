import { Amiri, Cormorant_Garamond, Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import type { TemplateFonts } from "../types";

// See templates/classic/fonts.ts for why template fonts are not preloaded
// and how the Arabic companions are only fetched for Arabic text.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
const text = Hanken_Grotesk({ subsets: ["latin"], display: "swap", preload: false });
// Amiri: classical Naskh book type, the Arabic counterpart of Cormorant.
const displayArabic = Amiri({ subsets: ["arabic"], weight: ["400", "700"], display: "swap", preload: false });
const textArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

export const atelierFonts: TemplateFonts = {
  heading: `${display.style.fontFamily}, ${displayArabic.style.fontFamily}, "Times New Roman", serif`,
  body: `${text.style.fontFamily}, ${textArabic.style.fontFamily}, Arial, Helvetica, sans-serif`,
};

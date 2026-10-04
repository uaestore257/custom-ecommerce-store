import { Almarai, Bodoni_Moda, El_Messiri, Inter_Tight } from "next/font/google";
import type { TemplateFonts } from "../types";

// See templates/classic/fonts.ts for why template fonts are not preloaded
// and how the Arabic companions are only fetched for Arabic text.
const display = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });
const text = Inter_Tight({ subsets: ["latin"], display: "swap", preload: false });
// El Messiri: a refined modern Arabic display face for Bodoni's role;
// Almarai: a clean Gulf sans for running text.
const displayArabic = El_Messiri({ subsets: ["arabic"], display: "swap", preload: false });
const textArabic = Almarai({ subsets: ["arabic"], weight: ["300", "400", "700"], display: "swap", preload: false });

export const maisonFonts: TemplateFonts = {
  heading: `${display.style.fontFamily}, ${displayArabic.style.fontFamily}, Didot, "Times New Roman", serif`,
  body: `${text.style.fontFamily}, ${textArabic.style.fontFamily}, Arial, Helvetica, sans-serif`,
};

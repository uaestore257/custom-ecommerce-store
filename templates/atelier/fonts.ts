import { Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";
import type { TemplateFonts } from "../types";

// See templates/classic/fonts.ts for why template fonts are not preloaded.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
const text = Hanken_Grotesk({ subsets: ["latin"], display: "swap", preload: false });

export const atelierFonts: TemplateFonts = {
  heading: `${display.style.fontFamily}, "Times New Roman", serif`,
  body: `${text.style.fontFamily}, Arial, Helvetica, sans-serif`,
};

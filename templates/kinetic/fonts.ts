import { Bricolage_Grotesque, Readex_Pro } from "next/font/google";
import type { TemplateFonts } from "../types";

// See templates/classic/fonts.ts for why template fonts are not preloaded.
// Readex Pro covers Latin and Arabic, so it is both the text face and the
// Arabic companion to Bricolage Grotesque; its Arabic file is fetched only
// when Arabic text is on the page (per-subset unicode ranges).
const display = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false });
const text = Readex_Pro({ subsets: ["latin", "arabic"], display: "swap", preload: false });

export const kineticFonts: TemplateFonts = {
  heading: `${display.style.fontFamily}, ${text.style.fontFamily}, Arial, Helvetica, sans-serif`,
  body: `${text.style.fontFamily}, Arial, Helvetica, sans-serif`,
};

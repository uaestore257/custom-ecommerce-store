import { Amiri, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Marcellus, Reem_Kufi } from "next/font/google";
import type { TemplateFonts } from "../types";

// See templates/classic/fonts.ts for why template fonts are not preloaded.
// Arabic is a first language here, not a fallback: Reem Kufi (a modern
// Kufi) sets Arabic headings beside Marcellus, IBM Plex Sans Arabic sets
// Arabic text and interface beside IBM Plex Sans, and Amiri (classical
// Naskh) is reserved for the house note. Arabic files are still fetched
// only when Arabic text is on the page (per-subset unicode ranges).
const display = Marcellus({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const displayArabic = Reem_Kufi({ subsets: ["arabic"], display: "swap", preload: false });
const text = IBM_Plex_Sans({ subsets: ["latin"], display: "swap", preload: false });
const textArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], display: "swap", preload: false });
const naskh = Amiri({ subsets: ["arabic"], weight: ["400"], display: "swap", preload: false });

export const noorFonts: TemplateFonts = {
  heading: `${display.style.fontFamily}, ${displayArabic.style.fontFamily}, Georgia, serif`,
  body: `${text.style.fontFamily}, ${textArabic.style.fontFamily}, Arial, Helvetica, sans-serif`,
};

/** The house note's face: Marcellus for Latin text, Amiri for Arabic. */
export const noorNoteFont = `${display.style.fontFamily}, ${naskh.style.fontFamily}, Georgia, serif`;

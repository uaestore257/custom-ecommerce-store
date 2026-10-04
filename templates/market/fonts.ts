import { Figtree, IBM_Plex_Sans_Arabic } from "next/font/google";
import type { TemplateFonts } from "../types";

// See templates/classic/fonts.ts for why template fonts are not preloaded.
// One humanist family for everything (prices and labels included), with
// IBM Plex Sans Arabic as the Arabic companion, fetched only when Arabic
// text is on the page (per-subset unicode ranges).
const text = Figtree({ subsets: ["latin"], display: "swap", preload: false });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });

export const marketFonts: TemplateFonts = {
  heading: `${text.style.fontFamily}, ${arabic.style.fontFamily}, Arial, Helvetica, sans-serif`,
  body: `${text.style.fontFamily}, ${arabic.style.fontFamily}, Arial, Helvetica, sans-serif`,
};

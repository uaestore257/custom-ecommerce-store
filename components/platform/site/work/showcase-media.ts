import type { StaticImageData } from "next/image";
import type { TemplateKey } from "@/lib/templates/registry";
import atelierDesktop from "@/public/showcase/atelier-desktop.jpg";
import atelierMobile from "@/public/showcase/atelier-mobile.jpg";
import atelierTall from "@/public/showcase/atelier-tall.jpg";
import classicDesktop from "@/public/showcase/classic-desktop.jpg";
import classicMobile from "@/public/showcase/classic-mobile.jpg";
import classicTall from "@/public/showcase/classic-tall.jpg";

// ---------------------------------------------------------------
// Screenshots of the REAL demo storefronts, rendered by the real
// templates and captured with scripts/capture-showcase.mjs (re-run it after
// changing a template or the demo content). Record<TemplateKey, …>: a new
// template needs its screenshots before the site can present it.
// ---------------------------------------------------------------

export interface ShowcaseMedia {
  /** First viewport at 1440px. */
  desktop: StaticImageData;
  /** Homepage beyond the first viewport, for the hover pan. */
  tall: StaticImageData;
  /** First viewport at 390px. */
  mobile: StaticImageData;
}

export const SHOWCASE_MEDIA: Readonly<Record<TemplateKey, ShowcaseMedia>> = {
  atelier: { desktop: atelierDesktop, tall: atelierTall, mobile: atelierMobile },
  classic: { desktop: classicDesktop, tall: classicTall, mobile: classicMobile },
};

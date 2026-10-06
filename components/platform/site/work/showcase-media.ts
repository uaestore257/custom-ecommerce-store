import type { StaticImageData } from "next/image";
import type { ShowcasedTemplateKey } from "@/lib/platform/showcase";
import atelierDesktop from "@/public/showcase/atelier-desktop.jpg";
import atelierMobile from "@/public/showcase/atelier-mobile.jpg";
import atelierTall from "@/public/showcase/atelier-tall.jpg";
import classicDesktop from "@/public/showcase/classic-desktop.jpg";
import classicMobile from "@/public/showcase/classic-mobile.jpg";
import classicTall from "@/public/showcase/classic-tall.jpg";
import kineticDesktop from "@/public/showcase/kinetic-desktop.jpg";
import kineticMobile from "@/public/showcase/kinetic-mobile.jpg";
import kineticTall from "@/public/showcase/kinetic-tall.jpg";
import maisonDesktop from "@/public/showcase/maison-desktop.jpg";
import maisonMobile from "@/public/showcase/maison-mobile.jpg";
import maisonTall from "@/public/showcase/maison-tall.jpg";
import marketDesktop from "@/public/showcase/market-desktop.jpg";
import marketMobile from "@/public/showcase/market-mobile.jpg";
import marketTall from "@/public/showcase/market-tall.jpg";
import noorDesktop from "@/public/showcase/noor-desktop.jpg";
import noorMobile from "@/public/showcase/noor-mobile.jpg";
import noorTall from "@/public/showcase/noor-tall.jpg";

// ---------------------------------------------------------------
// Screenshots of the REAL demo storefronts, rendered by the real
// templates and captured with scripts/capture-showcase.mjs (re-run it after
// changing a template or the demo content). Keyed by the SHOWCASED
// templates (SHOWCASE_ORDER): a registered template needs screenshots only
// once it is presented as work, and a showcased one without them is a type
// error.
// ---------------------------------------------------------------

export interface ShowcaseMedia {
  /** First viewport at 1440px. */
  desktop: StaticImageData;
  /** Homepage beyond the first viewport, for the hover pan. */
  tall: StaticImageData;
  /** First viewport at 390px. */
  mobile: StaticImageData;
}

export const SHOWCASE_MEDIA: Readonly<Record<ShowcasedTemplateKey, ShowcaseMedia>> = {
  atelier: { desktop: atelierDesktop, tall: atelierTall, mobile: atelierMobile },
  classic: { desktop: classicDesktop, tall: classicTall, mobile: classicMobile },
  kinetic: { desktop: kineticDesktop, tall: kineticTall, mobile: kineticMobile },
  maison: { desktop: maisonDesktop, tall: maisonTall, mobile: maisonMobile },
  market: { desktop: marketDesktop, tall: marketTall, mobile: marketMobile },
  noor: { desktop: noorDesktop, tall: noorTall, mobile: noorMobile },
};

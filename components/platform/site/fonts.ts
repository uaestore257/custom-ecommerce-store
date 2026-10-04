import { Instrument_Serif } from "next/font/google";

// The business site's display face. Body text uses Geist, which the root
// layout already loads. Not preloaded: this module is reachable from the
// shared storefront layout (it renders the business site on the platform
// root host), and preloading would make every storefront download it.
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const studioFonts = {
  heading: `${display.style.fontFamily}, "Times New Roman", serif`,
  body: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
};

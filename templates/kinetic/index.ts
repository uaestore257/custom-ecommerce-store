import type { StorefrontTemplate } from "../types";
import { KineticCart } from "./Cart";
import { kineticDefinition } from "./definition";
import { kineticFonts } from "./fonts";
import { KineticHome } from "./Home";
import { KineticListing } from "./Listing";
import { KineticProduct } from "./Product";
import { KineticShell } from "./Shell";

export const kineticTemplate: StorefrontTemplate = {
  key: "kinetic",
  definition: kineticDefinition,
  fonts: kineticFonts,
  Shell: KineticShell,
  Home: KineticHome,
  Listing: KineticListing,
  Product: KineticProduct,
  Cart: KineticCart,
  // One hero product plus a featured grid of eight.
  homepageProductCount: 9,
  relatedProductCount: 4,
};

import type { StorefrontTemplate } from "../types";
import { MaisonCart } from "./Cart";
import { maisonDefinition } from "./definition";
import { maisonFonts } from "./fonts";
import { MaisonHome } from "./Home";
import { MaisonListing } from "./Listing";
import { MaisonProduct } from "./Product";
import { MaisonShell } from "./Shell";

export const maisonTemplate: StorefrontTemplate = {
  key: "maison",
  definition: maisonDefinition,
  fonts: maisonFonts,
  Shell: MaisonShell,
  Home: MaisonHome,
  Listing: MaisonListing,
  Product: MaisonProduct,
  Cart: MaisonCart,
  // "The edit": two rows of four.
  homepageProductCount: 8,
  relatedProductCount: 4,
};

import type { StorefrontTemplate } from "../types";
import { AtelierCart } from "./Cart";
import { atelierDefinition } from "./definition";
import { atelierFonts } from "./fonts";
import { AtelierHome } from "./Home";
import { AtelierListing } from "./Listing";
import { AtelierProduct } from "./Product";
import { AtelierShell } from "./Shell";

export const atelierTemplate: StorefrontTemplate = {
  key: "atelier",
  definition: atelierDefinition,
  fonts: atelierFonts,
  Shell: AtelierShell,
  Home: AtelierHome,
  Listing: AtelierListing,
  Product: AtelierProduct,
  Cart: AtelierCart,
  // One feature piece plus a row (see the "Selected pieces" grid).
  homepageProductCount: 5,
  relatedProductCount: 4,
};

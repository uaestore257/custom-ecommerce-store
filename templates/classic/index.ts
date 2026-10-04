import type { StorefrontTemplate } from "../types";
import { ClassicCart } from "./Cart";
import { classicDefinition } from "./definition";
import { classicFonts } from "./fonts";
import { ClassicHome } from "./Home";
import { ClassicListing } from "./Listing";
import { ClassicProduct } from "./Product";
import { ClassicShell } from "./Shell";

export const classicTemplate: StorefrontTemplate = {
  key: "classic",
  definition: classicDefinition,
  fonts: classicFonts,
  Shell: ClassicShell,
  Home: ClassicHome,
  Listing: ClassicListing,
  Product: ClassicProduct,
  Cart: ClassicCart,
  homepageProductCount: 4,
  relatedProductCount: 4,
};

import type { StorefrontTemplate } from "../types";
import { NoorCart } from "./Cart";
import { noorDefinition } from "./definition";
import { noorFonts } from "./fonts";
import { NoorHome } from "./Home";
import { NoorListing } from "./Listing";
import { NoorProduct } from "./Product";
import { NoorShell } from "./Shell";

export const noorTemplate: StorefrontTemplate = {
  key: "noor",
  definition: noorDefinition,
  fonts: noorFonts,
  Shell: NoorShell,
  Home: NoorHome,
  Listing: NoorListing,
  Product: NoorProduct,
  Cart: NoorCart,
  // "Featured pieces": two rows of four.
  homepageProductCount: 8,
  relatedProductCount: 4,
  // P5: "Discover by collection" — three collections, four pieces each.
  homepageShelves: { categories: 3, perCategory: 4 },
};

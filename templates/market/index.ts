import type { StorefrontTemplate } from "../types";
import { MarketCart } from "./Cart";
import { marketDefinition } from "./definition";
import { marketFonts } from "./fonts";
import { MarketHome } from "./Home";
import { MarketListing } from "./Listing";
import { MarketProduct } from "./Product";
import { MarketShell } from "./Shell";

export const marketTemplate: StorefrontTemplate = {
  key: "market",
  definition: marketDefinition,
  fonts: marketFonts,
  Shell: MarketShell,
  Home: MarketHome,
  Listing: MarketListing,
  Product: MarketProduct,
  Cart: MarketCart,
  homepageProductCount: 12,
  relatedProductCount: 8,
  // P5: one shelf per category (in store order) for the first six
  // categories, up to ten products each — loaded by the shared core.
  homepageShelves: { categories: 6, perCategory: 10 },
};

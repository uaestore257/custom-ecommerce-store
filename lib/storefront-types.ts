// ---------------------------------------------------------------
// STOREFRONT DATA CONTRACT
// Plain, serializable shapes the shared storefront core
// (lib/server/storefront/*) hands to templates and client islands. They
// only ever describe ACTIVE, non-archived stores and ACTIVE products.
// Money is sent as exact minor units in a string (JSON has no BigInt),
// next to the store's currency and ISO 4217 minor units — never a float.
// Templates render these; they never query the database themselves.
// ---------------------------------------------------------------
import type { TemplateKey } from "./templates/registry";
import type { ThemeSelection } from "./templates/types";
import type { PaymentMethodId } from "./types";

export interface StorefrontStore {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  accentColor: string;
  countryCode: string;
  countryName: string;
  currency: string;
  minorUnits: number;
  /** Intl locale used to format this store's money and dates. */
  locale: string;
  /** BCP 47 tag of the store's default language (content language). */
  language: string;
  /** Writing direction of that language. */
  direction: "ltr" | "rtl";
  /** Registered template (unknown stored keys already resolved to the default). */
  templateKey: TemplateKey;
  /** Normalized option choices for that template. */
  theme: ThemeSelection;
  isDemo: boolean;
  tagline: string;
  heroTitle: string;
  heroText: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  /** Enabled payment methods, in the store's order. */
  paymentMethods: PaymentMethodId[];
}

export interface StorefrontCategory {
  id: string;
  /** URL segment in the store's default language: /shop/<slug>. */
  slug: string;
  name: string;
  imageUrl: string;
  /** ACTIVE products in this category. */
  productCount: number;
}

/** What product cards, the cart and checkout need. */
export interface StorefrontProductSummary {
  id: string;
  storeId: string;
  /** URL segment in the store's default language: /products/<slug>. */
  slug: string;
  name: string;
  sku: string;
  /** "" when the product has no category. */
  categoryId: string;
  priceMinor: string;
  compareAtMinor: string | null;
  deliveryFeeMinor: string;
  freeDelivery: boolean;
  pickupOnly: boolean;
  imageUrl: string;
  stock: number;
  featured: boolean;
}

export interface StorefrontImage {
  url: string;
  alt: string;
}

/** A full product page. */
export interface StorefrontProduct extends StorefrontProductSummary {
  description: string;
  /** All images in display order (imageUrl is the first). */
  images: StorefrontImage[];
}

/** The minimum the cart needs to add a product (stock and the price the shopper saw). */
export type CartProductRef = Pick<StorefrontProductSummary, "id" | "storeId" | "stock" | "priceMinor">;

/** The store a request serves, plus its navigation. Small: no product list. */
export interface StorefrontContext {
  store: StorefrontStore;
  categories: StorefrontCategory[];
}

/** Products the cart maths runs over (only those in the cart, freshly read). */
export interface StorefrontCatalog extends StorefrontContext {
  products: StorefrontProductSummary[];
}

export const LISTING_SORTS = ["featured", "newest", "price-asc", "price-desc"] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export interface ListingQuery {
  page: number;
  sort: ListingSort;
  /** Trimmed search text, "" for none. */
  q: string;
}

/** One bounded page of a product listing. */
export interface ProductListing {
  products: StorefrontProductSummary[];
  /** The category being listed, or null for all products. */
  category: StorefrontCategory | null;
  query: ListingQuery;
  total: number;
  pageSize: number;
  pageCount: number;
}

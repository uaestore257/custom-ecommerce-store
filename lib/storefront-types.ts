// ---------------------------------------------------------------
// STOREFRONT VIEW TYPES
// Plain, serializable shapes the server (lib/server/storefront/catalog.ts)
// passes to the public storefront's client components. They only ever
// describe ACTIVE, non-archived stores and ACTIVE products. Money is sent
// as exact minor units in a string (JSON has no BigInt), next to the
// store's currency and ISO 4217 minor units — never as a float.
// ---------------------------------------------------------------
import type { PaymentMethodId } from "./types";

export interface StorefrontStore {
  id: string;
  name: string;
  logoUrl: string;
  accentColor: string;
  countryCode: string;
  countryName: string;
  currency: string;
  minorUnits: number;
  /** Intl locale used to format this store's money and dates. */
  locale: string;
  tagline: string;
  heroTitle: string;
  heroText: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  /** null = this store has no delivery rate set up yet. */
  deliveryFeeMinor: string | null;
  freeDeliveryOverMinor: string | null;
  /** Enabled payment methods, in the store's order. */
  paymentMethods: PaymentMethodId[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  imageUrl: string;
}

export interface StorefrontProduct {
  id: string;
  storeId: string;
  name: string;
  description: string;
  sku: string;
  /** "" when the product has no category. */
  categoryId: string;
  priceMinor: string;
  compareAtMinor: string | null;
  imageUrl: string;
  stock: number;
  featured: boolean;
}

export interface StorefrontCatalog {
  store: StorefrontStore;
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}


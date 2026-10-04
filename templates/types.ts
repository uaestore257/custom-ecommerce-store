import type { ComponentType, ReactNode } from "react";
import type { TemplateKey } from "@/lib/templates/registry";
import type { TemplateDefinition } from "@/lib/templates/types";
import type {
  ProductListing,
  StorefrontCategory,
  StorefrontContext,
  StorefrontProduct,
  StorefrontProductSummary,
} from "@/lib/storefront-types";

// ---------------------------------------------------------------
// TEMPLATE CONTRACT — COMPONENT HALF
//
// A template is presentation only. Its components receive typed data from
// the shared storefront core (lib/server/storefront/catalog.ts) and use
// shared behaviour (cart hooks, add-to-cart, checkout, forms) from
// components/storefront/. Templates must NOT query the database, check
// permissions, resolve tenants, compute prices or touch payments/orders.
//
// Routes (app/(storefront)/*) own URLs, metadata, JSON-LD, 404s and
// redirects; they load data and hand it to the active template's page
// components. Checkout, contact and policy pages are shared and render
// inside the template's Shell, styled by its tokens.
// ---------------------------------------------------------------

export interface TemplateShellProps extends StorefrontContext {
  children: ReactNode;
}

export interface TemplateHomeProps extends StorefrontContext {
  featured: StorefrontProductSummary[];
}

export interface TemplateListingProps extends StorefrontContext {
  listing: ProductListing;
}

export interface TemplateProductProps extends StorefrontContext {
  product: StorefrontProduct;
  category: StorefrontCategory | null;
  related: StorefrontProductSummary[];
}

export type TemplateCartProps = StorefrontContext;

export interface TemplateFonts {
  /** CSS font-family stacks (from next/font), applied via --sf-font-heading / --sf-font-body. */
  heading: string;
  body: string;
}

export interface StorefrontTemplate {
  key: TemplateKey;
  definition: TemplateDefinition;
  fonts: TemplateFonts;
  /** Header, navigation, footer and any persistent surfaces (e.g. a cart drawer). */
  Shell: ComponentType<TemplateShellProps>;
  Home: ComponentType<TemplateHomeProps>;
  Listing: ComponentType<TemplateListingProps>;
  Product: ComponentType<TemplateProductProps>;
  Cart: ComponentType<TemplateCartProps>;
  /** How many products the homepage shows (loaded by the route). */
  homepageProductCount: number;
  /** How many related products the product page shows. */
  relatedProductCount: number;
}

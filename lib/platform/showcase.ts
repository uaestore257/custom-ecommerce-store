import { getTemplateDefinition, TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import { semanticCssVariables } from "@/lib/templates/theme";
import type { TemplateColorTokens, TemplateManifest } from "@/lib/templates/types";

// ---------------------------------------------------------------
// PLATFORM SHOWCASE (pure: no React, no database)
//
// What the public business site (the bare PLATFORM_ROOT_DOMAIN: /,
// /portfolio, /services, /platform, /about, /contact) says about the
// demo stores and the templates behind them. Facts come from the template registry, so the
// site can never describe a template, palette or capability the code does
// not have. Live demo links point only at stores the platform owner has
// marked as demos (Store.isDemo) — never at client stores.
// ---------------------------------------------------------------

/**
 * The business site's own surfaces. It renders through the same semantic
 * --sf-* roles as storefronts (semanticCssVariables), with its own constant
 * values: a warm "night" (the default canvas), a deeper "ink" for bands
 * within it, and a limestone "paper" for light sections.
 */
const STUDIO_PAPER: TemplateColorTokens = {
  background: "#f3efe7",
  foreground: "#16140f",
  muted: "#e8e2d6",
  mutedForeground: "#5c564c",
  border: "#d5cdbf",
  surface: "#ebe6dc",
  surfaceElevated: "#faf8f3",
  destructive: "#a3341f",
  success: "#3f6b45",
  warning: "#8a5a12",
  focus: "#16140f",
};

const STUDIO_INK: TemplateColorTokens = {
  background: "#16140f",
  foreground: "#eee8dc",
  muted: "#211e18",
  mutedForeground: "#a8a092",
  border: "#38332b",
  surface: "#1c1a15",
  surfaceElevated: "#25221c",
  destructive: "#e3826d",
  success: "#8fbf94",
  warning: "#d8a85a",
  focus: "#eee8dc",
};

const STUDIO_NIGHT: TemplateColorTokens = {
  background: "#0d0c0a",
  foreground: "#f2ede4",
  muted: "#181613",
  mutedForeground: "#a69e91",
  border: "#2b2824",
  surface: "#141310",
  surfaceElevated: "#1c1a17",
  destructive: "#e3826d",
  success: "#8fbf94",
  warning: "#d8a85a",
  focus: "#f2ede4",
};

const STUDIO_RADIUS = { control: "0px", card: "0px" } as const;

export type StudioTone = "night" | "ink" | "paper";

/** CSS variables for a business-site surface (the page root, or a band inside it). */
export function studioCssVariables(tone: StudioTone): Record<`--${string}`, string> {
  if (tone === "night") return semanticCssVariables(STUDIO_NIGHT, "#e2a766", STUDIO_RADIUS);
  if (tone === "ink") return semanticCssVariables(STUDIO_INK, "#d9a46a", STUDIO_RADIUS);
  return semanticCssVariables(STUDIO_PAPER, "#8a5a2e", STUDIO_RADIUS);
}

/** Portfolio copy for one template. Facts (fonts, ratios, capabilities) stay in its manifest. */
export interface TemplateEditorial {
  /** The demo store's sector, as a client would name it. */
  industry: string;
  /** One line that sells the outcome, set beside the live store. */
  headline: string;
  /** One-line character, set large beside the name. */
  personality: string;
  /** Who it is for, in a client's words. */
  idealFor: string;
  /** Two or three structural signatures that make it more than a colour change. */
  signatures: readonly { title: string; text: string }[];
}

/**
 * Record<TemplateKey, …>: registering a template without its portfolio copy
 * is a type error, so the public site always presents every template.
 */
export const TEMPLATE_EDITORIAL: Readonly<Record<TemplateKey, TemplateEditorial>> = {
  classic: {
    industry: "Fashion & everyday retail",
    headline: "A fast, familiar store that turns browsing into baskets.",
    personality: "Clear, direct and built to convert.",
    idealFor:
      "Retailers with broad or fast-moving catalogues, where customers know what they want and the store should get them to it quickly.",
    signatures: [
      {
        title: "Quick add from every card",
        text: "Square product cards carry category, price, delivery terms and an add-to-cart control, so a full basket never needs a product page.",
      },
      {
        title: "Inline navigation",
        text: "One bar with the essentials and a visible cart count. Nothing is hidden behind a menu on larger screens.",
      },
      {
        title: "A dedicated cart page",
        text: "A full cart with live prices and stock checks before checkout — familiar, unambiguous, quick.",
      },
    ],
  },
  atelier: {
    industry: "Furniture & interiors",
    headline: "An editorial showroom for considered, higher-value pieces.",
    personality: "Editorial, unhurried and product-led.",
    idealFor:
      "Furniture, interiors and design-led brands with considered, higher-value pieces — where the photograph and the story sell, and the store should feel like a showroom.",
    signatures: [
      {
        title: "A numbered collection index",
        text: "Collections are presented as a typographic index rather than a grid of tiles — calm, scannable and unmistakably editorial.",
      },
      {
        title: "Tall, frameless imagery",
        text: "4:5 photographs run edge to edge with no card chrome. The product page stacks every image beside a sticky purchase panel.",
      },
      {
        title: "A cart drawer and a cart page",
        text: "Adding a piece opens a quiet drawer so browsing continues; the full cart page is always one step away.",
      },
    ],
  },
  kinetic: {
    industry: "Direct-to-consumer brands",
    headline: "A bold, product-led store that sells from the first screen.",
    personality: "Energetic, direct and built for the thumb.",
    idealFor:
      "Brands with a focused range — electronics and audio, skincare, supplements, drinks, sportswear — where the product is the hero and the path from first look to checkout should be short.",
    signatures: [
      {
        title: "A hero that sells",
        text: "The homepage opens on a real product with its price and a working add-to-cart, set beside a colour block in the brand's own accent.",
      },
      {
        title: "Category chip rail",
        text: "A compact sticky bar over a scrolling rail of categories, so every part of the range is one tap away on any screen.",
      },
      {
        title: "Built for the thumb",
        text: "Square cards with quick add, a facts strip and sticky buy bar on product pages, and a cart that rises as a bottom sheet on phones.",
      },
    ],
  },
};

/**
 * The templates the public site presents as work, in order: the flagship
 * furniture template first. A template joins this list once it has a demo
 * store and screenshots (SHOWCASE_MEDIA is keyed by these keys, so a listed
 * template without media is a type error). A registered template that is
 * not listed here still has its editorial copy and specimen, and is still
 * offered in the template explorer and the admin; it just isn't shown as a
 * case study yet. Each key at most once (tested).
 */
export const SHOWCASE_ORDER = ["atelier", "classic"] as const satisfies readonly TemplateKey[];
export type ShowcasedTemplateKey = (typeof SHOWCASE_ORDER)[number];

export function isShowcasedTemplate(key: TemplateKey): key is ShowcasedTemplateKey {
  return (SHOWCASE_ORDER as readonly TemplateKey[]).includes(key);
}

/** Entry points into a live demo storefront. Every URL is absolute, on the demo store's own host. */
export interface DemoStoreLinks {
  storeName: string;
  home: string;
  /** null when the deep page is not reachable directly (e.g. the temporary path-preview mode). */
  listing: string | null;
  product: string | null;
  cart: string | null;
}

/**
 * Deep links into a demo storefront from its homepage URL (from
 * storefrontPreviewUrlForSlug) and one of its product paths. In the
 * temporary path-preview mode the store is selected by visiting
 * /preview/<slug> first, so only that entry point is offered.
 */
export function buildDemoStoreLinks(
  storeName: string,
  storefrontUrl: string | null,
  productPath: string | null,
): DemoStoreLinks | null {
  if (!storefrontUrl) return null;
  let home: URL;
  try {
    home = new URL(storefrontUrl);
  } catch {
    return null;
  }
  if (home.protocol !== "http:" && home.protocol !== "https:") return null;
  const entry = home.toString();
  if (home.pathname !== "/") return { storeName, home: entry, listing: null, product: null, cart: null };
  const at = (path: string) => new URL(path, home).toString();
  return {
    storeName,
    home: entry,
    listing: at("/shop"),
    product: productPath && productPath.startsWith("/products/") ? at(productPath) : null,
    cart: at("/cart"),
  };
}

export interface TemplateShowcaseEntry {
  key: ShowcasedTemplateKey;
  manifest: TemplateManifest;
  editorial: TemplateEditorial;
  /** The template's first public demo store, if the platform owner has marked one. */
  demo: DemoStoreLinks | null;
}

/** Counts the public site may state, derived from the registry (never typed in by hand). */
export function platformFacts() {
  const definitions = TEMPLATE_KEYS.map((key) => getTemplateDefinition(key));
  return {
    templates: definitions.length,
    palettes: definitions.reduce((total, definition) => total + Object.keys(definition.theme.palettes).length, 0),
    allRtlReady: definitions.every((definition) => definition.manifest.capabilities.rtlReady),
  };
}

/** Spelled-out small numbers for editorial copy ("Two templates"). */
export function numberWord(value: number): string {
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  return words[value] ?? String(value);
}

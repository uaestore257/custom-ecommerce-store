// ---------------------------------------------------------------
// TEMPLATE DESIGN VOCABULARY (pure)
//
// The closed sets of structural traits a template manifest can declare
// (lib/templates/types.ts → TemplateManifest["design"]), with the one set
// of human labels every catalogue uses: the admin template library and
// Design page, and the business site's comparison and case pages. A new
// value needs its labels here, so no surface can show a raw key.
// ---------------------------------------------------------------

/** How the storefront's primary navigation is structured. */
export const NAVIGATION_STYLES = {
  /** One bar: logo, links and cart inline. */
  "inline-bar": { label: "Inline bar" },
  /** Links at the start, a centred wordmark, utilities at the end. */
  "editorial-split": { label: "Editorial split" },
  /** A minimal bar whose menu opens as a full-screen overlay. */
  "overlay-menu": { label: "Overlay menu" },
  /** A compact bar with a horizontally scrolling rail of categories. */
  "chip-rail": { label: "Category chip rail" },
  /** A prominent search field, with a bottom tab bar on small screens. */
  "search-first-tabbar": { label: "Search-first with tab bar" },
  /** A centred logo above a single centred row of links. */
  "centered-stack": { label: "Centred stack" },
} as const satisfies Record<string, { label: string }>;
export type NavigationStyle = keyof typeof NAVIGATION_STYLES;

/** Where the cart opens. Every template also has the shared /cart page. */
export const CART_PRESENTATIONS = {
  page: { label: "Cart page", description: "Dedicated cart page" },
  /** A side drawer from the inline-end edge, plus the cart page. */
  "drawer-and-page": { label: "Drawer and cart page", description: "Cart drawer and cart page" },
  /** A bottom sheet on small screens (a drawer on large ones), plus the cart page. */
  "sheet-and-page": { label: "Sheet and cart page", description: "Cart sheet and cart page" },
} as const satisfies Record<string, { label: string; description: string }>;
export type CartPresentation = keyof typeof CART_PRESENTATIONS;

/** How much the template moves. Every level is off under prefers-reduced-motion. */
export const MOTION_LEVELS = {
  none: { label: "None" },
  /** Quiet fades and transitions. */
  subtle: { label: "Subtle" },
  /** Pronounced but purposeful: reveals, press feedback, sliding surfaces. */
  expressive: { label: "Expressive" },
} as const satisfies Record<string, { label: string }>;
export type MotionLevel = keyof typeof MOTION_LEVELS;

export function navigationLabel(style: NavigationStyle): string {
  return NAVIGATION_STYLES[style].label;
}

export function cartLabel(presentation: CartPresentation): string {
  return CART_PRESENTATIONS[presentation].label;
}

/** The longer, sentence-style cart description (case pages, the Design page). */
export function cartDescription(presentation: CartPresentation): string {
  return CART_PRESENTATIONS[presentation].description;
}

export function motionLabel(level: MotionLevel): string {
  return MOTION_LEVELS[level].label;
}

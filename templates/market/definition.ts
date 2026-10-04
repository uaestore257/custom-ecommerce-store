import type { TemplateDefinition } from "@/lib/templates/types";

// MARKET — a search-first storefront for high-frequency shopping:
// groceries, food, pharmacy, pet, household, bakeries and florists.
// Structurally different from the other templates: no marketing hero (a
// compact store-facts band instead), a large search field that stays in
// the header on every screen, a category bar, a mobile bottom tab bar
// (Home, Categories, Search, Cart) plus a running cart bar, homepage
// category SHELVES loaded through the shared P5 capability, and compact
// price-first cards whose add button turns into a quantity stepper.
// Pure data.

export const marketDefinition = {
  manifest: {
    key: "market",
    name: "Market",
    version: "1.0.0",
    description:
      "A search-first storefront for everyday shopping: a large persistent search, category shelves on the homepage, compact price-first cards with quantity steppers and a cart that is always one tap away.",
    visualCategory: "Everyday & high-frequency retail",
    bestFor: ["Groceries & food", "Pharmacy & health", "Pet supplies", "Household", "Bakeries & florists"],
    design: {
      navigation: "search-first-tabbar",
      density: "compact",
      typography: {
        heading: "Figtree",
        body: "Figtree",
        arabic: { heading: "IBM Plex Sans Arabic", body: "IBM Plex Sans Arabic" },
      },
      imageTreatment: "Contained square product images on clean white tiles",
      cardImageRatio: "1:1",
      cardStyle: "Compact card: price first, two-line name, add button that becomes a quantity stepper",
      cartPresentation: "page",
      motion: "subtle",
    },
    homepageSections: ["store-facts", "category-grid", "category-shelves", "featured-products"],
    capabilities: {
      rtlReady: true,
      uiLocales: ["en"],
      cartDrawer: false,
      productGallery: true,
      quickAddOnCards: true,
      categoryIndex: false,
    },
  },
  theme: {
    options: {
      palette: {
        label: "Palette",
        description: "Background and text colours. Buttons, steppers and prices use the store's accent colour.",
        choices: [
          { value: "fresh", label: "Fresh", description: "Crisp white with soft green-grey surfaces." },
          { value: "pantry", label: "Pantry", description: "Warm cream, like paper bags and bread." },
          { value: "clinic", label: "Clinic", description: "Cool, clean blue-grey for pharmacies." },
        ],
        default: "fresh",
      },
    },
    palettes: {
      fresh: {
        label: "Fresh",
        tokens: {
          background: "#f6f8f6",
          foreground: "#122017",
          muted: "#ebf0ec",
          mutedForeground: "#4c5a51",
          border: "#d7e0da",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          destructive: "#c0281b",
          success: "#1c7a3e",
          warning: "#8f5300",
          focus: "#122017",
        },
      },
      pantry: {
        label: "Pantry",
        tokens: {
          background: "#faf6ee",
          foreground: "#231b12",
          muted: "#f1e9da",
          mutedForeground: "#5f5446",
          border: "#e3d7c2",
          surface: "#fffdf8",
          surfaceElevated: "#ffffff",
          destructive: "#b42a1d",
          success: "#2d6e35",
          warning: "#8a5205",
          focus: "#231b12",
        },
      },
      clinic: {
        label: "Clinic",
        tokens: {
          background: "#f3f6f9",
          foreground: "#0f1a24",
          muted: "#e6edf3",
          mutedForeground: "#4a5867",
          border: "#d3dde6",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          destructive: "#c0281b",
          success: "#17734a",
          warning: "#8f5300",
          focus: "#0f1a24",
        },
      },
    },
    radius: { control: "0.625rem", card: "0.875rem" },
    // Shared pages (checkout, contact, policies) get Market's sturdy, bold controls.
    controls: { fontWeight: "700", height: { md: "3rem", lg: "3.25rem" } },
    fallbackAccent: "#13804a",
  },
} as const satisfies TemplateDefinition;

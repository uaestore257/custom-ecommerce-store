import type { TemplateDefinition } from "@/lib/templates/types";

// ATELIER — the flagship editorial template for furniture, interiors and
// considered goods. Structurally different from Classic, not a re-skin:
// split editorial navigation, a numbered category index instead of a card
// grid, tall 4:5 imagery, cards without quick add (the product page sells),
// a stacked product gallery with a sticky purchase panel, and a cart
// drawer. Pure data: safe to import anywhere.

export const atelierDefinition = {
  manifest: {
    key: "atelier",
    name: "Atelier",
    version: "1.0.0",
    description:
      "An editorial storefront for furniture and interiors: generous whitespace, tall imagery, a numbered collection index and a calm, product-led purchase flow.",
    visualCategory: "Editorial furniture & interiors",
    bestFor: ["Furniture", "Interiors & homeware", "Lighting", "Design-led small catalogues"],
    design: {
      navigation: "editorial-split",
      density: "airy",
      typography: { heading: "Cormorant Garamond", body: "Hanken Grotesk" },
      imageTreatment: "Full-bleed, edge-to-edge photography without frames",
      cardImageRatio: "4:5",
      cardStyle: "Frameless image with serif name and quiet price; no quick add",
      cartPresentation: "drawer-and-page",
      motion: "subtle",
    },
    homepageSections: ["editorial-hero", "collection-index", "selected-pieces", "atelier-story", "service-notes"],
    capabilities: {
      rtlReady: true,
      uiLocales: ["en"],
      cartDrawer: true,
      productGallery: true,
      quickAddOnCards: false,
      categoryIndex: true,
    },
  },
  theme: {
    options: {
      palette: {
        label: "Palette",
        description: "The material the storefront is printed on.",
        choices: [
          { value: "linen", label: "Linen", description: "Warm off-white with charcoal ink." },
          { value: "stone", label: "Stone", description: "Cool mineral grey." },
          { value: "charcoal", label: "Charcoal", description: "Dark, gallery-like evening palette." },
        ],
        default: "linen",
      },
      hero: {
        label: "Homepage hero",
        description: "How the opening image and headline are composed.",
        choices: [
          { value: "split", label: "Editorial split", description: "Headline column beside a tall photograph." },
          { value: "full-bleed", label: "Full bleed", description: "One wide photograph with the headline set beneath." },
        ],
        default: "split",
      },
    },
    palettes: {
      linen: {
        label: "Linen",
        tokens: {
          background: "#f5f2ec",
          foreground: "#1d1c1a",
          muted: "#ebe6dc",
          mutedForeground: "#6b665d",
          border: "#d8d1c4",
          surface: "#efebe3",
          surfaceElevated: "#faf8f4",
          destructive: "#a3341f",
          success: "#3f6b45",
          warning: "#8a5a12",
          focus: "#1d1c1a",
        },
      },
      stone: {
        label: "Stone",
        tokens: {
          background: "#eceeed",
          foreground: "#1a1d1e",
          muted: "#e0e3e2",
          mutedForeground: "#5e6566",
          border: "#c9cecd",
          surface: "#e4e7e6",
          surfaceElevated: "#f6f7f7",
          destructive: "#a3341f",
          success: "#3f6b45",
          warning: "#8a5a12",
          focus: "#1a1d1e",
        },
      },
      charcoal: {
        label: "Charcoal",
        tokens: {
          background: "#171615",
          foreground: "#ece7de",
          muted: "#22201e",
          mutedForeground: "#a59f94",
          border: "#3a3733",
          surface: "#1e1c1a",
          surfaceElevated: "#262421",
          destructive: "#e3826d",
          success: "#8fbf94",
          warning: "#d8a85a",
          focus: "#ece7de",
        },
      },
    },
    radius: { control: "0px", card: "0px" },
    fallbackAccent: "#7a5c3e",
  },
} as const satisfies TemplateDefinition;

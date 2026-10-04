import type { TemplateDefinition } from "@/lib/templates/types";

// KINETIC — a product-led storefront for direct-to-consumer brands with a
// focused range. Structurally different from Classic and Atelier: the
// store's accent becomes a SURFACE (colour-blocked bands), navigation is a
// compact bar over a category chip rail, the homepage hero sells one real
// product with a working add-to-cart, cards are square with hard 2px
// edges and quick add, the product page carries a facts strip and a sticky
// buy bar, and the cart is a bottom sheet on phones / side drawer on
// larger screens. Pure data: safe to import anywhere.

export const kineticDefinition = {
  manifest: {
    key: "kinetic",
    name: "Kinetic",
    version: "1.0.0",
    description:
      "A bold, product-led storefront for direct-to-consumer brands: colour-blocked sections, a hero that sells a real product, square cards with quick add and a fast, thumb-friendly buy flow.",
    visualCategory: "Modern direct-to-consumer",
    bestFor: ["Electronics & audio", "Skincare & beauty", "Supplements & wellness", "Beverages", "Sportswear"],
    design: {
      navigation: "chip-rail",
      density: "compact",
      typography: {
        heading: "Bricolage Grotesque",
        body: "Readex Pro",
        arabic: { heading: "Readex Pro", body: "Readex Pro" },
      },
      imageTreatment: "Products on tinted, colour-blocked panels with hard edges",
      cardImageRatio: "1:1",
      cardStyle: "Square image on a tinted panel, bold name and price, attached quick-add bar",
      cartPresentation: "sheet-and-page",
      motion: "expressive",
    },
    homepageSections: ["product-hero", "category-rail", "featured-grid", "brand-band", "service-facts"],
    capabilities: {
      rtlReady: true,
      uiLocales: ["en"],
      cartDrawer: true,
      productGallery: true,
      quickAddOnCards: true,
      categoryIndex: false,
    },
  },
  theme: {
    options: {
      palette: {
        label: "Palette",
        description: "The base the colour blocks sit on. Your accent colour becomes a surface, not just the buttons.",
        choices: [
          { value: "paper", label: "Paper", description: "Warm off-white with near-black ink." },
          { value: "chalk", label: "Chalk", description: "Cool, clinical light grey." },
          { value: "ink", label: "Ink", description: "Dark, high-contrast night palette." },
        ],
        default: "paper",
      },
      accentSurface: {
        label: "Accent blocks",
        description: "How strongly the accent colour fills the hero and brand sections.",
        choices: [
          { value: "solid", label: "Solid", description: "Full accent colour blocks." },
          { value: "tint", label: "Tint", description: "A light wash of the accent colour." },
        ],
        default: "solid",
      },
    },
    palettes: {
      paper: {
        label: "Paper",
        tokens: {
          background: "#f6f5f1",
          foreground: "#111110",
          muted: "#ebe9e3",
          mutedForeground: "#57544e",
          border: "#cfccc3",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          destructive: "#c42b1c",
          success: "#1f7a3d",
          warning: "#8f5300",
          focus: "#111110",
        },
      },
      chalk: {
        label: "Chalk",
        tokens: {
          background: "#eef1f3",
          foreground: "#0d1417",
          muted: "#e0e6e9",
          mutedForeground: "#4a575d",
          border: "#c2cbd0",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          destructive: "#c42b1c",
          success: "#1f7a3d",
          warning: "#8f5300",
          focus: "#0d1417",
        },
      },
      ink: {
        label: "Ink",
        tokens: {
          background: "#0e0e10",
          foreground: "#f4f3ef",
          muted: "#1b1b1f",
          mutedForeground: "#a6a4ab",
          border: "#3a3a41",
          surface: "#16161a",
          surfaceElevated: "#1e1e23",
          destructive: "#ff8a7a",
          success: "#74d493",
          warning: "#f0b44c",
          focus: "#f4f3ef",
        },
      },
    },
    radius: { control: "0.375rem", card: "0.5rem" },
    // Shared pages (checkout, contact, policies) speak Kinetic's control
    // language: heavy weight, 2px borders, taller hit areas.
    controls: {
      fontWeight: "700",
      height: { sm: "2.5rem", md: "3rem", lg: "3.5rem" },
      borderWidth: "2px",
      inputStyle: "boxed",
    },
    fallbackAccent: "#f25c27",
  },
} as const satisfies TemplateDefinition;

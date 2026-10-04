import type { TemplateDefinition } from "@/lib/templates/types";

// MAISON — a monochrome couture house for luxury and modest fashion,
// fragrance, jewellery, watches and leather goods. Structurally different
// from Classic, Atelier and Kinetic: navigation hides behind a full-screen
// overlay menu under a centred wordmark that floats transparent over a
// full-screen campaign hero, categories are tall campaign tiles, cards are
// frameless 2:3 images with no quick add, the product page is an editorial
// gallery (a swipe carousel on phones) beside a quiet purchase column with
// details in disclosures, and adding opens a full-height bag drawer. The
// store's accent is used only for small details. Pure data.

export const maisonDefinition = {
  manifest: {
    key: "maison",
    name: "Maison",
    version: "1.0.0",
    description:
      "A monochrome couture storefront for luxury fashion, fragrance and jewellery: campaign-scale imagery, an overlay menu under a centred wordmark, frameless 2:3 cards and an unhurried, editorial purchase flow.",
    visualCategory: "Luxury fashion house",
    bestFor: ["Luxury & modest fashion", "Fragrance", "Jewellery & watches", "Leather goods"],
    design: {
      navigation: "overlay-menu",
      density: "airy",
      typography: {
        heading: "Bodoni Moda",
        body: "Inter Tight",
        arabic: { heading: "El Messiri", body: "Almarai" },
      },
      imageTreatment: "Campaign-scale, frameless photography under hairline rules",
      cardImageRatio: "2:3",
      cardStyle: "Frameless 2:3 image, uppercase name and quiet price; no quick add",
      cartPresentation: "drawer-and-page",
      motion: "subtle",
    },
    homepageSections: ["campaign-hero", "campaign-tiles", "the-edit", "house-note", "client-service"],
    capabilities: {
      rtlReady: true,
      uiLocales: ["en"],
      cartDrawer: true,
      productGallery: true,
      quickAddOnCards: false,
      categoryIndex: false,
    },
  },
  theme: {
    options: {
      palette: {
        label: "Palette",
        description: "Ink and ivory. Your accent colour appears only in small details such as sale prices.",
        choices: [
          { value: "ivoire", label: "Ivoire", description: "Ivory pages with ink type." },
          { value: "noir", label: "Noir", description: "Ink pages with ivory type." },
          { value: "sable", label: "Sable", description: "Warm sand with deep ink." },
        ],
        default: "ivoire",
      },
      hero: {
        label: "Homepage hero",
        description: "How the house opens.",
        choices: [
          { value: "campaign", label: "Campaign", description: "A full-screen photograph with the headline set small at its foot." },
          { value: "wordmark", label: "Wordmark", description: "An ink field with the store name set very large; no photograph." },
        ],
        default: "campaign",
      },
    },
    palettes: {
      ivoire: {
        label: "Ivoire",
        tokens: {
          background: "#f7f4ee",
          foreground: "#0d0c0b",
          muted: "#eeeae1",
          mutedForeground: "#5e5a53",
          border: "#d9d3c7",
          surface: "#f2eee6",
          surfaceElevated: "#fbf9f5",
          destructive: "#9e2a1c",
          success: "#355f3b",
          warning: "#7a5310",
          focus: "#0d0c0b",
        },
      },
      noir: {
        label: "Noir",
        tokens: {
          background: "#0c0b0a",
          foreground: "#f4efe6",
          muted: "#181614",
          mutedForeground: "#aaa398",
          border: "#34302b",
          surface: "#131210",
          surfaceElevated: "#1b1917",
          destructive: "#e58a78",
          success: "#94c49a",
          warning: "#d9ab5f",
          focus: "#f4efe6",
        },
      },
      sable: {
        label: "Sable",
        tokens: {
          background: "#ebe4d8",
          foreground: "#1a1612",
          muted: "#e1d8ca",
          mutedForeground: "#5a5147",
          border: "#c9bdab",
          surface: "#e4dccf",
          surfaceElevated: "#f3eee6",
          destructive: "#9e2a1c",
          success: "#355f3b",
          warning: "#74500f",
          focus: "#1a1612",
        },
      },
    },
    radius: { control: "0px", card: "0px" },
    // Shared pages (checkout, contact, policies) speak Maison's control
    // language: tracked uppercase labels and underlined fields.
    controls: {
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      fontWeight: "500",
      height: { md: "3rem", lg: "3.25rem" },
      borderWidth: "1px",
      inputStyle: "underline",
    },
    fallbackAccent: "#8a6a3f",
  },
} as const satisfies TemplateDefinition;

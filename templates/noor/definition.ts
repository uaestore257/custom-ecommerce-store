import type { TemplateDefinition } from "@/lib/templates/types";

// NOOR — an Arabic-first storefront for Gulf heritage and gifting: oud,
// perfume, bakhoor, dates, abayas, gifts and premium décor. The first
// template whose interface speaks Arabic (uiLocales ["en", "ar"], through
// the shared P6 dictionary): an Arabic store gets an Arabic interface, an
// English store an English one, both from the same components.
// Structurally its own system: a centred, symmetrical "stack" header
// (wordmark above a centred navigation row), an arcade hero of arched
// frames, the semicircular ARCH as the frame of every product and
// collection image, a single restrained geometric ornament as a divider,
// and a dedicated cart page. Pure data.

export const noorDefinition = {
  manifest: {
    key: "noor",
    name: "Noor",
    version: "1.0.0",
    description:
      "An Arabic-first storefront for Gulf heritage and gifting: a centred, symmetrical layout, arched frames for every product and collection, Arabic and English interfaces, and a calm, gift-ready purchase flow.",
    visualCategory: "Gulf heritage & gifting",
    bestFor: ["Oud, perfume & bakhoor", "Dates & confectionery", "Abayas & modest fashion", "Gifting & premium décor"],
    design: {
      navigation: "centered-stack",
      density: "airy",
      typography: {
        heading: "Marcellus",
        body: "IBM Plex Sans",
        arabic: { heading: "Reem Kufi", body: "IBM Plex Sans Arabic" },
      },
      imageTreatment: "Arched portrait frames with a fine double rule, on warm grounds",
      cardImageRatio: "3:4",
      cardStyle: "Arched 3:4 frame, centred name and price, add to cart beneath",
      cartPresentation: "page",
      motion: "subtle",
    },
    homepageSections: ["arcade-hero", "collections", "featured-pieces", "house-note", "discover-by-collection", "closing-call"],
    capabilities: {
      rtlReady: true,
      uiLocales: ["en", "ar"],
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
        description: "The ground the arches stand on. Your accent colour marks actions and prices.",
        choices: [
          { value: "ivory", label: "Ivory", description: "Warm ivory with deep ink." },
          { value: "sand", label: "Sand", description: "Muted desert sand." },
          { value: "layl", label: "Layl", description: "A deep night ground with warm light type." },
        ],
        default: "ivory",
      },
    },
    palettes: {
      ivory: {
        label: "Ivory",
        tokens: {
          background: "#f8f3ea",
          foreground: "#1c1813",
          muted: "#efe7d9",
          mutedForeground: "#5d5345",
          border: "#ddd1bc",
          surface: "#fbf8f1",
          surfaceElevated: "#fffdf9",
          destructive: "#a3301f",
          success: "#2f6b3f",
          warning: "#7f4f06",
          focus: "#1c1813",
        },
      },
      sand: {
        label: "Sand",
        tokens: {
          background: "#ece2d0",
          foreground: "#211b15",
          muted: "#e3d7c1",
          mutedForeground: "#574c3d",
          border: "#ccbb9e",
          surface: "#f3ebde",
          surfaceElevated: "#f8f2e8",
          destructive: "#9c2d1d",
          success: "#2f6b3f",
          warning: "#764a05",
          focus: "#211b15",
        },
      },
      layl: {
        label: "Layl",
        tokens: {
          background: "#121417",
          foreground: "#efe6d6",
          muted: "#1b1e22",
          mutedForeground: "#aaa192",
          border: "#363a40",
          surface: "#171a1e",
          surfaceElevated: "#1e2227",
          destructive: "#e8907c",
          success: "#8fc79c",
          warning: "#ddb066",
          focus: "#efe6d6",
        },
      },
    },
    // Arched geometry: 48px controls become full pills (1.5rem = half their
    // height) while taller fields such as textareas keep soft corners;
    // image frames are arched in the components.
    radius: { control: "1.5rem", card: "0px" },
    controls: { letterSpacing: "0.02em", fontWeight: "500", height: { md: "3rem", lg: "3.25rem" } },
    fallbackAccent: "#86552e",
  },
} as const satisfies TemplateDefinition;

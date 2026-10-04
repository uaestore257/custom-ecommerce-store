import type { TemplateDefinition } from "@/lib/templates/types";

// The platform's original storefront design, now running through the
// template engine. Every existing store starts here, so moving onto the
// engine changed nothing visually. Pure data: safe to import anywhere.

export const classicDefinition = {
  manifest: {
    key: "classic",
    name: "Classic",
    version: "1.0.0",
    description:
      "A clear, conversion-focused storefront: inline navigation, square product cards with quick add, and a straightforward cart page.",
    visualCategory: "General retail",
    bestFor: ["General stores", "Electronics", "Everyday goods", "Large catalogues"],
    design: {
      navigation: "inline-bar",
      density: "comfortable",
      typography: {
        heading: "Playfair Display",
        body: "Geist",
        arabic: { heading: "Noto Naskh Arabic", body: "Noto Sans Arabic" },
      },
      imageTreatment: "Contained square images on light cards",
      cardImageRatio: "1:1",
      cardStyle: "Bordered card with category, price, delivery note and quick add",
      cartPresentation: "page",
      motion: "subtle",
    },
    homepageSections: ["hero", "category-grid", "featured-products", "service-notes", "contact-callout"],
    capabilities: {
      rtlReady: true,
      uiLocales: ["en"],
      cartDrawer: false,
      productGallery: false,
      quickAddOnCards: true,
      categoryIndex: false,
    },
  },
  theme: {
    options: {
      palette: {
        label: "Palette",
        description: "Background and text colours. Buttons and links use the store's accent colour.",
        choices: [
          { value: "light", label: "Light", description: "White pages with slate text." },
          { value: "soft", label: "Soft grey", description: "A gentle grey page background." },
        ],
        default: "light",
      },
    },
    palettes: {
      light: {
        label: "Light",
        tokens: {
          background: "#ffffff",
          foreground: "#0f172a",
          muted: "#f8fafc",
          mutedForeground: "#475569",
          border: "#e2e8f0",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          destructive: "#dc2626",
          success: "#047857",
          warning: "#b45309",
          focus: "#0f172a",
        },
      },
      soft: {
        label: "Soft grey",
        tokens: {
          background: "#f4f5f7",
          foreground: "#111827",
          muted: "#e9ebef",
          mutedForeground: "#4b5563",
          border: "#d9dde3",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          destructive: "#dc2626",
          success: "#047857",
          warning: "#b45309",
          focus: "#111827",
        },
      },
    },
    radius: { control: "0.5rem", card: "1rem" },
    fallbackAccent: "#0f766e",
  },
} as const satisfies TemplateDefinition;

// ---------------------------------------------------------------
// TEMPLATE CONTRACT — DATA HALF (pure: no React, safe everywhere)
//
// A storefront template is APPLICATION CODE registered at compile time
// (lib/templates/registry.ts + templates/index.ts). The database only
// stores which template a store uses (Store.templateKey) and that
// template's enumerated option choices (Store.themeConfig). Nothing here
// is executable or renderable from stored data.
//
// Each template has two parts:
//   * TemplateDefinition (this file): manifest metadata for catalogues
//     and admin, plus the theme it accepts (option choices and the
//     colour/shape tokens each choice maps to).
//   * StorefrontTemplate (templates/types.ts): the React components.
// ---------------------------------------------------------------

/** Semantic storefront colour roles (see app/globals.css). Values are CSS colours. */
export interface TemplateColorTokens {
  background: string;
  foreground: string;
  /** Quiet surface, e.g. a band behind a section. */
  muted: string;
  /** Secondary text. */
  mutedForeground: string;
  border: string;
  /** Panels and cards that sit on the background. */
  surface: string;
  /** Raised panels: drawers, menus, sticky summaries. */
  surfaceElevated: string;
  destructive: string;
  success: string;
  warning: string;
  /** Focus ring colour. */
  focus: string;
}

export interface TemplatePalette {
  label: string;
  tokens: TemplateColorTokens;
}

export interface ThemeChoice {
  value: string;
  label: string;
  description?: string;
}

/** One configurable option. Stored values are always one of `choices`. */
export interface ThemeOptionDefinition {
  label: string;
  description: string;
  choices: readonly ThemeChoice[];
  default: string;
}

export interface TemplateTheme {
  /** Must include "palette"; its choices are the keys of `palettes`. */
  options: Record<string, ThemeOptionDefinition>;
  palettes: Record<string, TemplatePalette>;
  /** Corner radii as CSS lengths. */
  radius: { control: string; card: string };
  /** Used when the store has no valid accent colour of its own. */
  fallbackAccent: string;
}

/** Structural identity of a template; powers the catalogue and admin selector. */
export interface TemplateManifest {
  key: string;
  name: string;
  /** Semantic version of the template's presentation contract. */
  version: string;
  description: string;
  /** e.g. "Editorial furniture & interiors". */
  visualCategory: string;
  bestFor: readonly string[];
  design: {
    navigation: "inline-bar" | "editorial-split";
    density: "compact" | "comfortable" | "airy";
    typography: { heading: string; body: string };
    imageTreatment: string;
    /** Product image aspect ratio on cards, e.g. "1:1" or "4:5". */
    cardImageRatio: string;
    cardStyle: string;
    cartPresentation: "page" | "drawer-and-page";
    motion: "none" | "subtle";
  };
  /** Homepage sections, in order. */
  homepageSections: readonly string[];
  capabilities: {
    /** Layout uses logical properties and mirrors correctly under dir="rtl". */
    rtlReady: boolean;
    /** BCP 47 locales the template's own UI copy is written for. */
    uiLocales: readonly string[];
    cartDrawer: boolean;
    productGallery: boolean;
    quickAddOnCards: boolean;
    categoryIndex: boolean;
  };
}

export interface TemplateDefinition {
  manifest: TemplateManifest;
  theme: TemplateTheme;
}

/** A store's normalized option choices: every option key present, every value valid. */
export type ThemeSelection = Readonly<Record<string, string>>;

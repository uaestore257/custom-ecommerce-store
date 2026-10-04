import type {
  TemplateColorTokens,
  TemplateControlOverrides,
  TemplateControlTokens,
  TemplateDefinition,
  TemplateTheme,
  ThemeSelection,
} from "./types";

// ---------------------------------------------------------------
// THEME CONFIGURATION (pure)
//
// Store.themeConfig is untrusted JSON. It can only ever select among a
// template's enumerated choices; it never carries CSS, markup, URLs or
// component names. Two entry points:
//   * normalizeThemeConfig(): every READ. Unknown keys are dropped and
//     invalid values fall back to the option's default, so a stale or
//     tampered row still renders safely.
//   * validateThemeConfigInput(): every WRITE (admin). Strict: anything
//     that is not a known option with a valid choice is an error.
// The resulting CSS custom properties come only from constants in the
// template definition plus the store's validated #rrggbb accent colour.
// ---------------------------------------------------------------

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The original shared-control look (sfButtonClass / sfInputClass before
 * these became tokens). A template that declares no controls renders
 * exactly as it did.
 */
export const DEFAULT_CONTROL_TOKENS: Readonly<TemplateControlTokens> = Object.freeze({
  textTransform: "none",
  letterSpacing: "normal",
  fontWeight: "600",
  height: Object.freeze({ sm: "2.25rem", md: "2.75rem", lg: "3rem" }),
  borderWidth: "1px",
  inputStyle: "boxed",
});

/** A template's control tokens with defaults filled in. */
export function resolveControlTokens(controls: TemplateControlOverrides | undefined): TemplateControlTokens {
  return {
    ...DEFAULT_CONTROL_TOKENS,
    ...controls,
    height: { ...DEFAULT_CONTROL_TOKENS.height, ...controls?.height },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function isChoice(definition: TemplateDefinition, option: string, value: unknown): value is string {
  const spec = definition.theme.options[option];
  return Boolean(spec) && typeof value === "string" && spec.choices.some((choice) => choice.value === value);
}

/** The template's default choice for every option. */
export function defaultThemeSelection(definition: TemplateDefinition): ThemeSelection {
  return Object.freeze(
    Object.fromEntries(Object.entries(definition.theme.options).map(([key, spec]) => [key, spec.default])),
  );
}

/** A safe, complete selection from stored data (never throws). */
export function normalizeThemeConfig(definition: TemplateDefinition, raw: unknown): ThemeSelection {
  const source = isPlainObject(raw) ? raw : {};
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definition.theme.options).map(([key, spec]) => [
        key,
        Object.hasOwn(source, key) && isChoice(definition, key, source[key]) ? source[key] : spec.default,
      ]),
    ),
  );
}

export type ThemeConfigValidation =
  | { ok: true; value: ThemeSelection }
  | { ok: false; errors: Record<string, string> };

/** Strict validation of an admin-submitted selection. Missing options take their default. */
export function validateThemeConfigInput(definition: TemplateDefinition, raw: unknown): ThemeConfigValidation {
  if (raw === undefined || raw === null) return { ok: true, value: defaultThemeSelection(definition) };
  if (!isPlainObject(raw)) return { ok: false, errors: { theme: "Choose valid design options." } };
  const errors: Record<string, string> = {};
  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(definition.theme.options, key)) errors[key] = "This option is not available for this template.";
    else if (!isChoice(definition, key, raw[key])) errors[key] = `Choose a valid ${definition.theme.options[key].label.toLowerCase()}.`;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: normalizeThemeConfig(definition, raw) };
}

/** The store's accent if it is a valid #rrggbb colour, else the template's fallback. */
export function resolveAccentColor(definition: TemplateDefinition, accentColor: unknown): string {
  return typeof accentColor === "string" && HEX_COLOR.test(accentColor) ? accentColor.toLowerCase() : definition.theme.fallbackAccent;
}

/** Near-black or white, whichever reads better on the given #rrggbb background (WCAG relative luminance). */
export function readableForeground(hex: string): "#ffffff" | "#111111" {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / (0.0111 + 0.05);
  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#111111";
}

/**
 * CSS custom properties for a storefront root element. Keys and values are
 * built only from the template's constant tokens and a validated hex accent.
 */
export function themeCssVariables(
  definition: TemplateDefinition,
  selection: ThemeSelection,
  accentColor: unknown,
): Record<`--${string}`, string> {
  const palette =
    definition.theme.palettes[selection.palette] ??
    definition.theme.palettes[definition.theme.options.palette.default];
  return semanticCssVariables(
    palette.tokens,
    resolveAccentColor(definition, accentColor),
    definition.theme.radius,
    definition.theme.controls,
  );
}

/**
 * The semantic --sf-* roles for a set of constant colour tokens, a #rrggbb
 * accent, radii and control tokens. Used by storefront roots
 * (themeCssVariables) and by the platform business site, which renders its
 * own surfaces and template specimens through the same roles rather than a
 * second design system.
 */
export function semanticCssVariables(
  t: TemplateColorTokens,
  accent: string,
  radius: TemplateTheme["radius"],
  controlTokens?: TemplateControlOverrides,
): Record<`--${string}`, string> {
  const controls = resolveControlTokens(controlTokens);
  const underline = controls.inputStyle === "underline";
  return {
    "--sf-background": t.background,
    "--sf-foreground": t.foreground,
    "--sf-muted": t.muted,
    "--sf-muted-foreground": t.mutedForeground,
    "--sf-border": t.border,
    "--sf-surface": t.surface,
    "--sf-surface-elevated": t.surfaceElevated,
    "--sf-accent": accent,
    "--sf-accent-foreground": readableForeground(accent),
    "--sf-destructive": t.destructive,
    "--sf-success": t.success,
    "--sf-warning": t.warning,
    "--sf-focus": t.focus,
    "--sf-radius-control": radius.control,
    "--sf-radius-card": radius.card,
    // Shared controls (components/storefront/primitives.tsx). Input values
    // are resolved here so the style is a set of plain constants.
    "--sf-control-text-transform": controls.textTransform,
    "--sf-control-letter-spacing": controls.letterSpacing,
    "--sf-control-font-weight": controls.fontWeight,
    "--sf-control-height-sm": controls.height.sm,
    "--sf-control-height-md": controls.height.md,
    "--sf-control-height-lg": controls.height.lg,
    "--sf-control-border-width": controls.borderWidth,
    "--sf-input-border-width": underline ? `0 0 ${controls.borderWidth}` : controls.borderWidth,
    "--sf-input-radius": underline ? "0" : radius.control,
    "--sf-input-background": underline ? "transparent" : t.surface,
    "--sf-input-padding-x": underline ? "0" : "0.75rem",
    // Legacy accent variable still read by a few shared components.
    "--brand": accent,
  };
}

import type { ComponentType, CSSProperties, ReactNode } from "react";
import { getTemplateDefinition, type TemplateKey } from "@/lib/templates/registry";
import { semanticCssVariables } from "@/lib/templates/theme";
import { atelierFonts } from "@/templates/atelier/fonts";
import { classicFonts } from "@/templates/classic/fonts";
import { kineticFonts } from "@/templates/kinetic/fonts";
import { maisonFonts } from "@/templates/maison/fonts";
import { marketFonts } from "@/templates/market/fonts";
import { noorFonts } from "@/templates/noor/fonts";
import type { TemplateFonts } from "@/templates/types";
import { AtelierSpecimen } from "./AtelierSpecimen";
import { CATALOGUE_AR, CATALOGUE_EN } from "./catalogue";
import { ClassicSpecimen } from "./ClassicSpecimen";
import { KineticSpecimen } from "./KineticSpecimen";
import { MaisonSpecimen } from "./MaisonSpecimen";
import { MarketSpecimen } from "./MarketSpecimen";
import { NoorSpecimen } from "./NoorSpecimen";
import { SPECIMEN_VIEW_LABELS, type SpecimenView, type SpecimenViewProps } from "./types";

// ---------------------------------------------------------------
// TEMPLATE SPECIMENS — miniature, non-interactive renderings of a
// storefront template for the public business site. They are NOT a
// second storefront: no data loading, no cart, no links. What makes them
// faithful is that they are painted by the real template system — the
// template's own palette tokens, radii and fonts from its registered
// definition, applied through the same semantic --sf-* roles
// (semanticCssVariables) a live storefront uses. Change a template's
// palette and its specimen changes with it.
//
// Record<TemplateKey, …> keeps specimens in step with the registry.
// ---------------------------------------------------------------

const SPECIMENS: Readonly<Record<TemplateKey, Record<SpecimenView, ComponentType<SpecimenViewProps>>>> = {
  classic: ClassicSpecimen,
  atelier: AtelierSpecimen,
  kinetic: KineticSpecimen,
  maison: MaisonSpecimen,
  market: MarketSpecimen,
  noor: NoorSpecimen,
};

const FONTS: Readonly<Record<TemplateKey, TemplateFonts>> = {
  classic: classicFonts,
  atelier: atelierFonts,
  kinetic: kineticFonts,
  maison: maisonFonts,
  market: marketFonts,
  noor: noorFonts,
};

/** A template's own font stacks (for setting its name in its own typeface). */
export function templateFonts(template: TemplateKey): TemplateFonts {
  return FONTS[template];
}

export type SpecimenDirection = "ltr" | "rtl";

export interface SpecimenSettings {
  template: TemplateKey;
  /** A palette key of that template; anything else uses the template's default. */
  palette?: string;
  view?: SpecimenView;
  direction?: SpecimenDirection;
}

function resolvePalette(template: TemplateKey, palette: string | undefined) {
  const { theme } = getTemplateDefinition(template);
  const key = palette && Object.hasOwn(theme.palettes, palette) ? palette : theme.options.palette.default;
  return { key, palette: theme.palettes[key] };
}

/** A sentence describing a specimen, for its accessible name. */
export function describeSpecimen({ template, palette, view = "home", direction = "ltr" }: SpecimenSettings): string {
  const { manifest } = getTemplateDefinition(template);
  const resolved = resolvePalette(template, palette).palette;
  const script = direction === "rtl" ? ", laid out right-to-left with Arabic store content" : "";
  return `${manifest.name} template, ${resolved.label} palette: ${SPECIMEN_VIEW_LABELS[view].toLowerCase()}${script}.`;
}

/**
 * The themed "screen": a container-query box painted with the template's
 * tokens. Crops to its frame like a viewport unless `scrollable`.
 */
export function SpecimenScreen({
  template,
  palette,
  view = "home",
  direction = "ltr",
  className = "",
}: SpecimenSettings & { className?: string }) {
  const definition = getTemplateDefinition(template);
  const resolved = resolvePalette(template, palette).palette;
  const fonts = FONTS[template];
  const style = {
    ...semanticCssVariables(resolved.tokens, definition.theme.fallbackAccent, definition.theme.radius, definition.theme.controls),
    "--sf-font-heading": fonts.heading,
    "--sf-font-body": fonts.body,
  } as CSSProperties;
  const View = SPECIMENS[template][view];
  return (
    <div
      data-template={template}
      dir={direction}
      lang={direction === "rtl" ? "ar" : "en"}
      style={style}
      className={`@container bg-background font-body text-foreground antialiased ${className}`}
    >
      <div className="text-[9px] leading-normal @lg:text-[10px] @4xl:text-[11px]">
        <View catalogue={direction === "rtl" ? CATALOGUE_AR : CATALOGUE_EN} />
      </div>
    </div>
  );
}

/** Thin browser-like or phone-like chrome around a screen. Uses the surrounding (studio) tokens. */
export function SpecimenFrame({
  device,
  caption,
  children,
  className = "",
}: {
  device: "browser" | "phone";
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  if (device === "phone") {
    return (
      <div className={`overflow-hidden rounded-[1.75rem] border-[6px] border-foreground bg-foreground shadow-[0_24px_60px_-30px_rgb(0_0_0/0.45)] ${className}`}>
        <div className="aspect-[9/19] overflow-hidden rounded-[1.3rem]">{children}</div>
      </div>
    );
  }
  return (
    <div className={`border border-border bg-surface-elevated shadow-[0_30px_80px_-40px_rgb(0_0_0/0.35)] ${className}`}>
      <div className="flex h-7 items-center gap-3 border-b border-border px-3 font-mono text-[10px] text-muted-foreground" dir="ltr">
        <span className="h-1.5 w-1.5 shrink-0 bg-border" />
        <span className="truncate">{caption}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * A complete, static specimen: frame + screen, exposed to assistive
 * technology as one image with a descriptive name (its miniature text is
 * presentational). `aspect` crops the screen like a viewport.
 */
export function TemplateSpecimen({
  device = "browser",
  caption,
  aspect = "aspect-[16/10]",
  className = "",
  ...settings
}: SpecimenSettings & { device?: "browser" | "phone"; caption?: string; aspect?: string; className?: string }) {
  const label = describeSpecimen(settings);
  return (
    <div role="img" aria-label={label} className={className}>
      <SpecimenFrame device={device} caption={caption}>
        <SpecimenScreen {...settings} className={`${device === "phone" ? "h-full" : aspect} overflow-hidden`} />
      </SpecimenFrame>
    </div>
  );
}

export { resolvePalette as resolveSpecimenPalette };

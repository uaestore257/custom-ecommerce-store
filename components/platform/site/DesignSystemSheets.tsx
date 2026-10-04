import { getTemplateDefinition, TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import type { TemplateColorTokens } from "@/lib/templates/types";
import { templateFonts } from "./specimens/TemplateSpecimen";

// "Designed as systems": one specification sheet per template, rendered
// from its registered definition — the type pairing set in the template's
// own fonts, every palette's colour roles, its corner radii and its
// product-image ratio. Nothing here is a screenshot or a hand-typed value.

const ROLES: { key: keyof TemplateColorTokens; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "muted", label: "Muted" },
  { key: "border", label: "Border" },
  { key: "mutedForeground", label: "Secondary text" },
  { key: "foreground", label: "Text" },
];

const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground rtl:tracking-normal";

function Sheet({ template }: { template: TemplateKey }) {
  const { manifest, theme } = getTemplateDefinition(template);
  const fonts = templateFonts(template);
  const [w, h] = manifest.design.cardImageRatio.split(":").map(Number);

  return (
    <section aria-labelledby={`${template}-system`} className="studio-reveal border border-border bg-surface-elevated">
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <h3 id={`${template}-system`} className="text-3xl leading-none" style={{ fontFamily: fonts.heading }}>
          {manifest.name}
        </h3>
        <p className={label}>Specification</p>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-[1.35fr_1fr]">
        <div className="bg-surface-elevated p-5 sm:p-6">
          <p className={label}>Type</p>
          <p className="mt-4 text-7xl leading-none sm:text-8xl" style={{ fontFamily: fonts.heading }} aria-hidden>
            Aa
          </p>
          <p className="mt-4 text-sm">
            <span style={{ fontFamily: fonts.heading }} className="text-lg">
              {manifest.design.typography.heading}
            </span>
            <span className="text-muted-foreground"> for headlines</span>
          </p>
          <p className="mt-1 text-sm" style={{ fontFamily: fonts.body }}>
            {manifest.design.typography.body}
            <span className="text-muted-foreground"> for everything you read</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-surface-elevated p-5 sm:p-6">
            <p className={label}>Corners</p>
            <div className="mt-5 flex items-end gap-3" aria-hidden>
              <span className="block h-10 w-10 border border-foreground" style={{ borderRadius: theme.radius.control }} />
              <span className="block h-14 w-14 border border-foreground" style={{ borderRadius: theme.radius.card }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {theme.radius.card === "0px" ? "Square, architectural" : `Controls ${theme.radius.control}, cards ${theme.radius.card}`}
            </p>
          </div>
          <div className="bg-surface-elevated p-5 sm:p-6">
            <p className={label}>Imagery</p>
            <div className="mt-5 flex h-14 items-end" aria-hidden>
              <span className="block h-full bg-muted ring-1 ring-foreground" style={{ aspectRatio: `${w} / ${h}` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{manifest.design.cardImageRatio} product images</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-5 sm:p-6">
        <p className={label}>Palettes</p>
        <ul className="mt-4 space-y-4">
          {Object.entries(theme.palettes).map(([key, palette]) => (
            <li key={key} className="grid grid-cols-[6.5rem_1fr] items-center gap-4">
              <span className="text-sm">{palette.label}</span>
              <span className="flex h-9 overflow-hidden ring-1 ring-border" role="img" aria-label={`${palette.label} palette: ${ROLES.map((role) => `${role.label.toLowerCase()} ${palette.tokens[role.key]}`).join(", ")}`}>
                {ROLES.map((role) => (
                  <span key={role.key} className="flex-1" style={{ backgroundColor: palette.tokens[role.key] }} title={`${role.label} ${palette.tokens[role.key]}`} />
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Plus the store&apos;s own accent colour — buttons pick white or near-black text automatically for contrast.
        </p>
      </div>
    </section>
  );
}

export function DesignSystemSheets() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {TEMPLATE_KEYS.map((key) => (
        <Sheet key={key} template={key} />
      ))}
    </div>
  );
}

import { getTemplateDefinition, TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import { templateFonts } from "../specimens/TemplateSpecimen";

/**
 * The platform as a section drawing: stores on top (what each client
 * owns), the template layer (presentation), and the shared commerce core.
 */
export function PlatformDiagram() {
  const stores: { label: string; template: TemplateKey; palette: string }[] = [
    { label: "Furniture house", template: "atelier", palette: "linen" },
    { label: "Fashion label", template: "classic", palette: "light" },
    { label: "Lighting studio", template: "atelier", palette: "charcoal" },
  ];
  const core = ["Catalogue", "Pricing", "Cart", "Checkout", "Orders", "Customers", "Payments", "Domains", "Team access", "Search & SEO"];
  const layer = "grid gap-4 border-t border-border py-6 md:grid-cols-12 md:gap-8";
  const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground rtl:tracking-normal";

  return (
    <figure aria-labelledby="platform-diagram-caption" className="border-b border-border">
      <div className={layer}>
        <div className="md:col-span-3">
          <p className={label}>Layer 1 · Stores</p>
          <p className="mt-2 text-sm text-muted-foreground">Each client&apos;s own: domain, brand, catalogue, customers and orders. Examples shown.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3 md:col-span-9">
          {stores.map((store) => {
            const definition = getTemplateDefinition(store.template);
            const tokens = definition.theme.palettes[store.palette].tokens;
            return (
              <li key={store.label} className="flex items-center gap-3 border border-border bg-surface-elevated p-3">
                <span aria-hidden className="h-10 w-8 shrink-0 border" style={{ backgroundColor: tokens.background, borderColor: tokens.border }}>
                  <span className="mx-auto mt-2 block h-px w-4" style={{ backgroundColor: tokens.foreground }} />
                  <span className="mx-auto mt-1 block h-px w-3" style={{ backgroundColor: tokens.foreground, opacity: 0.5 }} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{store.label}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {definition.manifest.name} · {definition.theme.palettes[store.palette].label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={layer}>
        <div className="md:col-span-3">
          <p className={label}>Layer 2 · Templates</p>
          <p className="mt-2 text-sm text-muted-foreground">Presentation only: layout, typography, imagery, palette.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 md:col-span-9">
          {TEMPLATE_KEYS.map((key) => {
            const { manifest } = getTemplateDefinition(key);
            return (
              <li key={key} className="flex items-baseline justify-between gap-4 border border-dashed border-foreground/40 p-4">
                <span className="text-3xl leading-none" style={{ fontFamily: templateFonts(key).heading }}>
                  {manifest.name}
                </span>
                <span className="text-end text-xs text-muted-foreground">{manifest.visualCategory}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={layer}>
        <div className="md:col-span-3">
          <p className={label}>Layer 3 · Commerce core</p>
          <p className="mt-2 text-sm text-muted-foreground">Shared, tested and maintained once — isolated per store.</p>
        </div>
        <ul className="grid grid-cols-2 gap-px bg-border p-px sm:grid-cols-5 md:col-span-9">
          {core.map((module) => (
            <li key={module} className="flex min-h-12 items-center bg-surface-elevated px-4 text-sm text-foreground">
              {module}
            </li>
          ))}
        </ul>
      </div>
      <figcaption id="platform-diagram-caption" className="sr-only">
        The platform in three layers: client stores on top, each choosing a template and palette; the storefront templates in
        the middle; and one shared commerce core underneath that keeps every store&apos;s data separate.
      </figcaption>
    </figure>
  );
}

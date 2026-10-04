import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { TemplateShowcaseEntry } from "@/lib/platform/showcase";
import { getTemplateDefinition, TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import { ArrowLink, ButtonLink, CONTAINER, Eyebrow, ExternalButtonLink } from "./primitives";
import { templateFonts, TemplateSpecimen, type SpecimenSettings } from "./specimens/TemplateSpecimen";

// Editorial sections shared by the business site's pages. Server
// components only; all content comes from the template registry and the
// showcase entries (lib/platform/showcase.ts).

/** A large desktop specimen with a phone specimen set over its inline-end corner, plus figure captions. */
export function SpecimenComposition({
  desktop,
  phone,
  captions,
  className = "",
}: {
  desktop: SpecimenSettings;
  phone: SpecimenSettings;
  captions: [string, string];
  className?: string;
}) {
  return (
    <figure className={className}>
      {/* Phones show the phone specimen alone: a desktop frame shrunk to 350px says nothing. */}
      <div className="relative sm:pb-14 sm:pe-10">
        <TemplateSpecimen {...desktop} caption={captionFor(desktop)} className="hidden sm:block" />
        <TemplateSpecimen
          {...phone}
          device="phone"
          className="mx-auto w-[68%] max-w-[16rem] sm:absolute sm:bottom-0 sm:end-0 sm:w-[28%] sm:max-w-[13.5rem]"
        />
      </div>
      <figcaption className="mt-5 grid gap-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground sm:grid-cols-2 sm:gap-6">
        <span className="hidden sm:inline">
          <span className="text-accent">Fig. 1</span> — {captions[0]}
        </span>
        <span>
          <span className="text-accent">
            Fig. <span className="hidden sm:inline">2</span>
            <span className="sm:hidden">1</span>
          </span>{" "}
          — {captions[1]}
        </span>
      </figcaption>
    </figure>
  );
}

function captionFor({ template, palette }: SpecimenSettings) {
  const definition = getTemplateDefinition(template);
  const label = definition.theme.palettes[palette ?? definition.theme.options.palette.default]?.label;
  return `${definition.manifest.name.toLowerCase()} · ${label?.toLowerCase() ?? ""}`;
}

/** Palette keys of a template, in definition order. */
function paletteKeys(template: TemplateKey) {
  return Object.keys(getTemplateDefinition(template).theme.palettes);
}

/** One template presented as a product: name in its own typeface, character, signatures, facts and demo links. */
export function TemplateFeature({
  entry,
  index,
  reverse = false,
  headingLevel = "h3",
  showDemoPages = false,
}: {
  entry: TemplateShowcaseEntry;
  index: number;
  reverse?: boolean;
  headingLevel?: "h2" | "h3";
  showDemoPages?: boolean;
}) {
  const { key, manifest, editorial, demo } = entry;
  const Heading = headingLevel;
  const palettes = paletteKeys(key);
  const fonts = templateFonts(key);
  const facts: [string, string][] = [
    ["Typography", `${manifest.design.typography.heading} / ${manifest.design.typography.body}`],
    ["Imagery", `${manifest.design.cardImageRatio} · ${manifest.design.imageTreatment}`],
    ["Navigation", manifest.design.navigation === "editorial-split" ? "Editorial split" : "Inline bar"],
    ["Cart", manifest.design.cartPresentation === "page" ? "Dedicated cart page" : "Drawer and cart page"],
    ["Palettes", palettes.map((palette) => getTemplateDefinition(key).theme.palettes[palette].label).join(", ")],
  ];

  return (
    <article id={key} aria-labelledby={`${key}-name`} className="scroll-mt-24 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className={`studio-reveal lg:col-span-7 ${reverse ? "lg:order-2" : ""}`}>
        <SpecimenComposition
          desktop={{ template: key, palette: palettes[0], view: "home" }}
          phone={{ template: key, palette: palettes[1 % palettes.length], view: "cart" }}
          captions={[
            `${manifest.name} homepage, ${getTemplateDefinition(key).theme.palettes[palettes[0]].label} palette.`,
            `${manifest.design.cartPresentation === "page" ? "The cart page" : "The cart drawer"} in ${getTemplateDefinition(key).theme.palettes[palettes[1 % palettes.length]].label}, on a phone.`,
          ]}
        />
      </div>

      <div className={`lg:col-span-5 ${reverse ? "lg:order-1" : ""}`}>
        <Eyebrow index={String(index).padStart(2, "0")}>
          {manifest.visualCategory} · v{manifest.version}
        </Eyebrow>
        <Heading id={`${key}-name`} className="mt-5 text-6xl leading-none tracking-tight sm:text-7xl rtl:tracking-normal" style={{ fontFamily: fonts.heading }}>
          {manifest.name}
        </Heading>
        <p className="mt-5 font-heading text-2xl italic leading-snug sm:text-3xl">{editorial.personality}</p>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">{editorial.idealFor}</p>

        <ol className="mt-8 border-t border-border">
          {editorial.signatures.map((signature, position) => (
            <li key={signature.title} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-border py-4">
              <span className="pt-0.5 font-mono text-[11px] text-accent">{String.fromCharCode(65 + position)}</span>
              <div>
                <p className="text-sm font-medium">{signature.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{signature.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground rtl:tracking-normal">{label}</dt>
              <dd className="mt-1 first-letter:uppercase">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          {demo ? (
            <ExternalButtonLink href={demo.home}>Open the live demo</ExternalButtonLink>
          ) : (
            <ButtonLink href="/contact">Ask for a walkthrough</ButtonLink>
          )}
          {!showDemoPages && <ArrowLink href={`/portfolio#${key}`}>Template details</ArrowLink>}
        </div>

        {showDemoPages && demo && <DemoPages demo={demo} />}
      </div>
    </article>
  );
}

/** Direct entry points into a live demo store's real pages. */
function DemoPages({ demo }: { demo: NonNullable<TemplateShowcaseEntry["demo"]> }) {
  const pages = [
    ["Storefront", demo.home],
    ["Full listing", demo.listing],
    ["A product page", demo.product],
    ["Cart", demo.cart],
  ].filter((page): page is [string, string] => Boolean(page[1]));
  if (pages.length < 2) return null;
  return (
    <div className="mt-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground rtl:tracking-normal">
        Inside the live demo · {demo.storeName}
      </p>
      <ul className="mt-3 border-t border-border">
        {pages.map(([label, href]) => (
          <li key={label} className="border-b border-border">
            <a
              href={href}
              target="_blank"
              rel="noopener"
              className="group flex min-h-12 items-center justify-between gap-4 text-sm transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {label}
              <span className="sr-only"> (opens in a new tab)</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
            <li key={module} className="flex min-h-12 items-center bg-foreground px-4 text-sm text-background">
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

const PROCESS: { title: string; text: string }[] = [
  {
    title: "Conversation",
    text: "We learn what you sell, who buys it and where you deliver — and show you the templates working on a live demonstration store.",
  },
  {
    title: "Template and identity",
    text: "You choose the template that fits your products. We set your palette, accent colour, logo, homepage composition and store content.",
  },
  {
    title: "Catalogue and setup",
    text: "Products, collections, prices, delivery options, payment methods, policies and your team's access — configured in your own store admin.",
  },
  {
    title: "Launch",
    text: "Your store goes live on its own address or a verified custom domain, with search-ready pages from the first day.",
  },
];

/** How a store comes together, as four numbered steps. */
export function ProcessSteps() {
  return (
    <ol className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
      {PROCESS.map((step, index) => (
        <li key={step.title} className="studio-reveal border-b border-border py-8 sm:pe-8 lg:border-b-0 lg:border-e lg:px-6 lg:first:ps-0 lg:last:border-e-0">
          <p className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</p>
          <h3 className="mt-4 font-heading text-3xl leading-tight">{step.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** The closing call to action every page ends with. */
export function ClosingCta({ title, text, children }: { title: ReactNode; text: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="closing-cta" className="border-t border-border">
      <div className={`${CONTAINER} grid gap-10 py-24 lg:grid-cols-12 lg:py-32`}>
        <h2 id="closing-cta" className="text-balance font-heading text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:col-span-8 lg:text-7xl rtl:tracking-normal">
          {title}
        </h2>
        <div className="self-end lg:col-span-4">
          <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {children ?? (
              <>
                <ButtonLink href="/contact">Start a project</ButtonLink>
                <ButtonLink href="/portfolio" variant="outline">
                  See the templates
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

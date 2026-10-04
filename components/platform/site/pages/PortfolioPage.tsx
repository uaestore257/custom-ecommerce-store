import { numberWord, type TemplateShowcaseEntry } from "@/lib/platform/showcase";
import { getTemplateShowcase } from "@/lib/server/platform/showcase";
import { getTemplateDefinition, type TemplateKey } from "@/lib/templates/registry";
import type { TemplateManifest } from "@/lib/templates/types";
import { CONTAINER, Eyebrow, SectionHeading, StudioMain, textLink } from "../primitives";
import { ClosingCta, TemplateFeature } from "../sections";
import { TemplateSpecimen } from "../specimens/TemplateSpecimen";
import { SPECIMEN_VIEW_LABELS, SPECIMEN_VIEWS } from "../specimens/types";
import { TemplateExplorer } from "../TemplateExplorer";

const yesNo = (value: boolean) => (value ? "Yes" : "—");

/** Rows of the comparison table, read from each template's manifest and theme. */
const COMPARISON: { label: string; value: (manifest: TemplateManifest, key: TemplateKey) => string }[] = [
  { label: "Character", value: (m) => m.visualCategory },
  { label: "Best for", value: (m) => m.bestFor.join(", ") },
  { label: "Navigation", value: (m) => (m.design.navigation === "editorial-split" ? "Editorial split" : "Inline bar") },
  { label: "Density", value: (m) => m.design.density },
  { label: "Typography", value: (m) => `${m.design.typography.heading} / ${m.design.typography.body}` },
  { label: "Imagery", value: (m) => m.design.imageTreatment },
  { label: "Product cards", value: (m) => `${m.design.cardImageRatio} · ${m.design.cardStyle}` },
  { label: "Cart", value: (m) => (m.design.cartPresentation === "page" ? "Cart page" : "Drawer and cart page") },
  { label: "Quick add on cards", value: (m) => yesNo(m.capabilities.quickAddOnCards) },
  { label: "Product gallery", value: (m) => yesNo(m.capabilities.productGallery) },
  { label: "Collection index", value: (m) => yesNo(m.capabilities.categoryIndex) },
  {
    label: "Palettes",
    value: (_, key) => Object.values(getTemplateDefinition(key).theme.palettes).map((palette) => palette.label).join(", "),
  },
  { label: "Right-to-left layout", value: (m) => yesNo(m.capabilities.rtlReady) },
];

/** /portfolio: the templates in depth, explorable, comparable and linked to their live demo stores. */
export async function PortfolioPage() {
  const showcase = await getTemplateShowcase();
  const demoUrls = Object.fromEntries(showcase.filter((entry) => entry.demo).map((entry) => [entry.key, entry.demo!.home])) as Partial<
    Record<TemplateKey, string>
  >;
  const anyDemo = showcase.some((entry) => entry.demo);

  return (
    <StudioMain>
      <section aria-labelledby="portfolio-title">
        <div className={`${CONTAINER} grid gap-10 pb-16 pt-14 lg:grid-cols-12 lg:pb-20 lg:pt-20`}>
          <div className="lg:col-span-8">
            <Eyebrow>Portfolio</Eyebrow>
            <h1 id="portfolio-title" className="mt-6 text-balance font-heading text-6xl leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl rtl:tracking-normal">
              The templates.
            </h1>
          </div>
          <div className="self-end lg:col-span-4">
            <p className="text-base leading-relaxed text-muted-foreground">
              {numberWord(showcase.length)} complete storefronts running on the platform today. Compare them page by page below
              {anyDemo ? ", then open a live demonstration store and shop it end to end — listing, product, cart and checkout." : "."}
            </p>
            <nav aria-label="Templates on this page" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {showcase.map((entry) => (
                <a key={entry.key} href={`#${entry.key}`} className={textLink}>
                  {entry.manifest.name}
                </a>
              ))}
              <a href="#compare" className={textLink}>
                Compare
              </a>
            </nav>
          </div>
        </div>
      </section>

      <section aria-labelledby="explore-title" className="border-t border-border bg-surface">
        <div className={`${CONTAINER} py-20 lg:py-28`}>
          <SectionHeading
            index="01"
            eyebrow="Explore"
            id="explore-title"
            title="Every page, palette and direction."
            lede="Switch template, page, palette, width and writing direction. Each specimen is painted by the template's own design tokens — scroll inside it to see the whole page."
          />
          <div className="mt-14">
            <TemplateExplorer initialTemplate={showcase[0]?.key} demoUrls={demoUrls} />
          </div>
        </div>
      </section>

      {showcase.map((entry, position) => (
        <TemplateSection key={entry.key} entry={entry} index={position + 2} />
      ))}

      <section id="compare" aria-labelledby="compare-title" className="scroll-mt-20 border-t border-border">
        <div className={`${CONTAINER} py-20 lg:py-28`}>
          <SectionHeading index={String(showcase.length + 2).padStart(2, "0")} eyebrow="Compare" id="compare-title" title="Side by side." />
          <div className="mt-12 overflow-x-auto" role="region" aria-labelledby="compare-title" tabIndex={0}>
            <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
              <caption className="sr-only">Storefront templates compared</caption>
              <thead>
                <tr className="border-b border-foreground">
                  <th scope="col" className="w-1/4 py-4 pe-6 text-start font-mono text-[11px] font-normal uppercase tracking-[0.16em] text-muted-foreground rtl:tracking-normal">
                    Template
                  </th>
                  {showcase.map((entry) => (
                    <th key={entry.key} scope="col" className="py-4 pe-6 text-start font-heading text-3xl font-normal">
                      {entry.manifest.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-border align-top">
                    <th scope="row" className="py-4 pe-6 text-start font-normal text-muted-foreground">
                      {row.label}
                    </th>
                    {showcase.map((entry) => (
                      <td key={entry.key} className="py-4 pe-6 first-letter:uppercase">
                        {row.value(entry.manifest, entry.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Both templates share the same checkout, contact and policy pages, the same catalogue and order handling, and the same
            search foundations. Switching a store&apos;s template changes its presentation only — never its products, customers
            or orders.
          </p>
        </div>
      </section>

      <ClosingCta
        title="Seen the one that fits?"
        text="Tell us which template speaks to your products. We'll set it up with your palette, content and catalogue — on your own domain."
      />
    </StudioMain>
  );
}

function TemplateSection({ entry, index }: { entry: TemplateShowcaseEntry; index: number }) {
  const definition = getTemplateDefinition(entry.key);
  const palette = Object.keys(definition.theme.palettes)[0];
  return (
    <section aria-label={`${entry.manifest.name} template`} className="border-t border-border">
      <div className={`${CONTAINER} py-20 lg:py-28`}>
        <TemplateFeature entry={entry} index={index} headingLevel="h2" showDemoPages />
        <div className="mt-20">
          <Eyebrow>{entry.manifest.name} · page by page</Eyebrow>
          <ul className="mt-6 grid gap-8 md:grid-cols-3">
            {SPECIMEN_VIEWS.map((view) => (
              <li key={view} className="studio-reveal">
                <TemplateSpecimen template={entry.key} palette={palette} view={view} aspect="aspect-[4/5]" caption={`${entry.manifest.name.toLowerCase()} · ${SPECIMEN_VIEW_LABELS[view].toLowerCase()}`} />
                <p className="mt-3 text-sm">{SPECIMEN_VIEW_LABELS[view]}</p>
              </li>
            ))}
          </ul>
          {entry.demo === null && (
            <p className="mt-8 text-sm text-muted-foreground">A live demonstration store for this template is available on request.</p>
          )}
        </div>
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";
import { getTemplateShowcase } from "@/lib/server/platform/showcase";
import { getTemplateDefinition, type TemplateKey } from "@/lib/templates/registry";
import type { TemplateManifest } from "@/lib/templates/types";
import { cartLabel, navigationLabel } from "@/lib/templates/vocabulary";
import { ClosingCta } from "../ClosingCta";
import { DesignSystemSheets } from "../DesignSystemSheets";
import { PlatformDiagram } from "../platform/PlatformDiagram";
import { CONTAINER, Eyebrow, SectionHeading, SplitWords, StudioMain, Tone } from "../primitives";
import { TemplateSpecimen } from "../specimens/TemplateSpecimen";
import { TemplateExplorer } from "../TemplateExplorer";

const PRINCIPLES: [string, string][] = [
  ["Isolated by design", "Each store's products, customers and orders are scoped to that store on the server and in the database. One store can never read another's data."],
  ["Rendered on the server", "Pages arrive complete — quick on mobile networks, and readable by search engines from the very first request."],
  ["Improved once, for everyone", "Fixes and refinements to the core ship to every store together. Each store's design stays its own."],
];

const ENGINEERING: [string, string][] = [
  ["Store isolation", "Each request's store is resolved on the server from its address — never from anything a browser sends — and every read is scoped to it."],
  ["A checkout that re-checks", "Prices, stock and delivery are recalculated on the server when an order is placed. Stock is decremented atomically, and a repeated submission places the order once."],
  ["Search foundations", "Readable product and collection URLs, canonical links, per-store sitemaps and robots rules, and structured data for products."],
  ["Your own domain", "Every store runs on its own subdomain, or on your domain once it has been verified."],
  ["Roles and access", "Store owners and their teams sign in to their own store admin with role-based permissions; platform administration is separate."],
  ["Tested before it ships", "Automated test suites cover pricing, checkout, permissions and store isolation, against a real database."],
];

const yesNo = (value: boolean) => (value ? "Yes" : "—");

/** Rows of the comparison table, read from each template's manifest and theme. */
const COMPARISON: { label: string; value: (manifest: TemplateManifest, key: TemplateKey) => string }[] = [
  { label: "Character", value: (m) => m.visualCategory },
  { label: "Best for", value: (m) => m.bestFor.join(", ") },
  { label: "Navigation", value: (m) => navigationLabel(m.design.navigation) },
  { label: "Typography", value: (m) => `${m.design.typography.heading} / ${m.design.typography.body}` },
  { label: "Product cards", value: (m) => `${m.design.cardImageRatio} · ${m.design.cardStyle}` },
  { label: "Cart", value: (m) => cartLabel(m.design.cartPresentation) },
  { label: "Quick add on cards", value: (m) => yesNo(m.capabilities.quickAddOnCards) },
  { label: "Product gallery", value: (m) => yesNo(m.capabilities.productGallery) },
  { label: "Collection index", value: (m) => yesNo(m.capabilities.categoryIndex) },
  { label: "Palettes", value: (_, key) => Object.values(getTemplateDefinition(key).theme.palettes).map((palette) => palette.label).join(", ") },
  { label: "Right-to-left layout", value: (m) => yesNo(m.capabilities.rtlReady) },
];

/** /platform: the engineering, for the people who want to know how it works. */
export async function PlatformPage() {
  const showcase = await getTemplateShowcase();
  const demoUrls = Object.fromEntries(showcase.flatMap((entry) => (entry.demo ? [[entry.key, entry.demo.home]] : []))) as Partial<Record<TemplateKey, string>>;

  return (
    <StudioMain>
      <section aria-labelledby="platform-title" className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:96px_96px] [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]" />
        <div className={`${CONTAINER} grid gap-10 pb-20 pt-36 lg:grid-cols-12 lg:pb-28 lg:pt-44`}>
          <div className="lg:col-span-8">
            <div className="studio-rise">
              <Eyebrow>Platform</Eyebrow>
            </div>
            <h1 id="platform-title" className="mt-7 font-heading text-[3.4rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl rtl:tracking-normal">
              <SplitWords text="The platform under every store." />
            </h1>
          </div>
          <p className="studio-rise self-end text-pretty text-lg leading-relaxed text-foreground/75 lg:col-span-4" style={{ "--delay": "300ms" } as CSSProperties}>
            A multi-store commerce platform we design, engineer and operate ourselves. It is why a store can look entirely its
            own and still launch with a checkout, security and search foundations that are already proven.
          </p>
        </div>
      </section>

      <section aria-labelledby="architecture-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            index="01"
            eyebrow="Architecture"
            id="architecture-title"
            title="Three layers, clearly separated."
            lede="What a client owns, how it is presented and the commerce engine underneath are kept apart on purpose. A store can change its look without touching its orders — and we can improve the engine without touching anyone's design."
          />
          <div data-reveal className="mt-16">
            <PlatformDiagram />
          </div>
          <dl className="mt-16 grid gap-10 md:grid-cols-3">
            {PRINCIPLES.map(([title, text]) => (
              <div key={title} data-reveal className="border-t border-accent/60 pt-5">
                <dt className="font-heading text-3xl">{title}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Tone tone="ink" aria-labelledby="engineering-title">
        <div className={`${CONTAINER} grid gap-14 py-24 lg:grid-cols-12 lg:py-32`}>
          <div className="lg:col-span-5">
            <SectionHeading index="02" eyebrow="Engineering" id="engineering-title" title="Built like infrastructure." />
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-7">
            {ENGINEERING.map(([title, text], position) => (
              <div key={title} data-reveal style={{ "--delay": `${(position % 2) * 100}ms` } as CSSProperties} className="studio-spotlight border-t border-border pt-5">
                <dt className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-accent">{String(position + 1).padStart(2, "0")}</span>
                  <span className="font-heading text-2xl">{title}</span>
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Tone>

      <Tone tone="paper" aria-labelledby="system-title">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            index="03"
            eyebrow="Templates & design system"
            id="system-title"
            title="Designed as systems, not skins."
            lede="Templates are defined by tokens — colour roles, typefaces, radii, image proportions — not one-off styles. Explore every page, palette and writing direction below; each specimen is painted by the template's own tokens."
          />
          <div className="mt-16">
            <TemplateExplorer initialTemplate={showcase[0]?.key} demoUrls={demoUrls} />
          </div>
          <div className="mt-20">
            <DesignSystemSheets />
          </div>
        </div>
      </Tone>

      <section aria-labelledby="rtl-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            index="04"
            eyebrow="Arabic & right-to-left"
            id="rtl-title"
            title="Arabic, laid out properly."
            lede="When a store's language is right-to-left the whole layout mirrors — navigation, grids, drawers, arrows — because templates are built with logical properties. Store content can be entirely Arabic; template interface labels are English today."
          />
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {(["ltr", "rtl"] as const).map((direction) => (
              <figure key={direction} data-reveal>
                <TemplateSpecimen template="atelier" palette="stone" view="home" direction={direction} caption={`atelier · stone · ${direction}`} />
                <figcaption className="mt-4 font-mono text-[11px] text-muted-foreground">
                  <span className="text-accent">{direction.toUpperCase()}</span> —{" "}
                  {direction === "ltr" ? "English store content." : "the same template with Arabic store content."}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="compare-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading index="05" eyebrow="Templates compared" id="compare-title" title="Side by side." />
          <div className="mt-12 overflow-x-auto" role="region" aria-labelledby="compare-title" tabIndex={0}>
            <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
              <caption className="sr-only">Storefront templates compared</caption>
              <thead>
                <tr className="border-b border-foreground/60">
                  <th scope="col" className="w-1/4 py-4 pe-6 text-start font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">
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
        </div>
      </section>

      <ClosingCta
        title={
          <>
            Serious foundations. <em className="text-accent">Your</em> design.
          </>
        }
        text="Bring us your brand and your catalogue. We'll put them on a platform that's already production-proven."
      />
    </StudioMain>
  );
}

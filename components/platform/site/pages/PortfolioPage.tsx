import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { TemplateShowcaseEntry } from "@/lib/platform/showcase";
import { getTemplateShowcase } from "@/lib/server/platform/showcase";
import { getWorkCategories } from "@/lib/server/platform/work";
import { cartDescription } from "@/lib/templates/vocabulary";
import { ClosingCta } from "../ClosingCta";
import { ArrowLink, CONTAINER, Eyebrow, SectionHeading, SplitWords, StudioMain } from "../primitives";
import { focusRing } from "../styles";
import { SHOWCASE_MEDIA } from "../work/showcase-media";
import { caseIdentity, WorkCase } from "../work/WorkCase";
import { WorkDemoBrowser } from "../work/WorkDemoBrowser";

/** /portfolio — "Work": the live demo stores first, the details after. */
export async function PortfolioPage() {
  const [showcase, categories] = await Promise.all([getTemplateShowcase(), getWorkCategories()]);

  return (
    <StudioMain>
      <section aria-labelledby="work-title" className="relative isolate overflow-hidden">
        <div aria-hidden className="studio-glow pointer-events-none absolute -top-[40%] start-[10%] -z-10 h-[60rem] w-[60rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_16%,transparent),transparent)]" />
        <div className={`${CONTAINER} pb-20 pt-36 lg:pb-28 lg:pt-44`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="studio-rise">
                <Eyebrow>Work</Eyebrow>
              </div>
              <h1 id="work-title" className="mt-7 font-heading text-6xl leading-[0.95] tracking-tight sm:text-8xl lg:text-[7.5rem] rtl:tracking-normal">
                <SplitWords text="Selected work." />
              </h1>
            </div>
            <p className="studio-rise self-end text-pretty text-lg leading-relaxed text-foreground/75 lg:col-span-4" style={{ "--delay": "300ms" } as CSSProperties}>
              Live ecommerce stores running on our platform — different industries, different design directions, the same
              production checkout underneath. Every one is open to explore.
            </p>
          </div>

          <ul className="studio-deck studio-rise mt-16 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3" style={{ "--delay": "450ms" } as CSSProperties}>
            {showcase.map((entry, index) => (
              <DeckItem key={entry.key} entry={entry} index={index + 1} />
            ))}
            <li className="studio-deck-item">
              <Link
                href="/contact"
                className={`studio-spotlight group flex h-full min-h-80 flex-col justify-between border border-dashed border-foreground/25 p-6 transition-colors duration-500 hover:border-accent ${focusRing}`}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal">
                  {String(showcase.length + 1).padStart(2, "0")} · Next
                </p>
                <p className="font-heading text-4xl leading-tight">
                  Your store, <em className="text-accent">next</em>.
                </p>
                <span className="inline-flex items-center gap-2 text-sm text-accent">
                  Start a project <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180" aria-hidden />
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="work-demos-title" id="live-demos" className="scroll-mt-28 border-t border-border">
          <div className={`${CONTAINER} py-24 lg:py-32`}>
            <SectionHeading
              id="work-demos-title"
              eyebrow="Live demo stores"
              title="Explore by category."
              lede="Choose an industry to see the demo stores we run for it, then open one live: browse, search, add to cart and walk through checkout."
            />
            <div data-reveal className="mt-14">
              <WorkDemoBrowser categories={categories} />
            </div>
          </div>
        </section>
      )}

      {showcase.map((entry, position) => (
        <section key={entry.key} aria-label={`${caseIdentity(entry).storeName} case`} className="border-t border-border">
          <div className={`${CONTAINER} py-24 lg:py-36`}>
            <WorkCase entry={entry} index={position + 1} reverse={position % 2 === 1} headingLevel="h2" priority={position === 0} />
            <CaseDetails entry={entry} />
          </div>
        </section>
      ))}

      <section aria-label="Under the hood" className="border-t border-border">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-6 py-14`}>
          <p className="max-w-2xl text-pretty text-lg text-foreground/80">
            Curious how one platform runs stores this different — with Arabic layouts, per-store domains and a shared, secure
            checkout?
          </p>
          <ArrowLink href="/platform">See the platform</ArrowLink>
        </div>
      </section>

      <ClosingCta
        title={
          <>
            Seen what you <em className="text-accent">want</em>?
          </>
        }
        text="Tell us about your products and customers. We'll design your store around them and launch it on your own domain."
      />
    </StudioMain>
  );
}

/** One live store in the opening deck: hovering it brings it forward while the others recede. */
function DeckItem({ entry, index }: { entry: TemplateShowcaseEntry; index: number }) {
  const { storeName } = caseIdentity(entry);
  return (
    <li className="studio-deck-item">
      <a href={`#${entry.key}`} className={`group block h-full border border-border bg-surface transition-colors duration-500 hover:border-accent/60 ${focusRing}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-white">
          <Image
            src={SHOWCASE_MEDIA[entry.key].tall}
            alt=""
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 48vw, 100vw"
            placeholder="blur"
            className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
        <div className="flex items-end justify-between gap-4 p-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal">
              {String(index).padStart(2, "0")} · {entry.editorial.industry}
            </p>
            <p className="mt-3 truncate font-heading text-3xl">{storeName}</p>
          </div>
          <ArrowRight className="mb-2 h-5 w-5 shrink-0 text-accent transition-transform duration-500 group-hover:translate-x-1 rtl:rotate-180" aria-hidden />
        </div>
      </a>
    </li>
  );
}

/** Case-study detail: the brief, what was built, and direct entry points into the live store's real pages. */
function CaseDetails({ entry }: { entry: TemplateShowcaseEntry }) {
  const { manifest, editorial, demo } = entry;
  const pages = demo
    ? ([
        ["Storefront", demo.home],
        ["Full collection", demo.listing],
        ["A product page", demo.product],
        ["Cart", demo.cart],
      ].filter((page): page is [string, string] => Boolean(page[1])))
    : [];
  const label = "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal";

  return (
    <div data-reveal className="mt-20 grid gap-10 border-t border-border pt-12 lg:mt-28 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className={label}>The brief</p>
        <p className="mt-4 text-base leading-relaxed text-foreground/80">{editorial.idealFor}</p>
      </div>
      <div className="lg:col-span-4">
        <p className={label}>What we built</p>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ["Design", editorial.personality],
            ["Typography", `${manifest.design.typography.heading} with ${manifest.design.typography.body}`],
            ["Imagery", `${manifest.design.cardImageRatio} · ${manifest.design.imageTreatment}`],
            ["Cart", cartDescription(manifest.design.cartPresentation)],
          ].map(([term, value]) => (
            <div key={term} className="grid grid-cols-[6.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="lg:col-span-4">
        <p className={label}>Explore it live</p>
        {pages.length > 0 ? (
          <ul className="mt-4 border-t border-border">
            {pages.map(([name, href]) => (
              <li key={name} className="border-b border-border">
                <a href={href} target="_blank" rel="noopener" className={`group flex min-h-12 items-center justify-between gap-4 text-sm transition-colors hover:text-accent ${focusRing}`}>
                  {name}
                  <span className="sr-only"> (opens in a new tab)</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent rtl:-scale-x-100" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">A walkthrough of this store is available on request.</p>
        )}
      </div>
    </div>
  );
}

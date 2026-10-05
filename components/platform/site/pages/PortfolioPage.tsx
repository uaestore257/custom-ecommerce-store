import type { CSSProperties } from "react";
import { getWorkCategories } from "@/lib/server/platform/work";
import { ClosingCta } from "../ClosingCta";
import { ArrowLink, CONTAINER, Eyebrow, SectionHeading, SplitWords, StudioMain } from "../primitives";
import { WorkDemoBrowser } from "../work/WorkDemoBrowser";

/**
 * /portfolio — "Work": the Services categories that have a live demo; each
 * lists its demos, each demo opens its details and its live store.
 */
export async function PortfolioPage() {
  const categories = await getWorkCategories();

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
        </div>
      </section>

      <section aria-labelledby="work-demos-title" id="live-demos" className="scroll-mt-28 border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            id="work-demos-title"
            eyebrow="Live demos"
            title="Explore by category."
            lede="Choose a category to see every live demo we run for it, pick one for the details, then open it live: browse, search, add to cart and walk through checkout."
          />
          {categories.length > 0 ? (
            <div data-reveal className="mt-14">
              <WorkDemoBrowser categories={categories} />
            </div>
          ) : (
            <p className="mt-14 max-w-2xl text-pretty text-lg leading-relaxed text-foreground/70" role="status">
              We&apos;re preparing live stores to explore. Please check back soon.
            </p>
          )}
        </div>
      </section>

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

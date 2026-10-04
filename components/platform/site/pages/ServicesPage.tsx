import type { CSSProperties } from "react";
import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import { ClosingCta } from "../ClosingCta";
import { CONTAINER, Eyebrow, SectionHeading, SplitWords, StudioMain } from "../primitives";
import { ProcessLine } from "../ProcessLine";
import { ServiceIndex } from "../services/ServiceIndex";

/** /services: everything the studio builds, organised by what a business needs. */
export function ServicesPage() {
  return (
    <StudioMain>
      <section aria-labelledby="services-title" className="relative isolate overflow-hidden">
        <div aria-hidden className="studio-glow pointer-events-none absolute -end-[15%] -top-[40%] -z-10 h-[60rem] w-[60rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_16%,transparent),transparent)]" />
        <div className={`${CONTAINER} grid gap-10 pb-20 pt-36 lg:grid-cols-12 lg:pb-28 lg:pt-44`}>
          <div className="lg:col-span-8">
            <div className="studio-rise">
              <Eyebrow>Services</Eyebrow>
            </div>
            <h1 id="services-title" className="mt-7 font-heading text-[3.4rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl rtl:tracking-normal">
              <SplitWords text="Complete digital solutions, built to perform." />
            </h1>
          </div>
          <div className="studio-rise self-end lg:col-span-4" style={{ "--delay": "300ms" } as CSSProperties}>
            <p className="text-pretty text-lg leading-relaxed text-foreground/75">
              Ecommerce is our flagship. Around it we design and build websites, apps, AI, automation and the software that
              connects them — one studio, accountable end to end.
            </p>
            <p className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              Marks what our commerce platform provides today. Everything else is scoped and built for your project.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Service categories" className="border-t border-border">
        <div className={`${CONTAINER} grid gap-12 py-20 lg:grid-cols-12 lg:py-28`}>
          <div className="lg:col-span-3">
            <ServiceIndex categories={SERVICE_CATEGORIES} />
          </div>
          <div className="space-y-24 lg:col-span-9 lg:space-y-32">
            {SERVICE_CATEGORIES.map((category, index) => {
              const native = new Set(category.platformNative ?? []);
              return (
                <article key={category.slug} id={category.slug} aria-labelledby={`${category.slug}-title`} className="scroll-mt-28">
                  <div data-reveal className="grid gap-6 lg:grid-cols-9">
                    <div className="lg:col-span-5">
                      <p className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</p>
                      <h2 id={`${category.slug}-title`} className="mt-4 font-heading text-5xl leading-none tracking-tight sm:text-7xl rtl:tracking-normal">
                        {category.title}
                      </h2>
                    </div>
                    <p className="self-end text-pretty text-base leading-relaxed text-foreground/75 lg:col-span-4">{category.outcome}</p>
                  </div>
                  <ul data-reveal className="mt-10 grid gap-x-8 border-t border-border sm:grid-cols-2 xl:grid-cols-3">
                    {category.items.map((item) => (
                      <li key={item} className="flex min-h-12 items-center gap-3 border-b border-border py-2 text-sm text-foreground/85">
                        {native.has(item) ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-accent">
                            <span className="sr-only">On our platform today: </span>
                          </span>
                        ) : (
                          <span aria-hidden className="h-px w-2 shrink-0 bg-foreground/30" />
                        )}
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="process-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            index="—"
            eyebrow="How we work"
            id="process-title"
            title="Five steps, each one finished before the next."
            lede="You see real, working software throughout — never a slide deck standing in for progress."
          />
          <div className="mt-16 lg:mt-20">
            <ProcessLine />
          </div>
        </div>
      </section>

      <ClosingCta
        title={
          <>
            Tell us what you <em className="text-accent">need</em>.
          </>
        }
        text="A few lines about your business and what you want to build is all it takes to begin. We'll come back with how we'd approach it."
      />
    </StudioMain>
  );
}

import type { ReactNode } from "react";
import { ButtonLink, CONTAINER } from "./primitives";

/** The conversion moment every page ends on, over a warm glow. */
export function ClosingCta({ title, text, children }: { title: ReactNode; text: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="closing-cta" className="relative isolate overflow-hidden border-t border-border">
      <div aria-hidden className="studio-glow pointer-events-none absolute start-1/2 top-1/2 -z-10 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_20%,transparent),transparent)]" />
      <div data-reveal className={`${CONTAINER} py-28 text-center lg:py-40`}>
        <h2 id="closing-cta" className="mx-auto max-w-5xl text-balance font-heading text-5xl leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl rtl:tracking-normal">
          {title}
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-pretty text-lg leading-relaxed text-foreground/75">{text}</p>
        <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
          {children ?? (
            <>
              <ButtonLink href="/contact">Start a project</ButtonLink>
              <ButtonLink href="/portfolio" variant="outline">
                See our work
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

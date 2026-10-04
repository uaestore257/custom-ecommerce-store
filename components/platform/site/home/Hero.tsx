import type { CSSProperties } from "react";
import type { TemplateShowcaseEntry } from "@/lib/platform/showcase";
import { ButtonLink, CONTAINER, Eyebrow, SplitWords } from "../primitives";
import { BrowserShot, PhoneShot } from "../work/DeviceFrames";
import { SHOWCASE_MEDIA } from "../work/showcase-media";
import { caseIdentity } from "../work/WorkCase";

/**
 * The homepage's first viewport: the promise, two calls to action and the
 * work itself — the flagship demo store on desktop with a second store on
 * a phone, tilting gently under the pointer over an ambient glow.
 */
export function Hero({ tagline, lead, second }: { tagline: string; lead: TemplateShowcaseEntry; second?: TemplateShowcaseEntry }) {
  const leadIdentity = caseIdentity(lead);
  const secondIdentity = second ? caseIdentity(second) : null;

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Ambient light and a faint architectural grid. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="studio-glow absolute -end-[20%] -top-[30%] h-[70rem] w-[70rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_22%,transparent),transparent)]" />
        <div className="absolute -start-[25%] top-[30%] h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(closest-side,rgb(120_70_60/0.18),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:96px_96px] [mask-image:radial-gradient(ellipse_at_60%_30%,black,transparent_70%)]" />
      </div>

      <div className={`${CONTAINER} grid min-h-[100svh] items-center gap-14 pb-20 pt-32 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-36`}>
        <div className="lg:col-span-6 xl:col-span-6">
          <div className="studio-rise">
            <Eyebrow>{tagline}</Eyebrow>
          </div>
          <h1 id="hero-title" className="mt-7 font-heading text-[3.4rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.4rem] xl:text-[6.6rem] rtl:tracking-normal">
            <SplitWords text="Commerce, with a point of view." />
          </h1>
          <p className="studio-rise mt-8 max-w-xl text-pretty text-lg leading-relaxed text-foreground/75 sm:text-xl" style={{ "--delay": "450ms" } as CSSProperties}>
            We design and build premium ecommerce stores, websites, apps and AI-powered systems for ambitious businesses — on a
            production commerce platform we engineer ourselves.
          </p>
          <div className="studio-rise mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ "--delay": "600ms" } as CSSProperties}>
            <ButtonLink href="/portfolio">Explore our work</ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Start a project
            </ButtonLink>
          </div>
        </div>

        <div data-tilt className="studio-rise relative lg:col-span-6" style={{ "--delay": "250ms" } as CSSProperties}>
          <figure className="relative pb-16 pe-8 sm:pe-16">
            <div className="studio-tilt-layer" style={{ "--depth": "8px" } as CSSProperties}>
              <BrowserShot
                image={SHOWCASE_MEDIA[lead.key].desktop}
                alt={`${leadIdentity.storeName}, a live demo store built on the ${lead.manifest.name} template`}
                host={leadIdentity.host ?? leadIdentity.storeName}
                priority
                sizes="(min-width: 1024px) 46vw, 92vw"
              />
            </div>
            {second && secondIdentity && (
              <div className="studio-tilt-layer absolute bottom-0 end-0 w-[30%] max-w-[12.5rem]" style={{ "--depth": "26px" } as CSSProperties}>
                <PhoneShot
                  image={SHOWCASE_MEDIA[second.key].mobile}
                  alt={`${secondIdentity.storeName} on a phone, built on the ${second.manifest.name} template`}
                  priority
                  sizes="(min-width: 1024px) 13vw, 30vw"
                />
              </div>
            )}
            <figcaption className="mt-6 flex flex-wrap pe-[32%] gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">
              <span>
                <span aria-hidden className="me-2 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-accent" />
                Live demo stores
              </span>
              <span>{leadIdentity.storeName}</span>
              {secondIdentity && <span>{secondIdentity.storeName}</span>}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

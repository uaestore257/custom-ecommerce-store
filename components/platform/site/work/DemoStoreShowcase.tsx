import type { CSSProperties } from "react";
import type { WorkDemo } from "@/lib/platform/work";
import { ExternalButtonLink, Eyebrow } from "../primitives";
import { focusRing } from "../styles";
import { BrowserShot, PhoneShot } from "./DeviceFrames";

/**
 * The canonical editorial presentation for one real demo store. Work supplies
 * its eligible demo data; the template key selects only that store's capture.
 */
export function DemoStoreShowcase({
  demo,
  index,
  reverse = false,
  headingLevel = "h3",
  priority = false,
}: {
  demo: WorkDemo;
  index: number;
  reverse?: boolean;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
}) {
  const media = demo.screenshots
    ? {
        tall: `/showcase/${demo.screenshots}-tall.jpg`,
        mobile: `/showcase/${demo.screenshots}-mobile.jpg`,
      }
    : null;
  const Heading = headingLevel;
  const id = `work-${demo.serviceSlug}-${index}`;
  const host = new URL(demo.url).host;
  const alt = `${demo.name} homepage, built on the ${demo.templateName} template`;

  return (
    <article id={id} aria-labelledby={`${id}-case`} className="scroll-mt-28 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      <div data-reveal data-tilt className={`relative pb-14 pe-6 sm:pe-12 lg:col-span-7 ${reverse ? "lg:order-2" : ""}`}>
        <div aria-hidden className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_18%,transparent),transparent)] opacity-70" />
        <div className="studio-tilt-layer" style={{ "--depth": "6px" } as CSSProperties}>
          {media ? (
            <a href={demo.url} target="_blank" rel="noopener" className={`group block ${focusRing}`}>
              <span className="sr-only">Open the live {demo.name} store (opens in a new tab)</span>
              <BrowserShot image={media.tall} alt={alt} host={host} priority={priority} />
            </a>
          ) : (
            <div className="aspect-[16/10] border border-white/10 bg-[#1b1a18] shadow-[0_40px_120px_-40px_rgb(0_0_0/0.8)]" />
          )}
        </div>
        {media && (
          <div className="studio-tilt-layer absolute bottom-0 end-0 w-[30%] max-w-[13rem]" style={{ "--depth": "22px" } as CSSProperties}>
            <PhoneShot image={media.mobile} alt={`${demo.name} on a phone`} />
          </div>
        )}
      </div>

      <div data-reveal style={{ "--delay": "120ms" } as CSSProperties} className={`lg:col-span-5 ${reverse ? "lg:order-1" : ""}`}>
        <Eyebrow index={String(index).padStart(2, "0")}>{demo.industry ?? demo.templateName}</Eyebrow>
        <Heading id={`${id}-case`} className="mt-6 text-balance font-heading text-5xl leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl rtl:tracking-normal">
          {demo.name}
        </Heading>
        <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-foreground/80">{demo.headline}</p>
        <ul className="mt-8 border-t border-border">
          {demo.signatures.map((signature) => (
            <li key={signature} className="flex items-baseline gap-4 border-b border-border py-3.5 text-sm">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] bg-accent" />
              {signature}
            </li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">
          {demo.templateName} template · Live demo store
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
          <ExternalButtonLink href={demo.url}>View live store</ExternalButtonLink>
        </div>
      </div>
    </article>
  );
}

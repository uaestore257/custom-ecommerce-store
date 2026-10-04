import type { CSSProperties } from "react";
import type { TemplateShowcaseEntry } from "@/lib/platform/showcase";
import { ArrowLink, ButtonLink, Eyebrow, ExternalButtonLink } from "../primitives";
import { focusRing } from "../styles";
import { BrowserShot, PhoneShot } from "./DeviceFrames";
import { SHOWCASE_MEDIA } from "./showcase-media";

/** The demo store's display name and host, from its live links when there are any. */
export function caseIdentity(entry: TemplateShowcaseEntry) {
  const storeName = entry.demo?.storeName ?? `${entry.manifest.name} demo store`;
  let host: string | undefined;
  try {
    host = entry.demo ? new URL(entry.demo.home).host : undefined;
  } catch {
    host = undefined;
  }
  return { storeName, host };
}

/**
 * One live demo store presented as work: a real homepage screenshot that
 * scrolls on hover (and links to the live store), the mobile view floating
 * over it with pointer tilt, and the case in a sentence with its CTA.
 */
export function WorkCase({
  entry,
  index,
  reverse = false,
  headingLevel = "h3",
  detailsHref,
  priority = false,
}: {
  entry: TemplateShowcaseEntry;
  index: number;
  reverse?: boolean;
  headingLevel?: "h2" | "h3";
  detailsHref?: string;
  priority?: boolean;
}) {
  const { key, manifest, editorial, demo } = entry;
  const media = SHOWCASE_MEDIA[key];
  const { storeName, host } = caseIdentity(entry);
  const Heading = headingLevel;
  const alt = `${storeName} homepage, built on the ${manifest.name} template`;

  const shot = <BrowserShot image={media.tall} alt={alt} host={host ?? storeName} priority={priority} />;

  return (
    <article id={key} aria-labelledby={`${key}-case`} className="scroll-mt-28 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      <div data-reveal data-tilt className={`relative pb-14 pe-6 sm:pe-12 lg:col-span-7 ${reverse ? "lg:order-2" : ""}`}>
        <div aria-hidden className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_18%,transparent),transparent)] opacity-70" />
        <div className="studio-tilt-layer" style={{ "--depth": "6px" } as CSSProperties}>
          {demo ? (
            <a href={demo.home} target="_blank" rel="noopener" className={`group block ${focusRing}`}>
              <span className="sr-only">Open the live {storeName} store (opens in a new tab)</span>
              {shot}
            </a>
          ) : (
            shot
          )}
        </div>
        <div className="studio-tilt-layer absolute bottom-0 end-0 w-[30%] max-w-[13rem]" style={{ "--depth": "22px" } as CSSProperties}>
          <PhoneShot image={media.mobile} alt={`${storeName} on a phone`} />
        </div>
      </div>

      <div data-reveal style={{ "--delay": "120ms" } as CSSProperties} className={`lg:col-span-5 ${reverse ? "lg:order-1" : ""}`}>
        <Eyebrow index={String(index).padStart(2, "0")}>{editorial.industry}</Eyebrow>
        <Heading id={`${key}-case`} className="mt-6 text-balance font-heading text-5xl leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl rtl:tracking-normal">
          {storeName}
        </Heading>
        <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-foreground/80">{editorial.headline}</p>
        <ul className="mt-8 border-t border-border">
          {editorial.signatures.map((signature) => (
            <li key={signature.title} className="flex items-baseline gap-4 border-b border-border py-3.5 text-sm">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] bg-accent" />
              {signature.title}
            </li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">
          {manifest.name} template · Live demo store
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
          {demo ? <ExternalButtonLink href={demo.home}>View live store</ExternalButtonLink> : <ButtonLink href="/contact">Ask for a walkthrough</ButtonLink>}
          {detailsHref && <ArrowLink href={detailsHref}>Case details</ArrowLink>}
        </div>
      </div>
    </article>
  );
}

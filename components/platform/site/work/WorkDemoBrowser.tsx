"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { ArrowRight } from "lucide-react";
import type { WorkCategory, WorkDemo } from "@/lib/platform/work";
import { focusRing } from "../styles";
import { BrowserShot, PhoneShot } from "./DeviceFrames";
import { SHOWCASE_MEDIA } from "./showcase-media";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal";

/**
 * Work's live demos: one tab per Services category that has a demo (WAI-ARIA
 * tabs: arrow keys, mirrored in RTL, Home/End). A category lists ALL its
 * demos; choosing one opens its short details and the "View Live" link.
 * Categories arrive already filtered on the server: a category is only here
 * when it has a demo.
 */
export function WorkDemoBrowser({ categories }: { categories: WorkCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug);
  const [chosen, setChosen] = useState<string | null>(null);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const details = useRef<HTMLHeadingElement>(null);
  if (categories.length === 0) return null;
  const current = categories.find((category) => category.slug === active) ?? categories[0];
  const demo = current.demos.find((candidate) => candidate.url === chosen) ?? null;

  function selectCategory(slug: string) {
    setActive(slug);
    setChosen(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
    let next: number | null = null;
    if (step !== undefined) next = (index + step + categories.length) % categories.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = categories.length - 1;
    if (next === null) return;
    event.preventDefault();
    const slug = categories[next].slug;
    selectCategory(slug);
    tabs.current[slug]?.focus();
  }

  function choose(url: string) {
    setChosen(url);
    // Bring the details into view and move focus there (after they render).
    requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      details.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      details.current?.focus({ preventScroll: true });
    });
  }

  return (
    <div>
      <div role="tablist" aria-label="Work by category" className="flex flex-wrap gap-2">
        {categories.map((category, index) => {
          const selected = category.slug === current.slug;
          return (
            <button
              key={category.slug}
              ref={(element) => {
                tabs.current[category.slug] = element;
              }}
              type="button"
              role="tab"
              id={`work-tab-${category.slug}`}
              aria-selected={selected}
              aria-label={`${category.title}, ${category.demos.length} ${category.demos.length === 1 ? "live demo" : "live demos"}`}
              aria-controls={`work-panel-${category.slug}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectCategory(category.slug)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors duration-300 ${focusRing} ${
                selected ? "border-foreground bg-foreground text-background" : "border-border text-foreground/80 hover:border-foreground/60 hover:text-foreground"
              }`}
            >
              {category.title}
              <span aria-hidden className={`font-mono text-[11px] ${selected ? "text-background/70" : "text-muted-foreground"}`}>
                {category.demos.length}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`work-panel-${current.slug}`} aria-label={current.title} className="mt-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.demos.map((item) => (
            <li key={item.url}>
              <DemoCard demo={item} selected={item.url === chosen} onChoose={() => choose(item.url)} />
            </li>
          ))}
        </ul>

        {demo && (
          <section id="work-demo-details" aria-labelledby="work-demo-details-title" className="mt-16 scroll-mt-28 border-t border-border pt-16">
            <DemoDetails demo={demo} index={current.demos.indexOf(demo) + 1} headingRef={details} />
          </section>
        )}
      </div>
    </div>
  );
}

/** One demo in a category's list; choosing it opens its short details. */
function DemoCard({ demo, selected, onChoose }: { demo: WorkDemo; selected: boolean; onChoose: () => void }) {
  const media = demo.screenshots ? SHOWCASE_MEDIA[demo.screenshots] : null;
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-expanded={selected}
      aria-controls="work-demo-details"
      className={`group flex h-full w-full flex-col border bg-surface text-start transition-colors duration-500 ${focusRing} ${
        selected ? "border-accent" : "border-border hover:border-accent/60"
      }`}
    >
      {media ? (
        <span className="relative block aspect-[16/10] w-full overflow-hidden bg-white">
          <Image
            src={media.desktop}
            alt=""
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 48vw, 100vw"
            placeholder="blur"
            className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </span>
      ) : (
        <span aria-hidden className="flex aspect-[16/10] w-full flex-col justify-end bg-muted p-6">
          <span className="truncate font-heading text-4xl leading-tight text-foreground/90">{demo.name}</span>
        </span>
      )}
      <span className="flex w-full items-end justify-between gap-4 p-6">
        <span className="min-w-0">
          <span className={`block ${EYEBROW}`}>
            {[demo.industry, `${demo.templateName} template`].filter(Boolean).join(" · ")}
          </span>
          <span className="mt-3 block truncate font-heading text-3xl">{demo.name}</span>
        </span>
        <ArrowRight
          className={`mb-2 h-5 w-5 shrink-0 text-accent transition-transform duration-500 rtl:rotate-180 ${selected ? "rotate-90 rtl:rotate-90" : "group-hover:translate-x-1"}`}
          aria-hidden
        />
      </span>
    </button>
  );
}

/** A demo's short details, with the way into the live store. */
function DemoDetails({ demo, index, headingRef }: { demo: WorkDemo; index: number; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const media = demo.screenshots ? SHOWCASE_MEDIA[demo.screenshots] : null;
  let host = demo.name;
  try {
    host = new URL(demo.url).host;
  } catch {
    // keep the store name
  }
  return (
    <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="relative pb-14 pe-6 sm:pe-12 lg:col-span-7">
        {media ? (
          <>
            <BrowserShot image={media.tall} alt={`${demo.name} homepage, built on the ${demo.templateName} template`} host={host} />
            <div className="absolute bottom-0 end-0 w-[30%] max-w-[13rem]">
              <PhoneShot image={media.mobile} alt={`${demo.name} on a phone`} />
            </div>
          </>
        ) : (
          <div aria-hidden className="flex aspect-[16/10] flex-col justify-between border border-border bg-muted p-8">
            <span className={EYEBROW}>{host}</span>
            <span className="font-heading text-5xl leading-tight text-foreground/90 sm:text-6xl">{demo.name}</span>
          </div>
        )}
      </div>

      <div className="lg:col-span-5">
        <p className={`flex items-center gap-4 ${EYEBROW}`}>
          <span className="text-accent">{String(index).padStart(2, "0")}</span>
          <span aria-hidden className="h-px w-8 bg-border" />
          {demo.industry ?? `${demo.templateName} template`}
        </p>
        <h3
          ref={headingRef}
          id="work-demo-details-title"
          tabIndex={-1}
          className="mt-6 text-balance font-heading text-5xl leading-[0.98] tracking-tight focus:outline-none sm:text-6xl xl:text-7xl rtl:tracking-normal"
        >
          {demo.name}
        </h3>
        <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-foreground/80">{demo.tagline ?? demo.headline}</p>
        {demo.tagline && <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">{demo.headline}</p>}
        <ul className="mt-8 border-t border-border">
          {demo.signatures.map((signature) => (
            <li key={signature} className="flex items-baseline gap-4 border-b border-border py-3.5 text-sm">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] bg-accent" />
              {signature}
            </li>
          ))}
        </ul>
        <p className={`mt-6 ${EYEBROW}`}>{demo.templateName} template · Live demo store</p>
        <a
          href={demo.url}
          target="_blank"
          rel="noopener"
          aria-label={`View Live: open the live ${demo.name} demo store (opens in a new tab)`}
          className={`group mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground transition-[filter,transform] duration-300 hover:brightness-110 active:scale-[0.98] ${focusRing}`}
        >
          View Live
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" aria-hidden />
        </a>
      </div>
    </div>
  );
}

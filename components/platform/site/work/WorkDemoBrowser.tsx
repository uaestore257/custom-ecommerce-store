"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { WorkCategory } from "@/lib/platform/work";
import { focusRing } from "../styles";

/**
 * Work's live demo stores, one tab per category (WAI-ARIA tabs pattern:
 * arrow keys move between categories, mirrored in RTL; Home/End jump).
 * The categories arrive already filtered on the server: a category is only
 * here when it has at least one live demo store.
 */
export function WorkDemoBrowser({ categories }: { categories: WorkCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  if (categories.length === 0) return null;
  const current = categories.find((category) => category.slug === active) ?? categories[0];

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
    setActive(slug);
    tabs.current[slug]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Demo stores by category" className="flex flex-wrap gap-2">
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
              aria-controls={`work-panel-${category.slug}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(category.slug)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors duration-300 ${focusRing} ${
                selected ? "border-foreground bg-foreground text-background" : "border-border text-foreground/80 hover:border-foreground/60 hover:text-foreground"
              }`}
            >
              {category.title}
              <span className={`font-mono text-[11px] ${selected ? "text-background/70" : "text-muted-foreground"}`}>
                <span className="sr-only">, </span>
                {category.demos.length}
                <span className="sr-only"> {category.demos.length === 1 ? "demo store" : "demo stores"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {categories.map((category) => (
        <div
          key={category.slug}
          role="tabpanel"
          id={`work-panel-${category.slug}`}
          aria-labelledby={`work-tab-${category.slug}`}
          hidden={category.slug !== current.slug}
          tabIndex={0}
          className={`mt-10 ${focusRing}`}
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.demos.map((demo) => (
              <li key={demo.url} className="flex flex-col border border-border bg-surface">
                <div aria-hidden className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden bg-muted p-6">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal">{category.title}</span>
                  <span className="truncate font-heading text-4xl leading-tight text-foreground/90">{demo.name}</span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-2xl">{demo.name}</h3>
                    {demo.tagline && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/75">{demo.tagline}</p>}
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal">
                      {demo.templateName} template
                    </p>
                  </div>
                  <a
                    href={demo.url}
                    target="_blank"
                    rel="noopener"
                    className={`group mt-auto inline-flex min-h-12 items-center justify-between gap-3 border-t border-border pt-4 text-sm font-medium text-accent transition-colors hover:text-foreground ${focusRing}`}
                  >
                    <span>
                      View Live<span className="sr-only">: {demo.name} (opens in a new tab)</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

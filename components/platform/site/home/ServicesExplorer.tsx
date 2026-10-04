"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import type { ServiceCategory } from "@/lib/platform/services";
import { focusRing } from "../styles";

/**
 * "What we build": a tab list of service categories driving one large
 * panel (WAI-ARIA tabs with automatic activation: arrow keys, Home, End).
 * Vertical beside the panel on large screens, a scrollable row above it on
 * phones. Every category links on to its section of /services.
 */
export function ServicesExplorer({ categories }: { categories: readonly ServiceCategory[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const category = categories[active];

  const select = (index: number) => {
    const next = (index + categories.length) % categories.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => select(active + 1),
      ArrowRight: () => select(active + 1),
      ArrowUp: () => select(active - 1),
      ArrowLeft: () => select(active - 1),
      Home: () => select(0),
      End: () => select(categories.length - 1),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
      <div
        role="tablist"
        aria-label="Services"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:col-span-4 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {categories.map((item, index) => {
          const selected = index === active;
          return (
            <button
              key={item.slug}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              role="tab"
              type="button"
              id={`${id}-tab-${item.slug}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              onMouseEnter={() => setActive(index)}
              className={`group relative flex min-h-12 shrink-0 items-center gap-4 rounded-md border px-4 text-start text-sm transition-colors lg:min-h-16 lg:rounded-none lg:border-0 lg:border-b lg:border-border lg:px-0 lg:text-2xl lg:font-heading ${focusRing} ${
                selected ? "border-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span aria-hidden className="hidden font-mono text-[11px] text-accent lg:inline">{String(index + 1).padStart(2, "0")}</span>
              {item.title}
              <span
                aria-hidden
                className={`ms-auto hidden h-px bg-accent transition-all duration-500 lg:block ${selected ? "w-12 opacity-100" : "w-0 opacity-0"}`}
              />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${category.slug}`}
        tabIndex={0}
        className={`studio-spotlight relative overflow-hidden border border-border bg-surface p-7 sm:p-10 lg:col-span-8 lg:p-14 ${focusRing}`}
      >
        <div key={category.slug} className="studio-rise">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent rtl:tracking-normal">
            {String(active + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}
          </p>
          <h3 className="mt-6 font-heading text-5xl leading-none tracking-tight sm:text-7xl rtl:tracking-normal">{category.title}</h3>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-foreground/75">{category.outcome}</p>
          <ul className="mt-10 grid gap-x-10 border-t border-border sm:grid-cols-2">
            {category.items.slice(0, 8).map((item) => (
              <li key={item} className="flex items-center gap-3 border-b border-border py-3 text-sm text-foreground/85">
                <span aria-hidden className="h-px w-3 bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <Link href={`/services#${category.slug}`} className={`group mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent ${focusRing}`}>
            Everything in {category.title}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

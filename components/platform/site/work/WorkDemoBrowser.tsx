"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { WorkCategory } from "@/lib/platform/work";
import { focusRing } from "../styles";
import { DemoStoreShowcase } from "./DemoStoreShowcase";

/**
 * Work's live demos: one tab per Services category that has a demo (WAI-ARIA
 * tabs: arrow keys, mirrored in RTL, Home/End). Every demo in the selected
 * category uses the shared editorial showcase presentation.
 * Categories arrive already filtered on the server: a category is only here
 * when it has a demo.
 */
export function WorkDemoBrowser({ categories }: { categories: WorkCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = categories.find((category) => category.slug === active) ?? categories[0];

  useEffect(() => {
    const panel = document.getElementById(`work-panel-${current?.slug}`);
    const elements = Array.from(panel?.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])") ?? []);
    if (elements.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.setAttribute("data-shown", ""));
      return;
    }
    const viewport = window.innerHeight;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.top < viewport && rect.bottom > 0) element.setAttribute("data-shown", "");
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    for (const element of elements) if (!element.hasAttribute("data-shown")) observer.observe(element);
    return () => observer.disconnect();
  }, [current?.slug]);

  if (categories.length === 0) return null;

  function selectCategory(slug: string) {
    setActive(slug);
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

      <div role="tabpanel" id={`work-panel-${current.slug}`} aria-label={current.title} className="mt-20 space-y-28 lg:mt-28 lg:space-y-40">
        {current.demos.map((demo, index) => (
          <DemoStoreShowcase
            key={demo.url}
            demo={demo}
            index={index + 1}
            reverse={index % 2 === 1}
            priority={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

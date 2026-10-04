"use client";

import { useEffect, useState } from "react";
import { focusRing } from "../styles";

/**
 * The /services category index. On large screens it sticks beside the
 * content and marks the section being read (aria-current="location"),
 * using one IntersectionObserver.
 */
export function ServiceIndex({ categories }: { categories: readonly { slug: string; title: string }[] }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(category.slug))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav aria-label="Service categories" className="lg:sticky lg:top-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal">Categories</p>
      <ol className="mt-5 flex flex-wrap gap-2 lg:block lg:space-y-0">
        {categories.map((category, index) => {
          const active = current === category.slug;
          return (
            <li key={category.slug}>
              <a
                href={`#${category.slug}`}
                aria-current={active ? "location" : undefined}
                className={`group flex min-h-11 items-center gap-3 border px-3 text-sm transition-colors lg:border-0 lg:px-0 ${focusRing} ${
                  active ? "border-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`hidden font-mono text-[11px] lg:inline ${active ? "text-accent" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                <span aria-hidden className={`hidden h-px bg-accent transition-all duration-500 lg:block ${active ? "w-6" : "w-0"}`} />
                {category.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

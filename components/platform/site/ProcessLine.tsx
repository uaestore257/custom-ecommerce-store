import type { CSSProperties } from "react";
import { PROCESS_STEPS } from "@/lib/platform/services";

/** Discover → Design → Build → Launch → Grow, joined by a line that draws itself in. */
export function ProcessLine() {
  return (
    <div data-reveal className="relative">
      <svg aria-hidden viewBox="0 0 1000 2" preserveAspectRatio="none" className="absolute inset-x-0 top-[1.15rem] hidden h-px w-full overflow-visible lg:block">
        <path d="M0 1 H1000" pathLength={1} fill="none" stroke="var(--sf-accent)" strokeWidth={1} vectorEffect="non-scaling-stroke" className="studio-draw" />
      </svg>
      <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
        {PROCESS_STEPS.map((step, index) => (
          <li key={step.title} data-reveal style={{ "--delay": `${200 + index * 120}ms` } as CSSProperties} className="relative">
            <span className="relative z-10 grid h-9 w-9 place-items-center border border-accent bg-background font-mono text-[11px] text-accent">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-6 font-heading text-4xl">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

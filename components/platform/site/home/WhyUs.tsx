import type { CSSProperties } from "react";
import { CONTAINER, SectionHeading, Tone } from "../primitives";

const REASONS: { title: string; text: string }[] = [
  { title: "Distinctive design", text: "A store that looks like your brand, not like a theme everyone else bought." },
  { title: "Production-ready technology", text: "Real checkout, real order handling and real security from the first release — not a prototype." },
  { title: "Built to scale", text: "One proven commerce core under every store, so growth means adding, not rebuilding." },
  { title: "AI-first workflows", text: "AI in how we design, build and test, and in the assistants and automations we build for you." },
  { title: "Fast on every device", text: "Server-rendered pages that load quickly on mobile networks and feel instant to shop." },
  { title: "Found in search", text: "Clean URLs, structured data and sitemaps from day one, ready for English and Arabic search." },
  { title: "Arabic and English", text: "Right-to-left layouts done properly, so Arabic customers get a first-class store." },
  { title: "We stay after launch", text: "Maintenance, improvements and new features as your business asks for them." },
];

/** Why UAE Store: outcomes, not internals. */
export function WhyUs() {
  return (
    <Tone tone="paper" aria-labelledby="why-title">
      <div className={`${CONTAINER} py-24 lg:py-36`}>
        <SectionHeading index="02" eyebrow="Why work with us" id="why-title" title="Beautiful outside. Serious inside." />
        <ul className="mt-16 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason, index) => (
            <li
              key={reason.title}
              data-reveal
              style={{ "--delay": `${(index % 4) * 80}ms` } as CSSProperties}
              className="studio-spotlight group bg-surface-elevated p-7 transition-colors duration-500 hover:bg-background lg:min-h-64"
            >
              <p className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-10 font-heading text-3xl leading-tight transition-transform duration-500 group-hover:-translate-y-1">{reason.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{reason.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Tone>
  );
}

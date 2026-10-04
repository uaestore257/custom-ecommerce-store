import { CONTAINER, Eyebrow, SectionHeading, StudioMain } from "../primitives";
import { ClosingCta, PlatformDiagram } from "../sections";

const PRINCIPLES: { title: string; text: string }[] = [
  {
    title: "Structure before decoration",
    text: "A template earns its place by how it is organised — navigation, hierarchy, the rhythm of a product page — not by ornament. Colour and type then give it a voice.",
  },
  {
    title: "Every store stands alone",
    text: "Your store is resolved from its own address and every read is scoped to it. Your customers and orders are never shared with, or visible to, another store.",
  },
  {
    title: "The server has the final word",
    text: "Pages are rendered on the server; prices, stock and delivery are re-checked there at checkout. What a customer sees is what the store will honour.",
  },
  {
    title: "Say only what is true",
    text: "No invented reviews, counters or urgency. A premium store earns trust with clarity: real prices, real delivery terms, real stock.",
  },
];

/** /about: who the studio is and how the platform is put together. */
export function AboutPage({ platformName }: { platformName: string }) {
  return (
    <StudioMain>
      <section aria-labelledby="about-title">
        <div className={`${CONTAINER} grid gap-10 pb-16 pt-14 lg:grid-cols-12 lg:pb-24 lg:pt-20`}>
          <div className="lg:col-span-8">
            <Eyebrow>About {platformName}</Eyebrow>
            <h1 id="about-title" className="mt-6 text-balance font-heading text-5xl leading-[1] tracking-tight sm:text-7xl rtl:tracking-normal">
              One platform. Many stores. Each with its own character.
            </h1>
          </div>
          <div className="space-y-4 self-end text-base leading-relaxed text-muted-foreground lg:col-span-4">
            <p>
              We are a commerce studio with our own platform. We design storefronts the way an architect designs a building —
              as a system of decisions that hold together — and we run them on one foundation we build and maintain ourselves.
            </p>
            <p>That combination lets a single store look entirely its own while sharing everything that should never be reinvented.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="border-t border-border bg-surface">
        <div className={`${CONTAINER} py-20 lg:py-28`}>
          <SectionHeading index="01" eyebrow="Principles" id="principles-title" title="How we work." />
          <ol className="mt-14 grid gap-px border border-border bg-border md:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} className="studio-reveal bg-surface-elevated p-6 sm:p-8">
                <p className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 font-heading text-3xl leading-tight">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{principle.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="layers-title" className="border-t border-border">
        <div className={`${CONTAINER} py-20 lg:py-28`}>
          <SectionHeading
            index="02"
            eyebrow="The platform"
            id="layers-title"
            title="Three layers, clearly separated."
            lede="What a client owns, how it is presented and the commerce engine underneath are kept apart on purpose. That is what lets a store change its look without touching its orders — and lets us improve the engine without touching anyone's design."
          />
          <div className="studio-reveal mt-14">
            <PlatformDiagram />
          </div>
        </div>
      </section>

      <ClosingCta title="Let's talk about your store." text="Whether you are opening your first online store or moving an existing one, we are glad to show you how the platform would work for you." />
    </StudioMain>
  );
}

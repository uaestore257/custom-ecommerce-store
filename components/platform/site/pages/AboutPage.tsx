import type { CSSProperties } from "react";
import type { AgencyProfile } from "@/lib/agency/profile";
import { ClosingCta } from "../ClosingCta";
import { ArrowLink, CONTAINER, Eyebrow, SectionHeading, SplitWords, StudioMain, Tone } from "../primitives";

const PRINCIPLES: { title: string; text: string }[] = [
  { title: "Design leads", text: "A store earns attention by how it looks and how it feels to use. We start there, then engineer to protect it." },
  { title: "AI-first, people-accountable", text: "AI is part of how we research, design, build and test — and every decision still has a person who owns it." },
  { title: "Real software, early", text: "You click through working software from the first weeks, not a deck of pictures that stands in for progress." },
  { title: "Every store stands alone", text: "Your customers and orders are never shared with, or visible to, another business on our platform." },
  { title: "Say only what is true", text: "No invented reviews, counters or urgency — on our clients' stores or on this site." },
];

const AI_USES: [string, string][] = [
  ["In how we work", "Research, copy drafts, design exploration, code review and test generation — so more of the budget goes into craft."],
  ["In what we build", "Assistants that answer customers, search that understands intent, product content at catalogue scale, and automations that move work along."],
  ["With guard-rails", "Grounded in your own content, reviewed before it reaches customers, and measured against the outcome it was built for."],
];

/** /about: the studio and how it works. */
export function AboutPage({ agency }: { agency: AgencyProfile }) {
  const [lead, ...rest] = agency.aboutBody;
  return (
    <StudioMain>
      <section aria-labelledby="about-title" className="relative isolate overflow-hidden">
        <div aria-hidden className="studio-glow pointer-events-none absolute -start-[20%] -top-[40%] -z-10 h-[60rem] w-[60rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_16%,transparent),transparent)]" />
        <div className={`${CONTAINER} grid gap-10 pb-20 pt-36 lg:grid-cols-12 lg:pb-28 lg:pt-44`}>
          <div className="lg:col-span-8">
            <div className="studio-rise">
              <Eyebrow>About {agency.name}</Eyebrow>
            </div>
            <h1 id="about-title" className="mt-7 font-heading text-[3.4rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl rtl:tracking-normal">
              <SplitWords text={agency.aboutTitle} />
            </h1>
          </div>
          <div className="studio-rise space-y-4 self-end text-pretty text-lg leading-relaxed text-foreground/75 lg:col-span-4" style={{ "--delay": "300ms" } as CSSProperties}>
            <p>{lead}</p>
            {rest.map((paragraph) => (
              <p key={paragraph} className="text-base text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {agency.team.length > 0 && <People team={agency.team} />}

      <section aria-labelledby="principles-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading index={agency.team.length > 0 ? "02" : "01"} eyebrow="Principles" id="principles-title" title="How we work." />
          <ol className="mt-16 border-t border-border">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} data-reveal className="studio-spotlight group grid gap-4 border-b border-border py-9 md:grid-cols-12 md:items-baseline md:gap-8">
                <p className="font-mono text-[11px] text-accent md:col-span-1">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="font-heading text-4xl leading-tight transition-transform duration-500 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 md:col-span-5">
                  {principle.title}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground md:col-span-6">{principle.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Tone tone="ink" aria-labelledby="ai-title">
        <div className={`${CONTAINER} grid gap-14 py-24 lg:grid-cols-12 lg:py-32`}>
          <div className="lg:col-span-5">
            <SectionHeading index={agency.team.length > 0 ? "03" : "02"} eyebrow="AI-first" id="ai-title" title="AI where it earns its place." />
          </div>
          <dl className="space-y-10 lg:col-span-7">
            {AI_USES.map(([title, text]) => (
              <div key={title} data-reveal className="border-t border-border pt-5">
                <dt className="font-heading text-3xl">{title}</dt>
                <dd className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Tone>

      <section aria-label="Explore" className="border-t border-border">
        <div className={`${CONTAINER} grid gap-6 py-16 sm:grid-cols-3`}>
          <ArrowLink href="/portfolio">See the work</ArrowLink>
          <ArrowLink href="/services">What we build</ArrowLink>
          <ArrowLink href="/platform">How the platform works</ArrowLink>
        </div>
      </section>

      <ClosingCta
        title={
          <>
            Let&apos;s talk about <em className="text-accent">your</em> business.
          </>
        }
        text="Whether it's a first online store, a rebuild or an AI system for your team, we'd be glad to show you how we would approach it."
      />
    </StudioMain>
  );
}

/** The people behind the studio, exactly as configured in Agency settings. */
function People({ team }: { team: AgencyProfile["team"] }) {
  return (
    <section aria-labelledby="people-title" className="border-t border-border">
      <div className={`${CONTAINER} py-24 lg:py-32`}>
        <SectionHeading index="01" eyebrow="People" id="people-title" title="The people behind the work." />
        <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <li key={`${member.name}-${member.title}`} data-reveal>
              <article aria-label={member.title ? `${member.name}, ${member.title}` : member.name}>
                {member.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the URL is set in Agency settings and may be on any https host
                  <img src={member.imageUrl} alt={member.name} loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-md object-cover" />
                ) : (
                  <div aria-hidden className="grid aspect-[4/5] w-full place-items-center rounded-md border border-border bg-surface">
                    <span className="font-heading text-7xl text-accent/80">
                      {member.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join("")}
                    </span>
                  </div>
                )}
                {member.title && (
                  <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-accent rtl:tracking-normal">{member.title}</p>
                )}
                <h3 className="mt-3 font-heading text-4xl leading-tight">{member.name}</h3>
                {member.bio && <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{member.bio}</p>}
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

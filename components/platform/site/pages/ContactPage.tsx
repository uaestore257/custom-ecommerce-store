import Link from "next/link";
import type { CSSProperties } from "react";
import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import { EnquiryComposer } from "../contact/EnquiryComposer";
import { CONTAINER, Eyebrow, SplitWords, StudioMain, textLink } from "../primitives";
import { focusRing } from "../styles";

const NEXT_STEPS = [
  ["We read it properly", "A person reads every brief and replies with questions or a first view of how we'd approach it."],
  ["A short call", "We walk you through the live stores and talk through your products, customers and goals."],
  ["A clear proposal", "Scope, timeline and cost in writing — what's ready on the platform and what we'd build for you."],
];

/** /contact: start a project. Uses the platform contact address when one is configured. */
export function ContactPage({ platformName, email }: { platformName: string; email: string | null }) {
  return (
    <StudioMain>
      <section aria-labelledby="contact-title" className="relative isolate overflow-hidden">
        <div aria-hidden className="studio-glow pointer-events-none absolute -end-[20%] -top-[30%] -z-10 h-[60rem] w-[60rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_18%,transparent),transparent)]" />
        <div className={`${CONTAINER} grid gap-16 pb-24 pt-36 lg:grid-cols-12 lg:pb-32 lg:pt-44`}>
          <div className="lg:col-span-5">
            <div className="studio-rise">
              <Eyebrow>Start a project</Eyebrow>
            </div>
            <h1 id="contact-title" className="mt-7 font-heading text-6xl leading-[0.95] tracking-tight sm:text-8xl rtl:tracking-normal">
              <SplitWords text="Let's build it." />
            </h1>
            <p className="studio-rise mt-8 max-w-md text-pretty text-lg leading-relaxed text-foreground/75" style={{ "--delay": "300ms" } as CSSProperties}>
              Tell us about your business and what you want to build. We&apos;ll come back with how we&apos;d approach it — and
              what&apos;s ready on our platform today.
            </p>
            {email && (
              <p className="studio-rise mt-10" style={{ "--delay": "400ms" } as CSSProperties}>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">Or write directly</span>
                <a href={`mailto:${email}`} className={`mt-2 block break-all font-heading text-3xl text-accent sm:text-4xl ${focusRing}`}>
                  {email}
                </a>
              </p>
            )}
            <ol className="mt-14 border-t border-border">
              {NEXT_STEPS.map(([title, text], index) => (
                <li key={title} data-reveal className="grid grid-cols-[2.5rem_1fr] gap-2 border-b border-border py-5">
                  <span className="font-mono text-[11px] leading-7 text-accent">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-heading text-2xl">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="studio-rise lg:col-span-6 lg:col-start-7" style={{ "--delay": "250ms" } as CSSProperties}>
            <div className="border border-border bg-surface p-6 sm:p-10">
              <h2 className="font-heading text-4xl">Your brief</h2>
              {email ? (
                <div className="mt-10">
                  <EnquiryComposer email={email} platformName={platformName} services={SERVICE_CATEGORIES.map((category) => category.title)} />
                </div>
              ) : (
                <p className="mt-6 text-base text-muted-foreground" role="status">
                  Platform contact details have not been configured yet.
                </p>
              )}
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Already have a store with us?{" "}
              <Link href="/login" className={textLink}>
                Sign in
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </StudioMain>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CONTAINER, Eyebrow, StudioMain, textLink } from "../primitives";
import { focusRing } from "../styles";

const BRIEF = [
  "What you sell, and roughly how many products",
  "Where you deliver, and the payment methods your customers expect",
  "Your domain and brand assets, if you have them",
  "Which template felt closest to your brand",
  "When you would like to open",
];

/** /contact: how to start a project. Uses the platform contact address when one is configured. */
export function ContactPage({ platformName, email }: { platformName: string; email: string | null }) {
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent(`New store enquiry — ${platformName}`)}` : null;

  return (
    <StudioMain>
      <section aria-labelledby="contact-title">
        <div className={`${CONTAINER} grid gap-14 pb-24 pt-14 lg:grid-cols-12 lg:pb-32 lg:pt-20`}>
          <div className="lg:col-span-7">
            <Eyebrow>Contact</Eyebrow>
            <h1 id="contact-title" className="mt-6 font-heading text-6xl leading-[0.98] tracking-tight sm:text-8xl rtl:tracking-normal">
              Start a project.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Tell us about your products and your customers. We&apos;ll reply with how a store on the platform would work for
              you: which template fits, what setting it up involves, and what we would need from you.
            </p>

            {mailto && email ? (
              <div className="mt-12 border-t border-foreground pt-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground rtl:tracking-normal">Write to us</p>
                <a href={mailto} className={`group mt-3 inline-flex max-w-full items-center gap-3 break-all font-heading text-3xl sm:text-5xl ${focusRing}`}>
                  <span className="underline decoration-foreground/25 underline-offset-[10px] transition-colors group-hover:decoration-accent">{email}</span>
                  <ArrowRight className="h-7 w-7 shrink-0 text-accent rtl:rotate-180" aria-hidden />
                </a>
              </div>
            ) : (
              <p className="mt-12 border-t border-foreground pt-6 text-base text-muted-foreground" role="status">
                Platform contact details have not been configured yet.
              </p>
            )}
          </div>

          <aside aria-labelledby="brief-title" className="self-end lg:col-span-4 lg:col-start-9">
            <h2 id="brief-title" className="font-heading text-3xl">
              A useful first message
            </h2>
            <ol className="mt-6 border-t border-border">
              {BRIEF.map((item, index) => (
                <li key={item} className="grid grid-cols-[2rem_1fr] gap-2 border-b border-border py-4 text-sm leading-relaxed">
                  <span className="font-mono text-[11px] leading-6 text-accent">{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-muted-foreground">
              Not sure yet?{" "}
              <Link href="/portfolio" className={textLink}>
                Explore the templates
              </Link>{" "}
              first.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Already have a store with us?{" "}
              <Link href="/login" className={textLink}>
                Sign in
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </StudioMain>
  );
}

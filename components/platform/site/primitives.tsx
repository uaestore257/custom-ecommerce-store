import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { studioCssVariables } from "@/lib/platform/showcase";
import { focusRing } from "./styles";

// ---------------------------------------------------------------
// BUSINESS SITE PRIMITIVES. The platform's public site styles itself with
// the same semantic roles storefronts use (bg-background, text-foreground,
// border-border, text-accent, font-heading …); the values come from
// studioCssVariables() — paper for the page, ink for contrast bands.
// Square corners, hairline rules and mono labels give it the measured,
// architectural character; layout uses logical properties throughout so
// it mirrors correctly under dir="rtl".
// ---------------------------------------------------------------

export { CONTAINER, focusRing } from "./styles";

/** Small mono label, optionally numbered: "01 — Templates". */
export function Eyebrow({ index, children, className = "" }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground rtl:tracking-normal ${className}`}>
      {index && (
        <>
          <span className="text-accent">{index}</span>
          <span aria-hidden> — </span>
        </>
      )}
      {children}
    </p>
  );
}

type ButtonVariant = "solid" | "outline";

export function buttonClass(variant: ButtonVariant = "solid") {
  const base = `group inline-flex min-h-12 items-center justify-center gap-3 px-6 text-sm font-medium transition-colors duration-200 ${focusRing}`;
  return variant === "solid"
    ? `${base} bg-foreground text-background hover:bg-accent hover:text-accent-foreground`
    : `${base} border border-foreground/70 text-foreground hover:border-foreground hover:bg-foreground hover:text-background`;
}

const arrowMotion = "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5";

/** An internal call to action. */
export function ButtonLink({
  variant = "solid",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link className={`${buttonClass(variant)} ${className}`} {...props}>
      {children}
      <ArrowRight className={arrowMotion} aria-hidden />
    </Link>
  );
}

/** A link to another site (e.g. a live demo storefront on its own host). Opens in a new tab and says so. */
export function ExternalButtonLink({
  href,
  variant = "solid",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener" className={`${buttonClass(variant)} ${className}`}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden />
    </a>
  );
}

export const textLink = `underline decoration-foreground/30 underline-offset-[6px] transition-colors hover:decoration-foreground ${focusRing}`;

/** Quiet inline arrow link ("Read the platform story →"). */
export function ArrowLink({ className = "", children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link className={`group inline-flex items-center gap-2 text-sm font-medium ${textLink} ${className}`} {...props}>
      {children}
      <ArrowRight className={arrowMotion} aria-hidden />
    </Link>
  );
}

/** A band painted with the ink (dark) studio tokens. */
export function InkBand({ className = "", children, ...props }: ComponentProps<"section">) {
  return (
    <section style={studioCssVariables("ink") as CSSProperties} className={`bg-background text-foreground ${className}`} {...props}>
      {children}
    </section>
  );
}

/** Section heading block: numbered eyebrow, display headline and optional lede. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  lede,
  id,
  className = "",
  as: Heading = "h2",
}: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  id?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={className}>
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <Heading id={id} className="mt-5 max-w-4xl text-balance font-heading text-4xl leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl rtl:tracking-normal">
        {title}
      </Heading>
      {lede && <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{lede}</p>}
    </div>
  );
}

/** The page's <main>, the skip link's target. */
export function StudioMain({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      {children}
    </main>
  );
}

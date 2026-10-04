import Link from "next/link";
import { Fragment, type ComponentProps, type CSSProperties, type ElementType, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { studioCssVariables, type StudioTone } from "@/lib/platform/showcase";
import { focusRing } from "./styles";

// ---------------------------------------------------------------
// BUSINESS SITE PRIMITIVES. The platform's public site styles itself with
// the same semantic roles storefronts use (bg-background, text-foreground,
// border-border, text-accent, font-heading …); the values come from
// studioCssVariables(): night for the canvas, ink and paper for bands.
// Layout uses logical properties so it mirrors correctly under dir="rtl".
// ---------------------------------------------------------------

export { CONTAINER, focusRing } from "./styles";

/** Wide-tracked mono label, optionally numbered: "01 / Work". */
export function Eyebrow({ index, children, className = "" }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal ${className}`}>
      {index && (
        <>
          <span className="text-accent">{index}</span>
          <span aria-hidden className="mx-2 inline-block h-px w-6 translate-y-[-3px] bg-border align-middle" />
        </>
      )}
      {children}
    </p>
  );
}

type ButtonVariant = "solid" | "outline" | "light";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  solid: "bg-accent text-accent-foreground hover:brightness-110",
  outline: "border border-foreground/30 text-foreground hover:border-foreground hover:bg-foreground/[0.06]",
  light: "bg-foreground text-background hover:bg-accent hover:text-accent-foreground",
};

export function buttonClass(variant: ButtonVariant = "solid") {
  return `studio-shine group relative inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden rounded-md px-6 text-sm font-medium transition-[background-color,color,border-color,transform,filter] duration-300 active:scale-[0.98] ${focusRing} ${BUTTON_VARIANTS[variant]}`;
}

const arrowMotion = "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1";

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

/** A link to a live demo store on its own host. Opens in a new tab and says so. */
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
      <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
    </a>
  );
}

export const textLink = `underline decoration-foreground/30 underline-offset-[6px] transition-colors hover:decoration-accent ${focusRing}`;

/** Quiet inline arrow link ("See the platform →"). */
export function ArrowLink({ className = "", children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link className={`group inline-flex min-h-11 items-center gap-2 text-sm font-medium ${textLink} ${className}`} {...props}>
      {children}
      <ArrowRight className={arrowMotion} aria-hidden />
    </Link>
  );
}

/** A section painted with one of the studio tones. */
export function Tone({
  tone,
  as: Element = "section",
  className = "",
  style,
  children,
  ...props
}: { tone: StudioTone; as?: ElementType; className?: string; style?: CSSProperties; children: ReactNode } & Omit<ComponentProps<"section">, "style">) {
  return (
    <Element style={{ ...studioCssVariables(tone), ...style } as CSSProperties} className={`bg-background text-foreground ${className}`} {...props}>
      {children}
    </Element>
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
  align = "start",
}: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  id?: string;
  className?: string;
  as?: "h1" | "h2";
  align?: "start" | "center";
}) {
  const centered = align === "center";
  return (
    <div data-reveal className={`${centered ? "mx-auto text-center" : ""} ${className}`}>
      <Eyebrow index={index} className={centered ? "justify-center" : ""}>
        {eyebrow}
      </Eyebrow>
      <Heading
        id={id}
        className={`mt-6 max-w-4xl text-balance font-heading text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl rtl:tracking-normal ${centered ? "mx-auto" : ""}`}
      >
        {title}
      </Heading>
      {lede && (
        <p className={`mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg ${centered ? "mx-auto" : ""}`}>{lede}</p>
      )}
    </div>
  );
}

/**
 * A headline whose words rise out of a soft blur on load (hero only — it
 * is always in the first viewport). Screen readers get the plain sentence.
 */
export function SplitWords({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            {index > 0 && " "}
            <span className="studio-word" style={{ "--i": index } as CSSProperties}>
              {word}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
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

// Noor's language: symmetry, the semicircular arch, fine double rules and
// slow, quiet motion. Arches are pure CSS: a top radius of "full" on a
// portrait box is clamped to a perfect semicircle, so the frame and the
// image inside it share one centre. Letter-spacing is removed under
// dir="rtl"; transitions collapse under prefers-reduced-motion
// (app/globals.css).

export const NOOR_CONTAINER = "mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-12";

/** Arch frame: a fine rule around an arched window, then the arched image inside it. */
export const noorArchFrame = "rounded-t-full border border-border p-1.5 sm:p-2";
export const noorArch = "overflow-hidden rounded-t-full bg-muted";

const quiet =
  "transition duration-500 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const noorButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-foreground px-7 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${quiet}`;
export const noorAccentButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-7 text-sm font-medium text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${quiet}`;
export const noorOutlineButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-foreground/30 px-7 text-sm font-medium text-foreground hover:border-foreground ${quiet}`;
/** The card's add button: a quiet outlined pill. */
export const noorCardButton = `inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-control border border-border px-3 text-sm font-medium text-foreground hover:border-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 ${quiet}`;

export const noorEyebrow = "text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase rtl:tracking-normal";
export const noorLink = `underline decoration-current/30 underline-offset-[6px] hover:decoration-current ${quiet}`;
export const noorTitle = "font-heading text-3xl leading-tight sm:text-4xl";

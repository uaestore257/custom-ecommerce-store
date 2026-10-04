// Market's control language: practical, compact and high-contrast, with
// the store's accent on the actions that matter (add, steppers, prices).
// Motion is functional only and dropped under prefers-reduced-motion.

export const MARKET_CONTAINER = "mx-auto w-full max-w-[90rem] px-3 sm:px-5 lg:px-8";

const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The main action: a solid accent block. */
export const marketButton = `inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-bold text-accent-foreground transition-[filter] duration-150 hover:brightness-95 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

/** The compact add button on cards. */
export const marketAddButton = `flex min-h-10 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-2 text-sm font-bold text-accent-foreground transition-[filter] duration-150 hover:brightness-95 motion-reduce:transition-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${focus}`;

export const marketSectionTitle = "font-heading text-lg font-extrabold tracking-tight sm:text-xl";

export const marketLink = `font-semibold text-accent underline-offset-4 hover:underline ${focus}`;

export function marketChip(active: boolean) {
  return `flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none ${focus} ${
    active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:border-accent"
  }`;
}

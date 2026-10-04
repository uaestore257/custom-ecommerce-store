import type { ThemeSelection } from "@/lib/templates/types";

// Kinetic's control and surface language. Hard edges (2px foreground
// borders), quick, pressable motion, and the accent used as a surface.
// Every transform is dropped under prefers-reduced-motion; letter-spacing
// is removed under dir="rtl" because tracking breaks Arabic joining.

export const KINETIC_CONTAINER = "mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-10";

const press =
  "transition duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

/** Primary action: an accent block with a hard ink edge. */
export const kineticButton = `inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-foreground bg-accent px-6 text-sm font-bold text-accent-foreground hover:brightness-95 ${press}`;

/** Action on an accent surface, where an accent button would disappear. */
export const kineticInkButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-control border-2 border-foreground bg-foreground px-6 text-sm font-bold text-background hover:opacity-90 ${press}`;

/** Secondary action. */
export const kineticOutlineButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-control border-2 border-current px-6 text-sm font-bold hover:bg-foreground hover:text-background ${press}`;

/** The quick-add bar attached to the bottom edge of a product card. */
export const kineticQuickAdd = `flex min-h-11 w-full items-center justify-center gap-2 border-t-2 border-foreground bg-background px-2 text-sm font-bold text-foreground hover:bg-accent hover:text-accent-foreground ${press} active:scale-100`;

export const kineticEyebrow = "text-xs font-bold uppercase tracking-[0.12em] rtl:tracking-normal";

export function kineticChip(active: boolean) {
  return `flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-control border-2 px-4 text-sm font-semibold ${press} ${
    active ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:border-foreground"
  }`;
}

/**
 * The colour-block surface for hero and brand sections (theme option
 * "accentSurface"): the full accent with its readable foreground, or a
 * light wash of it under the normal ink.
 */
export function accentBlock(theme: ThemeSelection) {
  return theme.accentSurface === "tint"
    ? { surface: "bg-accent/15 text-foreground", quiet: "text-muted-foreground" }
    : { surface: "bg-accent text-accent-foreground", quiet: "text-accent-foreground/80" };
}

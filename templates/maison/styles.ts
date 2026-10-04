// Maison's control and type language: ink/ivory blocks, hairline (1px)
// rules, tracked uppercase labels and slow, quiet motion. Letter-spacing is
// removed under dir="rtl" (tracking breaks Arabic joining) and every
// transition is dropped under prefers-reduced-motion.

export const MAISON_CONTAINER = "mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12";

/**
 * The campaign field: always ink with ivory type, whichever palette the
 * store uses, so the transparent header and hero text stay legible over
 * photography. Template constants, never store data.
 */
export const MAISON_CAMPAIGN = "bg-[#0c0b0a] text-[#f4efe6]";
export const MAISON_CAMPAIGN_TEXT = "text-[#f4efe6]";

const quiet =
  "transition duration-500 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const maisonLabel = "text-[11px] font-medium uppercase tracking-[0.22em] rtl:tracking-normal";

/** The one primary action: an ink block with tracked ivory capitals. */
export const maisonButton = `inline-flex min-h-12 w-full items-center justify-center gap-2 bg-foreground px-8 text-xs font-medium uppercase tracking-[0.2em] text-background hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 rtl:tracking-normal ${quiet}`;

/** A hairline-outlined secondary action. */
export const maisonOutlineButton = `inline-flex min-h-12 items-center justify-center gap-2 border border-current px-8 text-xs font-medium uppercase tracking-[0.2em] hover:bg-foreground hover:text-background rtl:tracking-normal ${quiet}`;

export const maisonLink = `underline decoration-1 underline-offset-[6px] decoration-current/40 hover:decoration-current ${quiet}`;

export const maisonInput =
  "block w-full min-w-0 border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-0";

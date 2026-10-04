// Atelier's own button and label language. Letter-spacing is removed under
// dir="rtl" because tracking breaks the joining of Arabic script.
export const atelierButton =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 bg-foreground px-8 text-xs font-medium uppercase tracking-[0.2em] text-background transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 rtl:tracking-normal";

export const atelierOutlineButton =
  "inline-flex min-h-12 items-center justify-center gap-2 border border-foreground px-8 text-xs font-medium uppercase tracking-[0.2em] text-foreground transition hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background rtl:tracking-normal";

export const atelierEyebrow = "text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground rtl:tracking-normal";

export const atelierTextLink =
  "underline decoration-border underline-offset-[6px] transition hover:decoration-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus";

export const atelierInput =
  "block w-full min-w-0 border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-0";

export const ATELIER_CONTAINER = "mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12";

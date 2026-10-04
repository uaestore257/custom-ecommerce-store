// ---------------------------------------------------------------
// STOREFRONT OVERLAY — pure helpers (no React, no DOM access)
//
// The decisions behind the shared overlay primitive
// (components/storefront/Overlay.tsx), kept pure so they can be unit
// tested without a browser: where Tab moves inside a modal panel, which
// elements count as focusable, and how nested overlays share one body
// scroll lock.
// ---------------------------------------------------------------

/** Elements that can take keyboard focus (filtered further for visibility at run time). */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Where focus goes when Tab (or Shift+Tab) is pressed inside a modal
 * panel with `count` focusable elements, the active one at `index` (-1
 * when focus is outside the panel's focusable elements).
 *
 * Returns the index to focus, "panel" to focus the panel itself (it has
 * nothing focusable), or null to let the browser move focus normally.
 */
export function trapFocusTarget(index: number, count: number, backwards: boolean): number | "panel" | null {
  if (count <= 0) return "panel";
  if (index < 0 || index >= count) return backwards ? count - 1 : 0;
  if (backwards && index === 0) return count - 1;
  if (!backwards && index === count - 1) return 0;
  return null;
}

/**
 * One body scroll lock shared by every open overlay: the first lock saves
 * the page's overflow and hides it, the last unlock restores it. Each
 * unlock function works once, so a double cleanup cannot release another
 * overlay's lock.
 */
export function createScrollLock(style: { overflow: string }) {
  let count = 0;
  let saved = "";
  return function lock(): () => void {
    if (count === 0) {
      saved = style.overflow;
      style.overflow = "hidden";
    }
    count += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      count -= 1;
      if (count === 0) style.overflow = saved;
    };
  };
}

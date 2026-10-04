"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createScrollLock, FOCUSABLE_SELECTOR, trapFocusTarget } from "@/lib/storefront-overlay";

// ---------------------------------------------------------------
// STOREFRONT OVERLAY — shared, accessible modal surface for templates
// (cart drawers, bottom sheets, full-screen menus).
//
// The primitive owns BEHAVIOUR: dialog semantics, moving focus in and
// trapping it, Escape, closing on navigation, a body scroll lock, making
// the rest of the page inert while open, and returning focus afterwards.
// The template owns PRESENTATION: every class name (backdrop, panel,
// placement, motion) is passed in, so a template's look is entirely its
// own. overlayPanelMotion() offers the common slide-in placements.
// ---------------------------------------------------------------

let lockScroll: (() => () => void) | null = null;

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && !element.closest("[inert]") && element.getClientRects().length > 0,
  );
}

/**
 * Makes everything outside `element` inert (siblings of it and of each
 * ancestor up to <body>), skipping live regions so announcements still
 * work. Returns a function that restores exactly what it changed.
 */
function inertOutside(element: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== document.body; node = node.parentElement) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
      if (sibling.matches("script, style, template, [aria-live], next-route-announcer")) continue;
      sibling.inert = true;
      changed.push(sibling);
    }
  }
  return () => {
    for (const sibling of changed) sibling.inert = false;
  };
}

export type OverlayPlacement = "end" | "start" | "bottom" | "sheet";

/**
 * Slide-in classes for a panel. "end"/"start" are side drawers that mirror
 * under dir="rtl"; "bottom" is a bottom sheet; "sheet" is a bottom sheet
 * on small screens that becomes an end drawer from the lg breakpoint.
 * Pair with the template's own transition classes, e.g.
 * "transition-[transform,visibility] duration-300 ease-out".
 */
export function overlayPanelMotion(placement: OverlayPlacement, open: boolean): string {
  if (open) {
    return placement === "bottom" || placement === "sheet" ? "visible translate-y-0 lg:translate-x-0" : "visible translate-x-0";
  }
  switch (placement) {
    case "end":
      return "invisible translate-x-full rtl:-translate-x-full";
    case "start":
      return "invisible -translate-x-full rtl:translate-x-full";
    case "bottom":
      return "invisible translate-y-full";
    case "sheet":
      return "invisible translate-y-full lg:translate-y-0 lg:translate-x-full lg:rtl:-translate-x-full";
  }
}

export function StorefrontOverlay({
  open,
  onClose,
  label,
  initialFocusRef,
  closeOnNavigate = true,
  as: Panel = "div",
  className = "",
  backdropClassName,
  panelClassName,
  children,
}: {
  open: boolean;
  /** Called on Escape, a backdrop click, and (by default) navigation. */
  onClose: () => void;
  /** The dialog's accessible name. */
  label: string;
  /** Receives focus on open; otherwise the panel's first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnNavigate?: boolean;
  as?: "div" | "aside" | "nav";
  /** Extra classes for the fixed full-screen root (it is always `fixed inset-0 z-50`). */
  className?: string;
  backdropClassName: string;
  panelClassName: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    onCloseRef.current = onClose;
    pathnameRef.current = pathname;
  });

  // Navigating away (e.g. to checkout) closes the overlay.
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (closeOnNavigate) onCloseRef.current();
  }, [pathname, closeOnNavigate]);

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!open || !root || !panel) return;

    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const openedAt = pathnameRef.current;
    lockScroll ??= createScrollLock(document.body.style);
    const unlockScroll = lockScroll();
    const restoreInert = inertOutside(root);

    // The panel usually leaves visibility:hidden through a transition, and
    // a still-hidden element cannot take focus, so retry for a few frames.
    let frame = 0;
    let attempts = 0;
    const focusInitial = () => {
      const target = initialFocusRef?.current ?? focusableWithin(panel)[0] ?? panel;
      if (target === panel) panel.tabIndex = -1;
      target.focus({ preventScroll: true });
      if (document.activeElement !== target && attempts++ < 10) frame = requestAnimationFrame(focusInitial);
    };
    focusInitial();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(panel);
      const active = document.activeElement as HTMLElement | null;
      const target = trapFocusTarget(active ? focusable.indexOf(active) : -1, focusable.length, event.shiftKey);
      if (target === null) return;
      event.preventDefault();
      if (target === "panel") panel.focus();
      else focusable[target].focus();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      restoreInert();
      unlockScroll();
      // Back to whatever opened it, unless the page changed meanwhile.
      if (pathnameRef.current === openedAt && returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef]);

  return (
    <div ref={rootRef} className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"} ${className}`} aria-hidden={!open}>
      <div className={backdropClassName} onClick={onClose} />
      <Panel
        ref={panelRef as RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        inert={!open}
        className={panelClassName}
      >
        {children}
      </Panel>
    </div>
  );
}

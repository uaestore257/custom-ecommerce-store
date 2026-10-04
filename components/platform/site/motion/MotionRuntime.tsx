"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// ---------------------------------------------------------------
// The business site's only motion script (≈1 kB). It never renders
// anything; it wires the CSS motion system in app/globals.css:
//
//   [data-reveal]     revealed once when scrolled into view (IntersectionObserver)
//   .studio-spotlight soft light under the pointer (--mx / --my)
//   [data-tilt]       pointer-relative tilt for its .studio-tilt-layer children (--tx / --ty)
//   html[data-scrolled] header state once the page has scrolled
//
// Everything is skipped under prefers-reduced-motion; pointer effects run
// only for fine pointers; pointer work is batched into one rAF per frame.
// Elements already on screen when the runtime starts are marked shown
// before reveals are armed, so nothing visible ever blinks out.
// ---------------------------------------------------------------

export function MotionRuntime() {
  const pathname = usePathname();

  // Global listeners, once.
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => root.toggleAttribute("data-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last: PointerEvent | null = null;
    let tilted: HTMLElement | null = null;

    const apply = () => {
      frame = 0;
      const event = last;
      if (!event || !(event.target instanceof Element)) return;
      const spot = event.target.closest<HTMLElement>(".studio-spotlight");
      if (spot) {
        const rect = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        spot.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }
      const tilt = reduced.matches ? null : event.target.closest<HTMLElement>("[data-tilt]");
      if (tilted && tilted !== tilt) {
        tilted.style.removeProperty("--tx");
        tilted.style.removeProperty("--ty");
      }
      tilted = tilt;
      if (tilt) {
        const rect = tilt.getBoundingClientRect();
        tilt.style.setProperty("--tx", ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
        tilt.style.setProperty("--ty", ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      last = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointermove", onPointer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Reveals, re-armed for each page (client navigation brings new elements).
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      root.removeAttribute("data-motion-ready");
      return;
    }
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])"));
    const viewport = window.innerHeight;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.top < viewport && rect.bottom > 0) element.setAttribute("data-shown", "");
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    for (const element of elements) if (!element.hasAttribute("data-shown")) observer.observe(element);
    root.setAttribute("data-motion-ready", "");
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

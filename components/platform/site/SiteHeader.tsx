"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { CONTAINER, focusRing } from "./styles";

export interface SiteNavItem {
  href: string;
  label: string;
}

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The business site's header. Transparent over the hero, it gains a
 * blurred surface once the page scrolls (html[data-scrolled], set by the
 * motion runtime). Below lg the links move into a full-height disclosure
 * panel (button + aria-expanded/aria-controls; inert while closed) that
 * closes on Escape and on navigation.
 */
export function SiteHeader({ platformName, items }: { platformName: string; items: readonly SiteNavItem[] }) {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname; // closes automatically when the page changes

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFor(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header data-open={open || undefined} className="studio-header fixed inset-x-0 top-0 z-50 border-b">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-6 lg:h-20`}>
        <Link href="/" className={`group flex min-w-0 items-center gap-3 ${focusRing}`}>
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center border border-accent/60 font-heading text-lg leading-none text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            {platformName.trim().charAt(0).toUpperCase() || "U"}
          </span>
          <span className="truncate font-heading text-2xl leading-none tracking-tight rtl:tracking-normal">{platformName}</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {items.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`group relative inline-flex min-h-11 items-center text-sm transition-colors hover:text-foreground ${focusRing} ${
                      current ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 bottom-2 h-px origin-left bg-accent transition-transform duration-300 rtl:origin-right ${
                        current ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-7 lg:flex">
          <Link href="/login" className={`inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}>
            Sign in
          </Link>
          <Link
            href="/contact"
            className={`studio-shine group relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] ${focusRing}`}
          >
            Start a project
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
          </Link>
        </div>

        <button
          type="button"
          className={`-me-2 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 font-mono text-xs uppercase tracking-[0.18em] lg:hidden rtl:tracking-normal ${focusRing}`}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpenFor(open ? null : pathname)}
        >
          {open ? "Close" : "Menu"}
          {open ? <X className="h-5 w-5" strokeWidth={1.5} aria-hidden /> : <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
        </button>
      </div>

      <div
        id="site-menu"
        inert={!open}
        className={`studio-menu fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-background lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <nav aria-label="Main" className="px-5 pb-10 pt-6 sm:px-8">
          <ul>
            {[{ href: "/", label: "Home" }, ...items, { href: "/contact", label: "Contact" }].map((item, index) => (
              <li key={item.href} className="studio-menu-item border-b border-border" style={{ "--i": index } as CSSProperties}>
                <Link
                  href={item.href}
                  onClick={() => setOpenFor(null)}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                  className={`flex min-h-16 items-center justify-between font-heading text-4xl aria-[current=page]:text-accent ${focusRing}`}
                >
                  {item.label}
                  <ArrowRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="studio-menu-item mt-10 flex flex-col gap-3" style={{ "--i": items.length + 2 } as CSSProperties}>
            <Link href="/contact" className={`inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground ${focusRing}`}>
              Start a project
            </Link>
            <Link href="/login" className={`inline-flex min-h-12 items-center justify-center rounded-md border border-border text-sm ${focusRing}`}>
              Store owner sign in
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

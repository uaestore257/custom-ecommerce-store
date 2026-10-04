"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { CONTAINER, focusRing } from "./styles";

export interface SiteNavItem {
  href: string;
  label: string;
}

function isCurrent(pathname: string, href: string) {
  return !href.includes("#") && (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
}

/**
 * The business site's header: wordmark, primary links, a quiet sign-in
 * link and the "Start a project" call to action. Below md the links move
 * into a disclosure panel (button + aria-expanded/aria-controls) that
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
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const link = (href: string) =>
    `relative py-2 text-sm transition-colors hover:text-foreground ${focusRing} ${
      isCurrent(pathname, href) ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-foreground" : "text-muted-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-background">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]`}>
        <Link href="/" className={`min-w-0 truncate font-heading text-2xl leading-none tracking-tight rtl:tracking-normal ${focusRing}`}>
          {platformName}
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link(item.href)} aria-current={isCurrent(pathname, item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <Link href="/login" className={`text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}>
            Sign in
          </Link>
          <Link
            href="/contact"
            className={`inline-flex min-h-10 items-center gap-2 bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Start a project
          </Link>
        </div>

        <button
          type="button"
          className={`-me-2 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 font-mono text-xs uppercase tracking-[0.16em] md:hidden rtl:tracking-normal ${focusRing}`}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpenFor(open ? null : pathname)}
        >
          {open ? "Close" : "Menu"}
          {open ? <X className="h-5 w-5" strokeWidth={1.5} aria-hidden /> : <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
        </button>
      </div>

      <div id="site-menu" hidden={!open} className="border-t border-border bg-background md:hidden">
        <nav aria-label="Main" className="px-5 pb-8 pt-4 sm:px-8">
          <ul>
            {[{ href: "/", label: "Home" }, ...items].map((item) => (
              <li key={item.href} className="border-b border-border">
                <Link
                  href={item.href}
                  onClick={() => setOpenFor(null)}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                  className={`flex min-h-14 items-center justify-between font-heading text-3xl ${focusRing}`}
                >
                  {item.label}
                  <ArrowRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/contact"
              className={`inline-flex min-h-12 items-center justify-center bg-foreground px-6 text-sm font-medium text-background ${focusRing}`}
            >
              Start a project
            </Link>
            <Link href="/login" className={`inline-flex min-h-12 items-center justify-center border border-border text-sm ${focusRing}`}>
              Store owner sign in
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

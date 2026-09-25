"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { StoreLogo } from "@/components/StoreLogo";
import type { Store } from "@/lib/types";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader({ store, cartCount }: { store: Store; cartCount: number }) {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  // The mobile menu closes automatically when the page changes.
  const menuOpen = openFor === pathname;

  const linkClass = (href: string) =>
    `rounded px-1 py-1 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
      isActive(pathname, href) ? "text-brand" : ""
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <StoreLogo store={store} size="sm" />
          <span className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {store.name}
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm font-medium text-slate-600">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={linkClass(link.href)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setOpenFor(menuOpen ? null : pathname)}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile navigation" className="border-t border-slate-200 md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2 text-base font-medium text-slate-700 sm:px-6">
            {[...navLinks, { label: "Cart", href: "/cart" }].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={`block py-3 ${linkClass(link.href)}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

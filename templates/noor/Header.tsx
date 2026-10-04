"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { overlayPanelMotion, StorefrontOverlay } from "@/components/storefront/Overlay";
import { useCartCount, useStorefrontMessages } from "@/lib/storefront";
import type { StorefrontCategory, StorefrontStore } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";
import { NOOR_CONTAINER } from "./styles";
import { useNoor } from "./useNoor";

const iconButton =
  "flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors duration-300 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus";

/**
 * The centred stack: search and cart balanced either side of a centred
 * wordmark, with the navigation as a centred row beneath it. On small
 * screens the row folds into a menu panel from the inline-start edge (the
 * shared StorefrontOverlay), so the wordmark stays centred.
 */
export function NoorHeader({ store, categories }: { store: StorefrontStore; categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const count = useCartCount();
  const shared = useStorefrontMessages();
  const { t } = useNoor();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const links = [
    { label: t.allProducts, href: "/shop" },
    ...collections.slice(0, 4).map((category) => ({ label: category.name, href: categoryPath(category) })),
    { label: t.about, href: "/about" },
    { label: t.contact, href: "/contact" },
  ];
  const cartText = t.cartLabel(shared.items(count));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className={`${NOOR_CONTAINER} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3 md:py-4`}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen} aria-label={t.menu} className={`${iconButton} md:hidden`}>
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            {/* Phones: menu ↔ cart, so the wordmark stays truly centred; search is in the menu. */}
            <Link href="/shop#listing-search" aria-label={t.search} className={`${iconButton} max-md:hidden`}>
              <Search className="h-5 w-5" aria-hidden />
            </Link>
          </div>
          <Link href="/" className="max-w-[58vw] truncate text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-focus md:max-w-md">
            <span className="font-heading text-2xl leading-tight sm:text-3xl">{store.name}</span>
          </Link>
          <div className="flex justify-end">
            <Link href="/cart" aria-label={cartText} className={`${iconButton} relative`}>
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {count > 0 && (
                <span aria-hidden className="absolute -top-0.5 end-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold tabular-nums text-accent-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </div>
        </div>

        <nav aria-label={t.mainNavigation} className="hidden border-t border-border md:block">
          <ul className={`${NOOR_CONTAINER} flex flex-wrap items-center justify-center gap-x-8 gap-y-1 py-2.5 text-sm`}>
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-block py-1 transition-colors duration-300 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${active ? "text-accent" : "text-foreground"}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Outside the header: its backdrop-filter would otherwise become the
          containing block of the fixed overlay, trapping it in the header. */}
      <StorefrontOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        label={t.menu}
        initialFocusRef={closeRef}
        as="nav"
        backdropClassName={`absolute inset-0 bg-foreground/35 transition-opacity duration-500 motion-reduce:transition-none ${menuOpen ? "opacity-100" : "opacity-0"}`}
        panelClassName={`absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col bg-surface-elevated transition-[transform,visibility] duration-500 ease-out motion-reduce:transition-none ${overlayPanelMotion("start", menuOpen)}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-heading text-xl">{store.name}</span>
          <button ref={closeRef} type="button" onClick={() => setMenuOpen(false)} aria-label={t.closeMenu} className={iconButton}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-5 py-6 text-center">
          {[{ label: t.home, href: "/" }, { label: t.allProducts, href: "/shop" }].map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block py-3 font-heading text-2xl">{link.label}</Link>
            </li>
          ))}
          {collections.length > 0 && <li aria-hidden className="mx-auto my-4 h-px w-16 bg-border" />}
          {collections.map((category) => (
            <li key={category.id}>
              <Link href={categoryPath(category)} className="block py-2.5 text-lg">{category.name}</Link>
            </li>
          ))}
          <li aria-hidden className="mx-auto my-4 h-px w-16 bg-border" />
          {[{ label: t.search, href: "/shop#listing-search" }, { label: t.about, href: "/about" }, { label: t.contact, href: "/contact" }, { label: t.cart, href: "/cart" }].map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block py-2.5 text-base text-muted-foreground">{link.label}</Link>
            </li>
          ))}
        </ul>
      </StorefrontOverlay>
    </>
  );
}

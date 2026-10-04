"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Home, LayoutGrid, Search, ShoppingCart, X } from "lucide-react";
import { overlayPanelMotion, StorefrontOverlay } from "@/components/storefront/Overlay";
import { useCart, useCartCount } from "@/lib/storefront";
import { formatStoreMoney } from "@/lib/storefront-cart";
import type { StorefrontCategory, StorefrontStore } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";
import { MARKET_SEARCH_ID } from "./Header";

const tab = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus";

/**
 * Small screens only (hidden from md): a fixed bottom tab bar — Home,
 * Categories (a bottom sheet through the shared StorefrontOverlay),
 * Search (focuses the header search) and Cart — with a running cart bar
 * above it while the cart has items.
 */
export function MarketMobileNav({ store, categories }: { store: StorefrontStore; categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const count = useCartCount();
  const view = useCart({ refreshOnMount: false });
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const aisles = categories.filter((category) => category.slug && category.productCount > 0);
  const subtotal = count > 0 && view && view.cart.lines.length > 0 ? formatStoreMoney(store, view.cart.subtotalMinor) : null;
  const showCartBar = count > 0 && pathname !== "/cart" && pathname !== "/checkout";
  const active = (match: boolean) => (match ? "text-accent" : "text-muted-foreground");

  const focusSearch = () => {
    const input = document.getElementById(MARKET_SEARCH_ID) as HTMLInputElement | null;
    window.scrollTo({ top: 0 });
    input?.focus();
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 md:hidden" data-market-mobile-nav>
        {showCartBar && (
          <div className="px-3 pb-2">
            <Link
              href="/cart"
              className="flex min-h-12 items-center justify-between gap-3 rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <span className="tabular-nums">
                {count} {count === 1 ? "item" : "items"}
                {subtotal && <span className="font-semibold opacity-85"> · {subtotal}</span>}
              </span>
              <span>View cart</span>
            </Link>
          </div>
        )}
        <nav aria-label="Shop navigation" className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
          <ul className="flex">
            <li className="flex flex-1">
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`${tab} ${active(pathname === "/")}`}>
                <Home className="h-5 w-5" aria-hidden /> Home
              </Link>
            </li>
            <li className="flex flex-1">
              <button type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} className={`${tab} ${active(sheetOpen || pathname.startsWith("/shop/"))}`}>
                <LayoutGrid className="h-5 w-5" aria-hidden /> Categories
              </button>
            </li>
            <li className="flex flex-1">
              <button type="button" onClick={focusSearch} className={`${tab} text-muted-foreground`}>
                <Search className="h-5 w-5" aria-hidden /> Search
              </button>
            </li>
            <li className="flex flex-1">
              <Link href="/cart" aria-current={pathname === "/cart" ? "page" : undefined} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`} className={`${tab} relative ${active(pathname === "/cart")}`}>
                <ShoppingCart className="h-5 w-5" aria-hidden /> Cart
                {count > 0 && (
                  <span aria-hidden className="absolute top-1.5 start-1/2 ms-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-accent-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <StorefrontOverlay
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="Categories"
        initialFocusRef={closeRef}
        backdropClassName={`absolute inset-0 bg-foreground/40 transition-opacity duration-200 motion-reduce:transition-none ${sheetOpen ? "opacity-100" : "opacity-0"}`}
        panelClassName={`absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-card bg-surface-elevated transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none ${overlayPanelMotion("bottom", sheetOpen)}`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-heading text-lg font-extrabold">Categories</p>
          <button ref={closeRef} type="button" onClick={() => setSheetOpen(false)} aria-label="Close categories" className="flex h-10 w-10 items-center justify-center rounded-control hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <li>
            <Link href="/shop" className="flex min-h-12 items-center justify-between rounded-control px-3 font-semibold hover:bg-muted">All products</Link>
          </li>
          {aisles.map((category) => (
            <li key={category.id}>
              <Link href={categoryPath(category)} className="flex min-h-12 items-center justify-between rounded-control px-3 font-semibold hover:bg-muted">
                {category.name}
                <span className="text-sm font-normal tabular-nums text-muted-foreground">{category.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </StorefrontOverlay>
    </>
  );
}

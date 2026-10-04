"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart } from "lucide-react";
import { StoreLogo } from "@/components/StoreLogo";
import { useCart, useCartCount } from "@/lib/storefront";
import { formatStoreMoney } from "@/lib/storefront-cart";
import type { StorefrontCategory, StorefrontStore } from "@/lib/storefront-types";
import { categoryPath, LISTING_MAX_QUERY_LENGTH } from "@/lib/storefront-urls";
import { MARKET_CONTAINER, marketChip } from "./styles";

export const MARKET_SEARCH_ID = "market-search";

/**
 * Search-first header: brand, a large search field that stays visible on
 * every screen (a plain GET form to /shop — works without JavaScript) and
 * the cart with its running total; below it, the category bar (a
 * horizontal scroller on small screens).
 */
export function MarketHeader({ store, categories }: { store: StorefrontStore; categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const count = useCartCount();
  const view = useCart({ refreshOnMount: false });
  const subtotal = count > 0 && view && view.cart.lines.length > 0 ? formatStoreMoney(store, view.cart.subtotalMinor) : null;
  const aisles = categories.filter((category) => category.slug && category.productCount > 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className={`${MARKET_CONTAINER} flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 md:flex-nowrap md:py-3`}>
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <StoreLogo store={store} size="sm" />
          <span className="max-w-[60vw] truncate font-heading text-lg font-extrabold tracking-tight md:max-w-[16rem]">{store.name}</span>
        </Link>

        <form action="/shop" method="get" role="search" className="relative order-3 w-full md:order-none md:flex-1">
          <label htmlFor={MARKET_SEARCH_ID} className="sr-only">Search products</label>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id={MARKET_SEARCH_ID}
            type="search"
            name="q"
            maxLength={LISTING_MAX_QUERY_LENGTH}
            placeholder={`Search ${store.name}`}
            className="block min-h-12 w-full min-w-0 rounded-control border border-border bg-muted ps-11 pe-4 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </form>

        <Link
          href="/cart"
          aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}${subtotal ? `, ${subtotal}` : ""}`}
          className="ms-auto flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-accent px-3.5 text-sm font-bold text-accent-foreground hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 md:ms-0"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          <span className="tabular-nums">{count > 99 ? "99+" : count}</span>
          {subtotal && <span className="hidden border-s border-accent-foreground/30 ps-2 tabular-nums lg:inline">{subtotal}</span>}
        </Link>
      </div>

      {aisles.length > 0 && (
        <nav aria-label="Categories" className="border-t border-border">
          <ul className={`${MARKET_CONTAINER} flex gap-2 overflow-x-auto py-2 [scrollbar-width:none]`}>
            <li className="shrink-0">
              <Link href="/shop" aria-current={pathname === "/shop" ? "page" : undefined} className={marketChip(pathname === "/shop")}>All products</Link>
            </li>
            {aisles.map((category) => {
              const href = categoryPath(category);
              return (
                <li key={category.id} className="shrink-0">
                  <Link href={href} aria-current={pathname === href ? "page" : undefined} className={marketChip(pathname === href)}>{category.name}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}

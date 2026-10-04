"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import { StoreLogo } from "@/components/StoreLogo";
import { useCartCount } from "@/lib/storefront";
import type { StorefrontCategory, StorefrontStore } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";
import { KINETIC_CONTAINER, kineticChip } from "./styles";

const PAGES = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/**
 * Compact sticky bar (brand, pages, search, cart) over a horizontally
 * scrolling category chip rail. The rail is the primary navigation on
 * every screen size; the cart button opens the sheet/drawer.
 */
export function KineticHeader({ store, categories }: { store: StorefrontStore; categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const { show } = useCartDrawer();
  const chips = [
    { id: "all", name: "All products", href: "/shop" },
    ...categories.filter((category) => category.slug && category.productCount > 0).map((category) => ({ id: category.id, name: category.name, href: categoryPath(category) })),
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
      <div className={`${KINETIC_CONTAINER} flex h-14 items-center gap-4`}>
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <StoreLogo store={store} size="sm" />
          <span className="truncate font-heading text-lg font-extrabold tracking-tight sm:text-xl">{store.name}</span>
        </Link>

        <nav aria-label="Main navigation" className="ms-auto hidden md:block">
          <ul className="flex items-center gap-6 text-sm font-semibold">
            {PAGES.map((page) => {
              const active = pathname === page.href;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    aria-current={active ? "page" : undefined}
                    className={`underline-offset-[6px] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${active ? "underline decoration-2" : ""}`}
                  >
                    {page.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2 md:ms-2">
          <Link
            href="/shop#listing-search"
            aria-label="Search products"
            className="flex h-10 w-10 items-center justify-center rounded-control hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={show}
            aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className="flex h-10 items-center gap-2 rounded-control border-2 border-foreground bg-accent px-3 text-sm font-bold text-accent-foreground transition duration-150 active:scale-[0.97] motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            <span className="tabular-nums">{cartCount > 99 ? "99+" : cartCount}</span>
          </button>
        </div>
      </div>

      <nav aria-label="Categories" className="border-t border-border">
        <ul className={`${KINETIC_CONTAINER} flex gap-2 overflow-x-auto py-2 [scrollbar-width:none]`}>
          {chips.map((chip) => {
            const active = pathname === chip.href;
            return (
              <li key={chip.id} className="shrink-0">
                <Link href={chip.href} aria-current={active ? "page" : undefined} className={`${kineticChip(active)} min-h-9`}>
                  {chip.name}
                </Link>
              </li>
            );
          })}
          <li className="shrink-0 md:hidden">
            <Link href="/about" className={`${kineticChip(pathname === "/about")} min-h-9`}>About</Link>
          </li>
          <li className="shrink-0 md:hidden">
            <Link href="/contact" className={`${kineticChip(pathname === "/contact")} min-h-9`}>Contact</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

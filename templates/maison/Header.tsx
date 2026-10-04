"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import { StorefrontOverlay } from "@/components/storefront/Overlay";
import { useCartCount } from "@/lib/storefront";
import type { StorefrontCategory, StorefrontStore } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";
import { MAISON_CAMPAIGN_TEXT, MAISON_CONTAINER, maisonLabel } from "./styles";

const navText = `${maisonLabel} whitespace-nowrap transition-opacity duration-500 hover:opacity-60 motion-reduce:transition-none focus:outline-none focus-visible:ring-1 focus-visible:ring-current`;

/**
 * A centred wordmark between "Menu" and the bag. On the homepage it floats
 * transparent over the campaign hero (ivory type) until the page scrolls,
 * then settles into a solid bar with a hairline rule. "Menu" opens a
 * full-screen overlay (the shared StorefrontOverlay) listing the
 * collections in large display type.
 */
export function MaisonHeader({ store, categories }: { store: StorefrontStore; categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const { show } = useCartDrawer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const overHero = pathname === "/" && !scrolled;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <>
      <header
        data-over-hero={overHero}
        className={`sticky top-0 z-40 border-b transition-colors duration-500 motion-reduce:transition-none ${
          overHero ? `border-transparent bg-transparent ${MAISON_CAMPAIGN_TEXT}` : "border-border bg-background text-foreground"
        }`}
      >
        <div className={`${MAISON_CONTAINER} grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-20`}>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className={`-ms-2 min-h-11 px-2 ${navText}`}
            >
              Menu
            </button>
          </div>
          <Link href="/" className="max-w-[50vw] truncate text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-current">
            <span className="font-heading text-base font-medium uppercase tracking-[0.22em] sm:text-2xl sm:tracking-[0.42em] rtl:tracking-normal">{store.name}</span>
          </Link>
          <div className="flex items-center justify-end gap-6">
            <Link href="/shop#listing-search" className={`hidden sm:inline-block ${navText}`}>Search</Link>
            <button type="button" onClick={show} className={`min-h-11 ${navText}`} aria-label={`Open bag, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}>
              Bag ({cartCount > 99 ? "99+" : cartCount})
            </button>
          </div>
        </div>
      </header>

      <StorefrontOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        label="Menu"
        initialFocusRef={closeRef}
        as="nav"
        backdropClassName="absolute inset-0"
        panelClassName={`absolute inset-0 flex flex-col overflow-y-auto bg-background text-foreground transition-[opacity,visibility] duration-500 ease-out motion-reduce:transition-none ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className={`${MAISON_CONTAINER} grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-20`}>
          <div className="flex items-center">
            <button ref={closeRef} type="button" onClick={() => setMenuOpen(false)} className={`-ms-2 inline-flex min-h-11 items-center gap-2 px-2 ${navText}`}>
              <X className="h-4 w-4" aria-hidden /> Close
            </button>
          </div>
          <span className="max-w-[50vw] truncate text-center font-heading text-base font-medium uppercase tracking-[0.22em] sm:text-2xl sm:tracking-[0.42em] rtl:tracking-normal">{store.name}</span>
          <span aria-hidden />
        </div>
        <div className={`${MAISON_CONTAINER} grid flex-1 content-center gap-12 border-t border-border py-12 lg:grid-cols-12`}>
          <div className="lg:col-span-8">
            <p className={`${maisonLabel} text-muted-foreground`}>The collections</p>
            <ul className="mt-6 space-y-1">
              <li>
                <Link href="/shop" className="font-heading text-4xl leading-tight hover:italic sm:text-6xl">All</Link>
              </li>
              {collections.map((category) => (
                <li key={category.id}>
                  <Link href={categoryPath(category)} className="font-heading text-4xl leading-tight hover:italic sm:text-6xl">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-4 lg:col-span-4 lg:self-end">
            {[
              ["The house", "/about"],
              ["Client service", "/contact"],
              ["Search", "/shop#listing-search"],
              ["Bag", "/cart"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className={navText}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </StorefrontOverlay>
    </>
  );
}

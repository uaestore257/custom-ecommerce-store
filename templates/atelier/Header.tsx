"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useCartCount } from "@/lib/storefront";
import type { StorefrontCategory, StorefrontStore } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import { ATELIER_CONTAINER, atelierEyebrow } from "./styles";

const navLink =
  "text-xs uppercase tracking-[0.2em] text-foreground transition hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rtl:tracking-normal";

/**
 * Editorial split navigation: collections and pages on the inline-start
 * side, a centred wordmark, and search / bag on the inline-end side. The
 * collection panel is a numbered index, not a mega-menu of thumbnails.
 */
export function AtelierHeader({ store, categories }: { store: StorefrontStore; categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const { show } = useCartDrawer();
  const [panel, setPanel] = useState<{ kind: "collections" | "menu"; path: string } | null>(null);
  const open = panel && panel.path === pathname ? panel.kind : null; // closes on navigation
  const collections = categories.filter((category) => category.slug && category.productCount > 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (kind: "collections" | "menu") => setPanel(open === kind ? null : { kind, path: pathname });
  const bagLabel = `Bag (${cartCount > 99 ? "99+" : cartCount})`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className={`${ATELIER_CONTAINER} grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-20`}>
        <nav aria-label="Main navigation" className="flex items-center gap-8">
          <button
            type="button"
            className="-ms-2 p-2 lg:hidden"
            aria-expanded={open === "menu"}
            aria-controls="atelier-menu"
            aria-label={open === "menu" ? "Close menu" : "Open menu"}
            onClick={() => toggle("menu")}
          >
            {open === "menu" ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
          {collections.length > 0 && (
            <button
              type="button"
              className={`hidden lg:inline-block ${navLink}`}
              aria-expanded={open === "collections"}
              aria-controls="atelier-collections"
              onClick={() => toggle("collections")}
            >
              Collections
            </button>
          )}
          <Link href="/shop" className={`hidden lg:inline-block ${navLink}`}>All pieces</Link>
          <Link href="/about" className={`hidden lg:inline-block ${navLink}`}>Atelier</Link>
        </nav>

        <Link href="/" className="max-w-[58vw] truncate text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <span className="font-heading text-base font-medium uppercase tracking-[0.14em] sm:text-2xl sm:tracking-[0.28em] rtl:tracking-normal">{store.name}</span>
        </Link>

        <div className="flex items-center justify-end gap-8">
          <Link href="/shop#listing-search" className={`hidden lg:inline-block ${navLink}`}>Search</Link>
          <Link href="/contact" className={`hidden lg:inline-block ${navLink}`}>Contact</Link>
          <button type="button" onClick={show} className={navLink} aria-label={`Open bag, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}>
            {bagLabel}
          </button>
        </div>
      </div>

      {open === "collections" && (
        <div id="atelier-collections" className="hidden border-t border-border bg-surface-elevated lg:block">
          <div className={`${ATELIER_CONTAINER} grid grid-cols-12 gap-8 py-10`}>
            <p className={`col-span-3 ${atelierEyebrow}`}>The collection</p>
            <ol className="col-span-9 grid grid-cols-2 gap-x-12">
              {collections.map((category, index) => (
                <li key={category.id} className="border-b border-border">
                  <Link href={categoryPath(category)} className="flex items-baseline gap-5 py-4 hover:opacity-60">
                    <span className="w-6 text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-heading text-2xl">{category.name}</span>
                    <span className="ms-auto text-xs text-muted-foreground">{category.productCount}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {open === "menu" && (
        <nav id="atelier-menu" aria-label="Mobile navigation" className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background lg:hidden">
          <div className={`${ATELIER_CONTAINER} py-8`}>
            {collections.length > 0 && (
              <>
                <p className={atelierEyebrow}>The collection</p>
                <ol className="mt-4">
                  {collections.map((category, index) => (
                    <li key={category.id} className="border-b border-border">
                      <Link href={categoryPath(category)} className="flex items-baseline gap-4 py-4">
                        <span className="text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        <span className="font-heading text-3xl">{category.name}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <ul className="mt-10 space-y-5">
              {[
                ["All pieces", "/shop"],
                ["Atelier", "/about"],
                ["Contact", "/contact"],
                ["Bag", "/cart"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className={navLink}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}

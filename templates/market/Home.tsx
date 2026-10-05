import Link from "next/link";
import { ChevronRight, Package, ShoppingBasket } from "lucide-react";
import { CategoryImage } from "@/components/CategoryImage";
import { SfEmptyState, SfLinkButton } from "@/components/storefront/primitives";
import { paymentMethodLabel } from "@/lib/config";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateHomeProps } from "../types";
import { MARKET_GRID, MarketProductCard } from "./ProductCard";
import { MARKET_CONTAINER, marketLink, marketSectionTitle } from "./styles";

/**
 * No marketing hero: a compact band with the store's own facts, a category
 * grid, then one SHELF per category (loaded by the shared core from this
 * template's `homepageShelves` declaration), and featured products as a
 * fallback when there are no shelves.
 */
export function MarketHome({ store, categories, featured, shelves }: TemplateHomeProps) {
  const aisles = categories.filter((category) => category.slug && category.productCount > 0);
  const facts = [
    store.paymentMethods.length > 0 ? `Pay by ${store.paymentMethods.map((id) => paymentMethodLabel(id)).join(", ")}` : null,
    `Prices in ${store.currency}`,
    "Delivery or pickup at checkout",
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <main className="pb-6">
      <section aria-labelledby="market-intro" className="border-b border-border bg-surface">
        <div className={`${MARKET_CONTAINER} flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between`}>
          <div className="min-w-0">
            <h1 id="market-intro" className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">{store.heroTitle || store.name}</h1>
            {(store.tagline || store.heroText) && <p className="mt-0.5 text-sm text-muted-foreground">{store.tagline || store.heroText}</p>}
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Store information">
            {facts.map((fact) => (
              <li key={fact} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">{fact}</li>
            ))}
          </ul>
        </div>
      </section>

      {aisles.length > 0 && (
        <section aria-labelledby="market-categories" className={`${MARKET_CONTAINER} pt-5`}>
          <h2 id="market-categories" className={marketSectionTitle}>Shop by category</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {aisles.map((category) => (
              <li key={category.id}>
                <Link href={categoryPath(category)} className="group flex h-full flex-col items-center gap-1.5 rounded-card border border-border bg-surface p-2 text-center hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  <CategoryImage src={category.imageUrl} alt="" className="aspect-square w-full rounded-control" />
                  <span className="line-clamp-2 text-xs font-bold leading-tight sm:text-sm">{category.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shelves.map(({ category, products }) => (
        <section key={category.id} aria-labelledby={`shelf-${category.id}`} data-shelf={category.id} className={`${MARKET_CONTAINER} pt-6`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 id={`shelf-${category.id}`} className={marketSectionTitle}>{category.name}</h2>
            <Link href={categoryPath(category)} className={`inline-flex shrink-0 items-center gap-0.5 text-sm ${marketLink}`}>
              See all {category.productCount} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
          <ul className="relative -mx-3 mt-3 flex snap-x scroll-px-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-5 sm:scroll-px-5 sm:gap-3 sm:px-5 lg:-mx-8 lg:scroll-px-8 lg:px-8">
            {products.map((product) => (
              <li key={product.id} className="w-[44%] shrink-0 snap-start sm:w-48">
                <MarketProductCard product={product} store={store} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {featured.length > 0 && (
        <section aria-labelledby="market-featured" className={`${MARKET_CONTAINER} pt-6`}>
          <h2 id="market-featured" className={marketSectionTitle}>Featured</h2>
          <ul className={`mt-3 ${MARKET_GRID}`}>
            {/* Below the shelves it is a short row; without shelves it is the main grid. */}
            {(shelves.length > 0 ? featured.slice(0, 6) : featured).map((product) => (
              <li key={product.id} className="min-w-0">
                <MarketProductCard product={product} store={store} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {aisles.length === 0 && featured.length === 0 && (
        <div className={`${MARKET_CONTAINER} pt-8`}>
          <SfEmptyState icon={ShoppingBasket} title="Nothing on the shelves yet" description="Products will appear here as soon as the store adds them." action={<SfLinkButton href="/contact" variant="secondary">Contact the store</SfLinkButton>} />
        </div>
      )}

      <section aria-label="Delivery and help" className={`${MARKET_CONTAINER} pt-8`}>
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm"><Package className="h-5 w-5 shrink-0 text-accent" aria-hidden /> Delivery charges are shown on every product; pickup-only items are collected from {store.name}.</p>
          <Link href="/contact" className={`shrink-0 text-sm ${marketLink}`}>Need help?</Link>
        </div>
      </section>
    </main>
  );
}

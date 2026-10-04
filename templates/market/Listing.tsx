import Link from "next/link";
import { SearchX } from "lucide-react";
import { SortSelect } from "@/components/storefront/ListingControls";
import { Pagination } from "@/components/storefront/Pagination";
import { SfEmptyState, sfInputClass, SfLinkButton } from "@/components/storefront/primitives";
import { categoryPath, listingHref } from "@/lib/storefront-urls";
import type { TemplateListingProps } from "../types";
import { MARKET_GRID, MarketProductCard } from "./ProductCard";
import { MARKET_CONTAINER, marketChip, marketLink } from "./styles";

/**
 * A dense, filterable aisle. Search is the header's (always visible);
 * here: the category chips, sort and the count.
 */
export function MarketListing({ store, categories, listing }: TemplateListingProps) {
  const basePath = categoryPath(listing.category);
  const chips = [{ id: "all", name: "All", slug: "" }, ...categories.filter((c) => c.slug && c.productCount > 0)];
  const activeId = listing.category?.id ?? "all";

  return (
    <main className={`${MARKET_CONTAINER} py-4 sm:py-6`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            {listing.query.q ? `Results for “${listing.query.q}”` : (listing.category?.name ?? "All products")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
            {listing.total} {listing.total === 1 ? "product" : "products"}
            {listing.query.q && (
              <>
                {" · "}
                <Link href={listingHref(basePath, { sort: listing.query.sort })} className={marketLink}>Clear search</Link>
              </>
            )}
          </p>
        </div>
        <SortSelect basePath={basePath} query={listing.query} className={`${sfInputClass()} w-[10rem] sm:w-48`} />
      </div>

      <nav aria-label="Filter by category" className="-mx-3 mt-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {chips.map((chip) => (
            <li key={chip.id} className="shrink-0">
              <Link
                href={listingHref(categoryPath(chip.slug ? chip : null), { sort: listing.query.sort, q: listing.query.q })}
                aria-current={activeId === chip.id ? "page" : undefined}
                className={marketChip(activeId === chip.id)}
              >
                {chip.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {listing.products.length === 0 ? (
        <div className="mt-6">
          <SfEmptyState
            icon={SearchX}
            title="No products match"
            description="Try a different search or category."
            action={<SfLinkButton href="/shop" variant="secondary">Clear filters</SfLinkButton>}
          />
        </div>
      ) : (
        <ul className={`mt-4 ${MARKET_GRID}`}>
          {listing.products.map((product) => (
            <li key={product.id} className="min-w-0">
              <MarketProductCard product={product} store={store} />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} listing={listing} className="mt-8" linkClassName={marketLink} />
    </main>
  );
}

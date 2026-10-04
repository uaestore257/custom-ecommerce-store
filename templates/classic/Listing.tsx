import Link from "next/link";
import { SearchX } from "lucide-react";
import { ListingSearch } from "@/components/storefront/ListingSearch";
import { SortSelect } from "@/components/storefront/ListingControls";
import { Pagination } from "@/components/storefront/Pagination";
import { SfEmptyState, sfInputClass, SfLinkButton } from "@/components/storefront/primitives";
import { categoryNameOf } from "@/lib/storefront-cart";
import { categoryPath, listingHref } from "@/lib/storefront-urls";
import type { TemplateListingProps } from "../types";
import { PRODUCT_GRID, ProductCard } from "./ProductCard";

export function ClassicListing({ store, categories, listing }: TemplateListingProps) {
  const basePath = categoryPath(listing.category);
  const chips = [{ id: "all", name: "All", slug: "" }, ...categories.filter((c) => c.slug && c.productCount > 0)];
  const title = listing.category?.name ?? "Shop";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:py-14">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:mt-2 sm:text-base">
        {listing.category ? `${listing.category.name} from ${store.name}.` : `Browse the full ${store.name} collection.`}
      </p>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:mt-8 sm:gap-3">
        <ListingSearch action={basePath} query={listing.query} inputClassName={sfInputClass()} />
        <SortSelect basePath={basePath} query={listing.query} className={`${sfInputClass()} w-[9.5rem] sm:w-48`} />
      </div>

      <nav
        aria-label="Categories"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {chips.map((chip) => {
          const active = (listing.category?.id ?? "all") === chip.id;
          return (
            <Link
              key={chip.id}
              href={listingHref(categoryPath(chip.slug ? chip : null), { sort: listing.query.sort })}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {chip.name}
            </Link>
          );
        })}
      </nav>

      <p className="mt-3 text-xs text-muted-foreground sm:mt-4 sm:text-sm" aria-live="polite">
        {listing.query.q ? `${listing.total} results for “${listing.query.q}”` : `${listing.total} ${listing.total === 1 ? "product" : "products"}`}
      </p>

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
        <ul className={`mt-3 sm:mt-6 ${PRODUCT_GRID}`}>
          {listing.products.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} store={store} categoryName={categoryNameOf(categories, product.categoryId)} />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} listing={listing} className="mt-10" linkClassName="font-semibold text-accent hover:underline" />
    </main>
  );
}

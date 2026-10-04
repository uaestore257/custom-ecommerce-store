import Link from "next/link";
import { SearchX } from "lucide-react";
import { ListingSearch } from "@/components/storefront/ListingSearch";
import { SortSelect } from "@/components/storefront/ListingControls";
import { Pagination } from "@/components/storefront/Pagination";
import { SfEmptyState, sfInputClass, SfLinkButton } from "@/components/storefront/primitives";
import { categoryNameOf } from "@/lib/storefront-cart";
import { categoryPath, listingHref } from "@/lib/storefront-urls";
import type { TemplateListingProps } from "../types";
import { KINETIC_GRID, KineticProductCard } from "./ProductCard";
import { KINETIC_CONTAINER, kineticChip } from "./styles";

export function KineticListing({ store, categories, listing }: TemplateListingProps) {
  const basePath = categoryPath(listing.category);
  const chips = [{ id: "all", name: "All", slug: "" }, ...categories.filter((c) => c.slug && c.productCount > 0)];
  const activeId = listing.category?.id ?? "all";

  return (
    <main className={`${KINETIC_CONTAINER} py-8 sm:py-12`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-6xl rtl:tracking-normal">{listing.category?.name ?? "All products"}</h1>
        <p className="text-sm font-semibold tabular-nums text-muted-foreground" aria-live="polite">
          {listing.query.q ? `${listing.total} results for “${listing.query.q}”` : `${listing.total} ${listing.total === 1 ? "product" : "products"}`}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3">
        <ListingSearch action={basePath} query={listing.query} inputClassName={sfInputClass()} />
        <SortSelect basePath={basePath} query={listing.query} className={`${sfInputClass()} w-[9.5rem] sm:w-48`} />
      </div>

      <nav aria-label="Filter by category" className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {chips.map((chip) => (
            <li key={chip.id} className="shrink-0">
              <Link
                href={listingHref(categoryPath(chip.slug ? chip : null), { sort: listing.query.sort })}
                aria-current={activeId === chip.id ? "page" : undefined}
                className={kineticChip(activeId === chip.id)}
              >
                {chip.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {listing.products.length === 0 ? (
        <div className="mt-8">
          <SfEmptyState
            icon={SearchX}
            title="No products match"
            description="Try a different search or category."
            action={<SfLinkButton href="/shop" variant="secondary">Clear filters</SfLinkButton>}
          />
        </div>
      ) : (
        <ul className={`mt-6 ${KINETIC_GRID}`}>
          {listing.products.map((product, index) => (
            <li key={product.id} className="min-w-0">
              <KineticProductCard
                product={product}
                store={store}
                categoryName={listing.category ? undefined : categoryNameOf(categories, product.categoryId)}
                priority={index < 2}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} listing={listing} className="mt-10" linkClassName="font-bold underline underline-offset-4" />
    </main>
  );
}

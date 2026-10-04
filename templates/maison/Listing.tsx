import Link from "next/link";
import { ListingSearch } from "@/components/storefront/ListingSearch";
import { SortSelect } from "@/components/storefront/ListingControls";
import { Pagination } from "@/components/storefront/Pagination";
import { categoryPath, listingHref } from "@/lib/storefront-urls";
import type { TemplateListingProps } from "../types";
import { MAISON_GRID, MaisonProductCard } from "./ProductCard";
import { MAISON_CONTAINER, maisonInput, maisonLabel, maisonLink } from "./styles";

export function MaisonListing({ store, categories, listing }: TemplateListingProps) {
  const basePath = categoryPath(listing.category);
  const tabs = [{ id: "all", name: "All", slug: "" }, ...categories.filter((category) => category.slug && category.productCount > 0)];
  const activeId = listing.category?.id ?? "all";

  return (
    <main className={`${MAISON_CONTAINER} py-14 lg:py-20`}>
      <header className="text-center">
        <p className={`${maisonLabel} text-muted-foreground`}>{listing.category ? "Collection" : store.name}</p>
        <h1 className="mt-4 font-heading text-5xl uppercase tracking-[0.08em] lg:text-7xl rtl:tracking-normal">{listing.category?.name ?? "The collection"}</h1>
      </header>

      <div className="mt-14 flex flex-col gap-6 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Collections" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex gap-8 whitespace-nowrap">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={listingHref(categoryPath(tab.slug ? tab : null), { sort: listing.query.sort })}
                  aria-current={activeId === tab.id ? "page" : undefined}
                  className={`${maisonLabel} transition-opacity duration-500 motion-reduce:transition-none ${
                    activeId === tab.id ? "underline underline-offset-[10px]" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 lg:w-[28rem]">
          <ListingSearch action={basePath} query={listing.query} inputClassName={maisonInput} placeholder="Search the collection" />
          <SortSelect basePath={basePath} query={listing.query} className="border-0 bg-transparent py-2 text-sm text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-focus" />
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground" aria-live="polite">
        {listing.query.q ? `${listing.total} ${listing.total === 1 ? "piece" : "pieces"} for “${listing.query.q}”` : `${listing.total} ${listing.total === 1 ? "piece" : "pieces"}`}
      </p>

      {listing.products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-heading text-3xl">Nothing here yet.</p>
          <p className="mt-3 text-sm text-muted-foreground">Try another search or collection.</p>
          <Link href="/shop" className={`mt-8 inline-block ${maisonLabel} ${maisonLink}`}>View the collection</Link>
        </div>
      ) : (
        <ul className={`mt-8 ${MAISON_GRID}`}>
          {listing.products.map((product, index) => (
            <li key={product.id}>
              <MaisonProductCard product={product} store={store} priority={index < 2} />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} listing={listing} className="mt-20 border-t border-border pt-6" linkClassName={`${maisonLabel} ${maisonLink}`} />
    </main>
  );
}

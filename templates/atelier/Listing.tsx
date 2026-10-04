import Link from "next/link";
import { ListingSearch } from "@/components/storefront/ListingSearch";
import { SortSelect } from "@/components/storefront/ListingControls";
import { Pagination } from "@/components/storefront/Pagination";
import { categoryNameOf } from "@/lib/storefront-cart";
import { categoryPath, listingHref } from "@/lib/storefront-urls";
import type { TemplateListingProps } from "../types";
import { AtelierProductCard } from "./ProductCard";
import { ATELIER_CONTAINER, atelierEyebrow, atelierInput, atelierTextLink } from "./styles";

export function AtelierListing({ store, categories, listing }: TemplateListingProps) {
  const basePath = categoryPath(listing.category);
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const tabs = [{ id: "all", name: "All pieces", slug: "" }, ...collections];
  const activeId = listing.category?.id ?? "all";

  return (
    <main className={`${ATELIER_CONTAINER} py-12 lg:py-20`}>
      <header className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className={atelierEyebrow}>{listing.category ? "Collection" : store.name}</p>
          <h1 className="mt-4 font-heading text-5xl font-normal leading-none tracking-tight lg:text-7xl">
            {listing.category?.name ?? "All pieces"}
          </h1>
        </div>
        <p className="self-end text-sm text-muted-foreground lg:col-span-4 lg:text-end" aria-live="polite">
          {listing.query.q ? `${listing.total} ${listing.total === 1 ? "piece" : "pieces"} for “${listing.query.q}”` : `${listing.total} ${listing.total === 1 ? "piece" : "pieces"}`}
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-6 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Collections" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex gap-7 whitespace-nowrap">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={listingHref(categoryPath(tab.slug ? tab : null), { sort: listing.query.sort })}
                  aria-current={activeId === tab.id ? "page" : undefined}
                  className={`text-xs uppercase tracking-[0.2em] transition rtl:tracking-normal ${
                    activeId === tab.id ? "text-foreground underline underline-offset-[10px]" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 lg:w-[28rem]">
          <ListingSearch action={basePath} query={listing.query} inputClassName={atelierInput} placeholder="Search the collection" />
          <SortSelect basePath={basePath} query={listing.query} className="border-0 bg-transparent py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus" />
        </div>
      </div>

      {listing.products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-heading text-3xl">Nothing here yet.</p>
          <p className="mt-3 text-sm text-muted-foreground">Try another search or collection.</p>
          <Link href="/shop" className={`mt-6 inline-block text-sm ${atelierTextLink}`}>View all pieces</Link>
        </div>
      ) : (
        <ul className="mt-14 grid grid-cols-2 gap-x-5 gap-y-14 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20">
          {listing.products.map((product, index) => (
            <li key={product.id}>
              <AtelierProductCard
                product={product}
                store={store}
                categoryName={listing.category ? undefined : categoryNameOf(categories, product.categoryId)}
                priority={index < 2}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} listing={listing} className="mt-20 border-t border-border pt-6" linkClassName={`text-sm ${atelierTextLink}`} />
    </main>
  );
}

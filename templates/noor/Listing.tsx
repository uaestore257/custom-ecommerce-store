import Link from "next/link";
import { ListingSearch } from "@/components/storefront/ListingSearch";
import { SortSelect } from "@/components/storefront/ListingControls";
import { Pagination } from "@/components/storefront/Pagination";
import { sfInputClass } from "@/components/storefront/primitives";
import { messagesFor, storefrontUiLocale } from "@/lib/storefront-i18n";
import { categoryPath, listingHref } from "@/lib/storefront-urls";
import type { TemplateListingProps } from "../types";
import { noorMessages } from "./messages";
import { NoorOrnament } from "./Ornament";
import { NOOR_GRID, NoorProductCard } from "./ProductCard";
import { NOOR_CONTAINER, noorLink, noorOutlineButton } from "./styles";

/**
 * A centred collection page: title and ornament, the collections as a
 * centred row of tabs, the shared search and sort (both real: they drive
 * the shared listing query), then the arched grid and shared pagination.
 */
export function NoorListing({ store, categories, listing }: TemplateListingProps) {
  const locale = storefrontUiLocale(store);
  const t = noorMessages(locale);
  const shared = messagesFor(locale);
  const basePath = categoryPath(listing.category);
  const tabs = [{ id: "all", name: t.allProducts, slug: "" }, ...categories.filter((category) => category.slug && category.productCount > 0)];
  const activeId = listing.category?.id ?? "all";

  return (
    <main className={`${NOOR_CONTAINER} py-12 lg:py-16`}>
      <header className="text-center">
        <h1 className="font-heading text-4xl leading-tight sm:text-5xl">
          {listing.query.q ? t.resultsFor(listing.query.q) : (listing.category?.name ?? t.allProducts)}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">{shared.items(listing.total)}</p>
        <NoorOrnament className="mt-6" />
      </header>

      <nav aria-label={t.collections} className="-mx-5 mt-8 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex w-max min-w-full justify-center gap-2 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => (
            <li key={tab.id} className="shrink-0">
              <Link
                href={listingHref(categoryPath(tab.slug ? tab : null), { sort: listing.query.sort })}
                aria-current={activeId === tab.id ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-5 text-sm transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  activeId === tab.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                }`}
              >
                {tab.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto mt-6 grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] gap-3">
        <ListingSearch action={basePath} query={listing.query} inputClassName={sfInputClass()} placeholder={shared.searchPlaceholder} label={shared.searchProducts} />
        <SortSelect basePath={basePath} query={listing.query} className={`${sfInputClass()} w-[10.5rem] sm:w-52`} />
      </div>

      {listing.products.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="font-heading text-2xl">{t.noMatches}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.noMatchesText}</p>
          <Link href="/shop" className={`${noorOutlineButton} mt-8`}>{t.clearFilters}</Link>
        </div>
      ) : (
        <ul className={`mt-12 ${NOOR_GRID}`}>
          {listing.products.map((product) => (
            <li key={product.id} className="min-w-0">
              <NoorProductCard product={product} store={store} t={t} />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} listing={listing} locale={locale} className="mt-16 border-t border-border pt-6" linkClassName={noorLink} />
    </main>
  );
}

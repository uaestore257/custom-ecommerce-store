import { LISTING_SORTS, type ListingQuery, type ListingSort } from "./storefront-types";

// ---------------------------------------------------------------
// STOREFRONT URLS (pure). Every storefront link is built here so routes,
// templates, the sitemap and JSON-LD agree. URLs are paths on the host
// that serves the store: the host (not the URL) decides the store, so a
// slug can only ever resolve inside that store.
// ---------------------------------------------------------------

export const LISTING_PAGE_SIZE = 24;
/** Upper bound on ?page= so a crafted URL can't request an absurd offset. */
export const LISTING_MAX_PAGE = 500;
export const LISTING_MAX_QUERY_LENGTH = 80;

/** /products/<slug>, falling back to the id for a product without a slug. */
export function productPath(product: { slug: string; id: string }): string {
  return `/products/${encodeURIComponent(product.slug || product.id)}`;
}

/** /shop/<slug> for a category, /shop for everything. */
export function categoryPath(category: { slug: string } | null | undefined): string {
  return category?.slug ? `/shop/${encodeURIComponent(category.slug)}` : "/shop";
}

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function isListingSort(value: unknown): value is ListingSort {
  return typeof value === "string" && (LISTING_SORTS as readonly string[]).includes(value);
}

/** A safe listing query from untrusted search params (invalid values become defaults). */
export function parseListingQuery(params: SearchParams): ListingQuery {
  const rawPage = single(params.page);
  const page = /^\d{1,4}$/.test(rawPage) ? Math.min(Math.max(Number(rawPage), 1), LISTING_MAX_PAGE) : 1;
  const sort = isListingSort(single(params.sort)) ? (single(params.sort) as ListingSort) : "featured";
  const q = single(params.q).replace(/\s+/g, " ").trim().slice(0, LISTING_MAX_QUERY_LENGTH);
  return { page, sort, q };
}

/** A listing URL with only non-default parameters, e.g. /shop/chairs?sort=newest&page=2. */
export function listingHref(basePath: string, query: Partial<ListingQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sort && query.sort !== "featured") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

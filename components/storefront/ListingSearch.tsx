import { Search } from "lucide-react";
import type { ListingQuery } from "@/lib/storefront-types";
import { LISTING_MAX_QUERY_LENGTH } from "@/lib/storefront-urls";

/** A plain GET form (works without JavaScript); keeps the current sort. */
export function ListingSearch({
  action,
  query,
  inputClassName = "",
  placeholder = "Search products…",
}: {
  action: string;
  query: ListingQuery;
  inputClassName?: string;
  placeholder?: string;
}) {
  return (
    <form action={action} method="get" role="search" className="relative min-w-0">
      <label htmlFor="listing-search" className="sr-only">Search products</label>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="listing-search"
        type="search"
        name="q"
        defaultValue={query.q}
        maxLength={LISTING_MAX_QUERY_LENGTH}
        placeholder={placeholder}
        className={`ps-9 ${inputClassName}`}
      />
      {query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}
    </form>
  );
}

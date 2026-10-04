"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ListingQuery, ListingSort } from "@/lib/storefront-types";
import { useStorefrontMessages } from "@/lib/storefront";
import { listingHref } from "@/lib/storefront-urls";

// Shared listing behaviour (URL semantics live in lib/storefront-urls.ts).
// Templates decide the look through the className props.

export const SORT_LABELS: Record<ListingSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

/** Changing the sort keeps the search, returns to page 1, and is a real URL. */
export function SortSelect({
  basePath,
  query,
  className = "",
  label,
}: {
  basePath: string;
  query: ListingQuery;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useStorefrontMessages();
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{label ?? t.sortBy}</span>
      <select
        value={query.sort}
        aria-busy={pending}
        onChange={(event) =>
          startTransition(() => router.push(listingHref(basePath, { q: query.q, sort: event.target.value as ListingSort })))
        }
        className={className}
      >
        {(Object.keys(SORT_LABELS) as ListingSort[]).map((sort) => (
          <option key={sort} value={sort}>
            {t.sort[sort]}
          </option>
        ))}
      </select>
    </label>
  );
}

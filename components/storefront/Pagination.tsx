import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductListing } from "@/lib/storefront-types";
import { listingHref } from "@/lib/storefront-urls";

/** Previous / page x of y / next, as real crawlable links (shared; templates style it). */
export function Pagination({
  basePath,
  listing,
  className = "",
  linkClassName = "",
}: {
  basePath: string;
  listing: ProductListing;
  className?: string;
  linkClassName?: string;
}) {
  const { page } = listing.query;
  if (listing.pageCount <= 1) return null;
  const href = (target: number) => listingHref(basePath, { ...listing.query, page: target });
  return (
    <nav aria-label="Pagination" className={`flex items-center justify-between gap-4 text-sm ${className}`}>
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={`inline-flex items-center gap-1 ${linkClassName}`}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Previous
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <p className="text-muted-foreground" aria-current="page">
        Page {page} of {listing.pageCount}
      </p>
      {page < listing.pageCount ? (
        <Link href={href(page + 1)} rel="next" className={`inline-flex items-center gap-1 ${linkClassName}`}>
          Next <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}

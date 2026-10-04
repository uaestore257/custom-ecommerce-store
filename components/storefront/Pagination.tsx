import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductListing } from "@/lib/storefront-types";
import { DEFAULT_UI_LOCALE, messagesFor, type UiLocale } from "@/lib/storefront-i18n";
import { listingHref } from "@/lib/storefront-urls";

/** Previous / page x of y / next, as real crawlable links (shared; templates style it). */
export function Pagination({
  basePath,
  listing,
  className = "",
  linkClassName = "",
  locale = DEFAULT_UI_LOCALE,
}: {
  basePath: string;
  listing: ProductListing;
  className?: string;
  linkClassName?: string;
  /** Interface language (storefrontUiLocale(store)); English by default. */
  locale?: UiLocale;
}) {
  const { page } = listing.query;
  const t = messagesFor(locale);
  if (listing.pageCount <= 1) return null;
  const href = (target: number) => listingHref(basePath, { ...listing.query, page: target });
  return (
    <nav aria-label={t.pagination} className={`flex items-center justify-between gap-4 text-sm ${className}`}>
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={`inline-flex items-center gap-1 ${linkClassName}`}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t.previous}
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <p className="text-muted-foreground" aria-current="page">
        {t.pageOf(page, listing.pageCount)}
      </p>
      {page < listing.pageCount ? (
        <Link href={href(page + 1)} rel="next" className={`inline-flex items-center gap-1 ${linkClassName}`}>
          {t.next} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}

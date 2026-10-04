import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatStoreMoney, isProductOnSale } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { productPath } from "@/lib/storefront-urls";
import { MarketCardControl } from "./Purchase";

/** Dense grid: 2 columns on phones up to 6 on wide screens. */
export const MARKET_GRID = "grid grid-cols-2 gap-2 max-[299px]:grid-cols-1 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/**
 * Market card: a contained square image on a white tile, the price first
 * (the loudest thing on the card), a two-line name, a delivery or stock
 * note, and the add button / quantity stepper.
 */
export function MarketProductCard({ product, store }: { product: StorefrontProductSummary; store: StorefrontStore }) {
  const href = productPath(product);
  const onSale = isProductOnSale(product);
  const soldOut = product.stock <= 0;
  const note = soldOut
    ? "Out of stock"
    : product.stock <= 5
      ? `Only ${product.stock} left`
      : product.pickupOnly
        ? "Pickup only"
        : product.freeDelivery
          ? "Free delivery"
          : null;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-card border border-border bg-surface p-2 sm:p-2.5">
      <Link href={href} tabIndex={-1} aria-hidden className="relative block overflow-hidden rounded-control bg-surface">
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-full object-contain!" />
        {onSale && !soldOut && (
          <span className="absolute start-1.5 top-1.5 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-white">Sale</span>
        )}
      </Link>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
        <span className={`text-base font-extrabold ${onSale ? "text-destructive" : ""}`}>
          {onSale && <span className="sr-only">Sale price </span>}
          {formatStoreMoney(store, product.priceMinor)}
        </span>
        {onSale && product.compareAtMinor && (
          <span className="text-xs text-muted-foreground line-through">
            <span className="sr-only">Original price </span>
            {formatStoreMoney(store, product.compareAtMinor)}
          </span>
        )}
      </p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5" title={product.name}>
        <Link href={href} className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">{product.name}</Link>
      </h3>
      <p className={`mt-0.5 min-h-4 text-[11px] font-semibold ${product.stock <= 5 ? "text-warning" : "text-muted-foreground"}`}>{note}</p>
      <div className="mt-auto pt-2">
        <MarketCardControl product={product} shownStoreId={store.id} name={product.name} />
      </div>
    </article>
  );
}

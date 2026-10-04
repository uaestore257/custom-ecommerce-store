import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { AddToCartButton } from "@/components/storefront/CartControls";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { productPath } from "@/lib/storefront-urls";

/**
 * Responsive product grid used by the shop, homepage and related products.
 * 2 columns on phones (from 300px), 3 on tablets, 4 on laptops and up.
 * grid-cols-N uses minmax(0, 1fr), so long names can never widen a column.
 */
export const PRODUCT_GRID =
  "grid grid-cols-2 gap-3 max-[299px]:grid-cols-1 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5";

/** Classic card: square image, category, price, delivery note and quick add. */
export function ProductCard({
  product,
  categoryName,
  store,
}: {
  product: StorefrontProductSummary;
  store: StorefrontStore;
  categoryName: string;
}) {
  const href = productPath(product);
  const onSale = isProductOnSale(product);
  const soldOut = product.stock <= 0;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface transition hover:shadow-md">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden>
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-full" />
        {onSale && !soldOut && (
          <span className="absolute start-2 top-2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background sm:start-3 sm:top-3 sm:px-2 sm:text-xs">
            Sale
          </span>
        )}
        {soldOut && (
          <span className="absolute start-2 top-2 rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border sm:start-3 sm:top-3 sm:px-2 sm:text-xs">
            Sold out
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-accent sm:text-xs">{categoryName}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-base" title={product.name}>
          <Link href={href} className="hover:text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            {product.name}
          </Link>
        </h3>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="whitespace-nowrap text-sm font-bold text-accent sm:text-base">
            {onSale && <span className="sr-only">Sale price </span>}
            {formatStoreMoney(store, product.priceMinor)}
          </p>
          {onSale && product.compareAtMinor && (
            <p className="whitespace-nowrap text-xs text-muted-foreground line-through sm:text-sm">
              <span className="sr-only">Original price </span>
              {formatStoreMoney(store, product.compareAtMinor)}
            </p>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{productDeliveryDescription(product, store)}</p>
        {!soldOut && product.stock <= 5 && (
          <p className="mt-1 text-[11px] font-medium text-warning sm:text-xs">Only {product.stock} left</p>
        )}

        <AddToCartButton product={product} shownStoreId={store.id} compact size="sm" className="mt-auto pt-2.5 sm:pt-3" />
      </div>
    </article>
  );
}

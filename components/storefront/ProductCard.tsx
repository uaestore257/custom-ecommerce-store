import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatMoney, isOnSale } from "@/lib/format";
import type { CurrencyCode, Product } from "@/lib/types";
import { AddToCartButton } from "./CartControls";

/**
 * Responsive product grid used by the shop, homepage and related products.
 * 2 columns on phones (from 300px), 3 on tablets, 4 on laptops and up.
 * grid-cols-N uses minmax(0, 1fr), so long names can never widen a column.
 */
export const PRODUCT_GRID =
  "grid grid-cols-2 gap-3 max-[299px]:grid-cols-1 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5";

export function ProductCard({
  product,
  categoryName,
  currency,
  inCart,
  shownStoreId,
}: {
  product: Product;
  /** The store the storefront is showing (guards against mixing stores). */
  shownStoreId: string;
  categoryName: string;
  currency: CurrencyCode;
  inCart: number;
}) {
  const href = `/products/${product.id}`;
  const onSale = isOnSale(product);
  const soldOut = product.stock <= 0;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md sm:rounded-2xl">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden>
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-full" />
        {onSale && !soldOut && (
          <span className="absolute left-2 top-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:left-3 sm:top-3 sm:px-2 sm:text-xs">
            Sale
          </span>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200 sm:left-3 sm:top-3 sm:px-2 sm:text-xs">
            Sold out
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-brand sm:text-xs">
          {categoryName}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-900 sm:text-base" title={product.name}>
          <Link href={href} className="hover:text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {product.name}
          </Link>
        </h3>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="whitespace-nowrap text-sm font-bold text-brand sm:text-base">
            {onSale && <span className="sr-only">Sale price </span>}
            {formatMoney(product.price, currency)}
          </p>
          {onSale && (
            <p className="whitespace-nowrap text-xs text-slate-400 line-through sm:text-sm">
              <span className="sr-only">Original price </span>
              {formatMoney(product.compareAtPrice!, currency)}
            </p>
          )}
        </div>
        {!soldOut && product.stock <= 5 && (
          <p className="mt-1 text-[11px] font-medium text-amber-700 sm:text-xs">Only {product.stock} left</p>
        )}

        <AddToCartButton
          product={product}
          shownStoreId={shownStoreId}
          inCart={inCart}
          compact
          className="mt-auto pt-2.5 sm:pt-3"
        />
      </div>
    </article>
  );
}

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { productPath } from "@/lib/storefront-urls";
import { KineticQuickAdd } from "./Purchase";

/** 2 columns on phones, 3 on tablets, 4 on large screens; minmax(0,1fr) keeps long names from widening a column. */
export const KINETIC_GRID = "grid grid-cols-2 gap-3 max-[299px]:grid-cols-1 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

/**
 * Kinetic card: a square image on an accent-tinted panel inside a hard
 * 2px frame, bold name and price, and a quick-add bar attached to the
 * bottom edge. Lifts with a hard offset shadow on hover.
 */
export function KineticProductCard({
  product,
  store,
  categoryName,
  priority = false,
}: {
  product: StorefrontProductSummary;
  store: StorefrontStore;
  categoryName?: string;
  priority?: boolean;
}) {
  const href = productPath(product);
  const onSale = isProductOnSale(product);
  const soldOut = product.stock <= 0;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-card border-2 border-foreground bg-surface transition duration-150 ease-out hover:-translate-y-1 hover:shadow-[4px_4px_0_0_var(--sf-foreground)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 rtl:hover:shadow-[-4px_4px_0_0_var(--sf-foreground)]">
      <Link href={href} tabIndex={-1} aria-hidden className="relative block border-b-2 border-foreground bg-accent/10">
        <ProductImage src={product.imageUrl} alt={product.name} priority={priority} className="aspect-square w-full" />
        {(onSale || soldOut) && (
          <span
            className={`absolute start-2 top-2 rounded-control border-2 border-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rtl:tracking-normal ${
              soldOut ? "bg-foreground text-background" : "bg-accent text-accent-foreground"
            }`}
          >
            {soldOut ? "Sold out" : "Sale"}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        {categoryName && <p className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground rtl:tracking-normal">{categoryName}</p>}
        <h3 className="mt-1 line-clamp-2 font-heading text-base font-bold leading-snug sm:text-lg" title={product.name}>
          <Link href={href} className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            {product.name}
          </Link>
        </h3>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2 tabular-nums">
          <span className="whitespace-nowrap text-base font-extrabold">
            {onSale && <span className="sr-only">Sale price </span>}
            {formatStoreMoney(store, product.priceMinor)}
          </span>
          {onSale && product.compareAtMinor && (
            <span className="whitespace-nowrap text-xs text-muted-foreground line-through">
              <span className="sr-only">Original price </span>
              {formatStoreMoney(store, product.compareAtMinor)}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{productDeliveryDescription(product, store)}</p>
      </div>

      <KineticQuickAdd product={product} shownStoreId={store.id} />
    </article>
  );
}

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatStoreMoney, isProductOnSale } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { productPath } from "@/lib/storefront-urls";
import type { NoorMessages } from "./messages";
import { NoorCardAdd } from "./Purchase";
import { noorArch, noorArchFrame } from "./styles";

/** 2 columns on phones, 3 on tablets, 4 on large screens. */
export const NOOR_GRID = "grid grid-cols-2 gap-x-4 gap-y-12 max-[299px]:grid-cols-1 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-10";

/**
 * Noor card: the photograph in an arched 3:4 window inside a fine arched
 * rule, then the name and price centred beneath, the stock state when it
 * matters, and a quiet add-to-cart.
 */
export function NoorProductCard({ product, store, t }: { product: StorefrontProductSummary; store: StorefrontStore; t: NoorMessages }) {
  const href = productPath(product);
  const onSale = isProductOnSale(product);
  const soldOut = product.stock <= 0;
  return (
    <article className="group flex h-full min-w-0 flex-col text-center">
      <Link href={href} tabIndex={-1} aria-hidden className={`block ${noorArchFrame} transition-colors duration-500 group-hover:border-foreground/40 motion-reduce:transition-none`}>
        <span className={`block ${noorArch}`}>
          <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[3/4] w-full transition duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        </span>
      </Link>
      <h3 className="mt-4 line-clamp-2 font-heading text-lg leading-snug">
        <Link href={href} className="hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">{product.name}</Link>
      </h3>
      <p className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-2 text-sm tabular-nums">
        {onSale && product.compareAtMinor && (
          <span className="text-muted-foreground line-through">
            <span className="sr-only">{t.originalPrice} </span>
            {formatStoreMoney(store, product.compareAtMinor)}
          </span>
        )}
        <span className={onSale ? "font-medium text-accent" : "font-medium"}>
          {onSale && <span className="sr-only">{t.salePrice} </span>}
          {formatStoreMoney(store, product.priceMinor)}
        </span>
      </p>
      <p className="mt-1 min-h-4 text-xs text-muted-foreground">
        {soldOut ? t.soldOut : product.stock <= 3 ? t.onlyLeft(product.stock) : onSale ? t.sale : ""}
      </p>
      <div className="mt-auto pt-3">
        <NoorCardAdd product={product} shownStoreId={store.id} />
      </div>
    </article>
  );
}

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatStoreMoney, isProductOnSale } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { productPath } from "@/lib/storefront-urls";
import { maisonLabel } from "./styles";

/** Two columns on phones, three on tablets, four on large screens. */
export const MAISON_GRID = "grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-16";

/**
 * Maison card: a frameless 2:3 photograph, the name in tracked capitals and
 * a quiet price. No quick add — the product page sells. Status is set as
 * small text; the store's accent marks only a reduced price.
 */
export function MaisonProductCard({
  product,
  store,
  priority = false,
}: {
  product: StorefrontProductSummary;
  store: StorefrontStore;
  priority?: boolean;
}) {
  const onSale = isProductOnSale(product);
  const soldOut = product.stock <= 0;
  return (
    <article className="group min-w-0">
      <Link href={productPath(product)} className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-4 focus-visible:ring-offset-background">
        <div className="overflow-hidden bg-muted">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            priority={priority}
            className="aspect-[2/3] w-full transition duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <h3 className={`mt-4 line-clamp-2 leading-relaxed ${maisonLabel}`}>{product.name}</h3>
        <p className="mt-1 text-sm tabular-nums">
          {onSale && product.compareAtMinor && (
            <span className="me-2 whitespace-nowrap text-muted-foreground line-through">
              <span className="sr-only">Original price </span>
              {formatStoreMoney(store, product.compareAtMinor)}
            </span>
          )}
          {onSale && <span className="sr-only">Sale price </span>}
          <span className={`whitespace-nowrap ${onSale ? "text-accent" : ""}`}>{formatStoreMoney(store, product.priceMinor)}</span>
        </p>
        {soldOut && <p className="mt-1 text-xs text-muted-foreground">Sold out</p>}
      </Link>
    </article>
  );
}

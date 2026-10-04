import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatStoreMoney, isProductOnSale } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { productPath } from "@/lib/storefront-urls";

/**
 * Atelier card: frameless 4:5 image, serif name, quiet price. No quick
 * add — considered purchases happen on the product page. Status is set as
 * small text, never as a badge on the photograph.
 */
export function AtelierProductCard({
  product,
  store,
  categoryName,
  size = "standard",
  priority = false,
}: {
  product: StorefrontProductSummary;
  store: StorefrontStore;
  categoryName?: string;
  size?: "standard" | "feature";
  priority?: boolean;
}) {
  const onSale = isProductOnSale(product);
  const soldOut = product.stock <= 0;
  return (
    <article className="group min-w-0">
      <Link href={productPath(product)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-4 focus-visible:ring-offset-background">
        <div className="overflow-hidden bg-muted">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            priority={priority}
            className="aspect-[4/5] w-full transition duration-700 ease-out group-hover:scale-[1.02]"
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {categoryName && <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">{categoryName}</p>}
            <h3 className={`mt-1 font-heading leading-tight ${size === "feature" ? "text-3xl" : "text-xl"}`}>{product.name}</h3>
          </div>
          <p className="shrink-0 pt-1 text-sm tabular-nums">
            {onSale && product.compareAtMinor && (
              <span className="me-2 text-muted-foreground line-through">
                <span className="sr-only">Original price </span>
                {formatStoreMoney(store, product.compareAtMinor)}
              </span>
            )}
            {onSale && <span className="sr-only">Sale price </span>}
            {formatStoreMoney(store, product.priceMinor)}
          </p>
        </div>
        {(soldOut || onSale) && (
          <p className="mt-1 text-xs text-muted-foreground">{soldOut ? "Sold out" : "Reduced"}</p>
        )}
      </Link>
    </article>
  );
}

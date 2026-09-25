import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode, Product } from "@/lib/types";
import { AddToCartButton } from "./CartControls";

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
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md">
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand" tabIndex={-1} aria-hidden>
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[4/3] w-full" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="inline-block self-start rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
          {categoryName}
        </span>
        <h3 className="mt-3 font-semibold text-slate-900">
          <Link href={href} className="hover:text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="font-semibold text-brand">{formatMoney(product.price, currency)}</p>
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs font-medium text-amber-700">Only {product.stock} left</p>
          )}
        </div>
        <AddToCartButton
          product={product}
          shownStoreId={shownStoreId}
          inCart={inCart}
          size="sm"
          className="mt-auto pt-4"
        />
      </div>
    </article>
  );
}

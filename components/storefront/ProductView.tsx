"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { Breadcrumbs } from "@/components/ui";
import { useStorefront } from "@/lib/storefront";
import { categoryNameOf, formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import type { StorefrontProduct } from "@/lib/storefront-types";
import { AddToCartButton, QuantitySelector } from "./CartControls";
import { PRODUCT_GRID, ProductCard } from "./ProductCard";

/**
 * @param product a fresh read of this product from the server page (the
 * page returns a real 404 for missing, draft or other-store products).
 */
export function ProductView({ product }: { product: StorefrontProduct }) {
  const view = useStorefront();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);

  // The shared layout's catalog (used by the cart) is not re-fetched on
  // every navigation. If it is older than this fresh product read, refresh
  // it so the page and the cart can never show different prices or stock.
  const catalogCopy = view?.products.find((p) => p.id === product.id);
  const catalogIsStale =
    !catalogCopy ||
    catalogCopy.priceMinor !== product.priceMinor ||
    catalogCopy.stock !== product.stock ||
    catalogCopy.deliveryFeeMinor !== product.deliveryFeeMinor ||
    catalogCopy.freeDelivery !== product.freeDelivery ||
    catalogCopy.pickupOnly !== product.pickupOnly;
  useEffect(() => {
    if (catalogIsStale) router.refresh();
  }, [catalogIsStale, router]);

  if (!view) return null;
  const { store, categories, products, cart } = view;

  const category = categoryNameOf(categories, product.categoryId);
  const onSale = isProductOnSale(product);
  const inCart = cart.lines.find((l) => l.product.id === product.id)?.quantity ?? 0;
  const available = Math.max(0, product.stock - inCart);
  const safeQuantity = Math.min(quantity, Math.max(1, available));
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 md:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(product.categoryId
            ? [{ label: category, href: `/shop?category=${encodeURIComponent(product.categoryId)}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-6 sm:mt-6 md:grid-cols-2 md:gap-10">
        <div className="relative">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full rounded-2xl border border-slate-200 sm:rounded-3xl"
          />
          {onSale && (
            <span className="absolute left-3 top-3 rounded bg-slate-900 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Sale
            </span>
          )}
        </div>

        <div className="min-w-0">
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            {category}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:mt-4 sm:text-4xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-3">
            <p className="text-2xl font-semibold text-brand">
              {onSale && <span className="sr-only">Sale price </span>}
              {formatStoreMoney(store, product.priceMinor)}
            </p>
            {onSale && product.compareAtMinor && (
              <>
                <p className="text-base text-slate-400 line-through">
                  <span className="sr-only">Original price </span>
                  {formatStoreMoney(store, product.compareAtMinor)}
                </p>
                <p className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Save {formatStoreMoney(store, BigInt(product.compareAtMinor) - BigInt(product.priceMinor))}
                </p>
              </>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700">{productDeliveryDescription(product, store)}</p>
          {product.description && (
            <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-600 sm:mt-6">{product.description}</p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:mt-6 border-y border-slate-200 py-4 text-sm">
            <div>
              <dt className="text-slate-500">SKU</dt>
              <dd className="font-medium">{product.sku}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Availability</dt>
              <dd className={`font-medium ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
              </dd>
            </div>
          </dl>
          {product.stock > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Stock is not reserved while items are in your cart.
            </p>
          )}

          {product.stock > 0 && (
            <div className="mt-5 flex items-center gap-3 sm:mt-6">
              {available > 0 && (
                <QuantitySelector value={safeQuantity} max={available} onChange={setQuantity} />
              )}
              <AddToCartButton
                product={product}
                shownStoreId={store.id}
                quantity={safeQuantity}
                inCart={inCart}
                size="lg"
                className="min-w-0 flex-1 sm:max-w-xs"
              />
            </div>
          )}
          {inCart > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              {inCart} already in your{" "}
              <Link href="/cart" className="font-semibold text-brand hover:underline">cart</Link>.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10 sm:mt-16">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">More in {category}</h2>
          <div className={`mt-4 sm:mt-6 ${PRODUCT_GRID}`}>
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                store={store}
                categoryName={category}
                inCart={cart.lines.find((l) => l.product.id === p.id)?.quantity ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

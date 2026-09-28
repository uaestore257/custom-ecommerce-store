"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { buttonClass, LinkButton } from "@/components/ui";
import { clearCart, removeFromCart, setCartQuantity, useStorefront } from "@/lib/storefront";
import { categoryNameOf, formatStoreMoney } from "@/lib/storefront-cart";
import { QuantitySelector } from "./CartControls";
import { CartChangesNotice, CartLineChange, NOT_RESERVED_NOTE, useCatalogRefreshOnOpen } from "./CartChanges";
import { CartTotals } from "./OrderSummary";

export function CartView() {
  const view = useStorefront();
  const { checking } = useCatalogRefreshOnOpen();
  const [confirmClear, setConfirmClear] = useState(false);
  if (!view) return null;
  const { store, categories, cart, cartLoaded } = view;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-slate-600">Items from {store.name}.</p>

      {!cartLoaded ? (
        <LoadingState label="Loading your cart…" />
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500" aria-live="polite">
            {checking ? "Checking current prices and stock…" : "Prices and stock checked with the store just now."}
          </p>
          <CartChangesNotice cart={cart} store={store} className="mt-6" />

          {cart.lines.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={ShoppingCart}
                title="Your cart is empty"
                description="Browse the shop and add something you like."
                action={<LinkButton href="/shop" tone="brand">Continue shopping</LinkButton>}
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section aria-label="Cart items">
                <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
                  {cart.lines.map((line) => {
                    const { product, quantity, lineTotalMinor } = line;
                    return (
                      <li key={product.id} className="relative flex gap-3 p-4 sm:gap-4 sm:p-5">
                        <Link href={`/products/${product.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-16 w-16 rounded-xl sm:h-24 sm:w-24"
                          />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 pr-8 sm:pr-0">
                            <p className="text-xs font-medium text-slate-500">
                              {categoryNameOf(categories, product.categoryId)}
                            </p>
                            <Link
                              href={`/products/${product.id}`}
                              className="font-semibold text-slate-900 hover:text-brand hover:underline"
                            >
                              {product.name}
                            </Link>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatStoreMoney(store, product.priceMinor)} each
                            </p>
                            <CartLineChange line={line} store={store} />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <QuantitySelector
                              label={`Quantity for ${product.name}`}
                              value={quantity}
                              max={product.stock}
                              onChange={(value) => setCartQuantity(product.id, value)}
                            />
                            <p className="whitespace-nowrap text-sm font-semibold tabular-nums sm:text-base">
                              {formatStoreMoney(store, lineTotalMinor)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="absolute right-2 top-2 rounded-lg p-2.5 text-slate-400 sm:static sm:self-start sm:p-2 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`Remove ${product.name} from cart`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-slate-500">{NOT_RESERVED_NOTE}</p>
                <div className="mt-4 flex flex-wrap justify-between gap-3">
                  <LinkButton href="/shop" variant="secondary">Continue shopping</LinkButton>
                  <button type="button" className={buttonClass("ghost")} onClick={() => setConfirmClear(true)}>
                    Empty cart
                  </button>
                </div>
              </section>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-semibold">Order summary</h2>
                <div className="mt-4">
                  <CartTotals cart={cart} store={store} />
                </div>
                <LinkButton href="/checkout" tone="brand" size="lg" className="mt-6 w-full">
                  Proceed to checkout
                </LinkButton>
              </aside>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Empty your cart?"
        confirmLabel="Empty cart"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearCart();
          setConfirmClear(false);
        }}
      >
        All items will be removed from your cart.
      </ConfirmDialog>
    </main>
  );
}

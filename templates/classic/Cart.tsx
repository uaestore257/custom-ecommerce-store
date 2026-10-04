"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice, CartLineChange, NOT_RESERVED_NOTE } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { CartTotals } from "@/components/storefront/OrderSummary";
import { sfButtonClass, SfEmptyState, SfLinkButton, SfLoading, SfNotice } from "@/components/storefront/primitives";
import { clearCart, removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { categoryNameOf, formatStoreMoney, productDeliveryDescription } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";

/** Classic cart page: a bordered line list with a summary panel. Cart behaviour is the shared hook. */
export function ClassicCart() {
  const view = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  if (!view) return null;
  const { context: { store, categories }, cart, status, refresh } = view;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-muted-foreground">Items from {store.name}.</p>

      {status === "error" ? (
        <SfNotice tone="error" className="mt-6">
          We couldn&apos;t check current prices and stock.{" "}
          <button type="button" className="font-semibold underline" onClick={refresh}>Try again</button>
        </SfNotice>
      ) : status === "loading" && cart.lines.length === 0 ? (
        <SfLoading label="Loading your cart…" />
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {status === "loading" ? "Checking current prices and stock…" : "Prices and stock checked with the store just now."}
          </p>
          <CartChangesNotice cart={cart} store={store} className="mt-6" />

          {cart.lines.length === 0 ? (
            <div className="mt-8">
              <SfEmptyState
                icon={ShoppingCart}
                title="Your cart is empty"
                description="Browse the shop and add something you like."
                action={<SfLinkButton href="/shop">Continue shopping</SfLinkButton>}
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section aria-label="Cart items">
                <ul className="divide-y divide-border rounded-card border border-border bg-surface">
                  {cart.lines.map((line) => {
                    const { product, quantity, lineTotalMinor } = line;
                    return (
                      <li key={product.id} className="relative flex gap-3 p-4 sm:gap-4 sm:p-5">
                        <Link href={productPath(product)} className="shrink-0" tabIndex={-1} aria-hidden>
                          <ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-control sm:h-24 sm:w-24" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 pe-8 sm:pe-0">
                            <p className="text-xs font-medium text-muted-foreground">{categoryNameOf(categories, product.categoryId)}</p>
                            <Link href={productPath(product)} className="font-semibold text-foreground hover:text-accent hover:underline">
                              {product.name}
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">{formatStoreMoney(store, product.priceMinor)} each</p>
                            <p className="text-sm text-muted-foreground">{productDeliveryDescription(product, store)}</p>
                            <CartLineChange line={line} store={store} />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <QuantitySelector
                              label={`Quantity for ${product.name}`}
                              value={quantity}
                              max={product.stock}
                              onChange={(value) => setCartQuantity(product.id, value)}
                            />
                            <p className="whitespace-nowrap text-sm font-semibold tabular-nums sm:text-base">{formatStoreMoney(store, lineTotalMinor)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="absolute end-2 top-2 rounded-control p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive sm:static sm:self-start sm:p-2"
                          aria-label={`Remove ${product.name} from cart`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{NOT_RESERVED_NOTE}</p>
                <div className="mt-4 flex flex-wrap justify-between gap-3">
                  <SfLinkButton href="/shop" variant="secondary">Continue shopping</SfLinkButton>
                  <button type="button" className={sfButtonClass("ghost")} onClick={() => setConfirmClear(true)}>
                    Empty cart
                  </button>
                </div>
              </section>

              <aside className="h-fit rounded-card border border-border bg-surface-elevated p-6">
                <h2 className="font-heading text-lg font-semibold">Order summary</h2>
                <div className="mt-4">
                  <CartTotals cart={cart} store={store} />
                </div>
                <SfLinkButton href="/checkout" size="lg" className="mt-6 w-full">Proceed to checkout</SfLinkButton>
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

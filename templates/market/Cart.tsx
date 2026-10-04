"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice, CartLineChange, NOT_RESERVED_NOTE } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { CartTotals } from "@/components/storefront/OrderSummary";
import { SfEmptyState, SfLinkButton, SfLoading, SfNotice } from "@/components/storefront/primitives";
import { clearCart, removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { formatStoreMoney, productDeliveryDescription } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { MARKET_CONTAINER, marketButton, marketLink } from "./styles";

/** Market's cart: a checklist of lines with steppers beside the totals. Behaviour is the shared cart hook. */
export function MarketCart() {
  const view = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  if (!view) return null;
  const { context: { store }, cart, status, refresh } = view;

  return (
    <main className={`${MARKET_CONTAINER} py-4 sm:py-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">Your cart</h1>
        {cart.lines.length > 0 && (
          <button type="button" onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden /> Empty cart
          </button>
        )}
      </div>

      {status === "error" ? (
        <SfNotice tone="error" className="mt-4">
          We couldn&apos;t check current prices and stock.{" "}
          <button type="button" className="font-bold underline" onClick={refresh}>Try again</button>
        </SfNotice>
      ) : status === "loading" && cart.lines.length === 0 ? (
        <SfLoading label="Loading your cart…" />
      ) : cart.lines.length === 0 ? (
        <div className="mt-6">
          <SfEmptyState icon={ShoppingCart} title="Your cart is empty" description="Search or browse the categories to start your basket." action={<SfLinkButton href="/shop">Start shopping</SfLinkButton>} />
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-label="Cart items">
            <CartChangesNotice cart={cart} store={store} className="mb-3" />
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {cart.lines.map((line) => {
                const { product, quantity, lineTotalMinor } = line;
                return (
                  <li key={product.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-start gap-3 p-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
                    <Link href={productPath(product)} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-control border border-border bg-surface p-1">
                      <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-full object-contain!" />
                    </Link>
                    <div className="min-w-0">
                      <Link href={productPath(product)} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">{product.name}</Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatStoreMoney(store, product.priceMinor)} each · {productDeliveryDescription(product, store)}
                      </p>
                      <CartLineChange line={line} store={store} />
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <QuantitySelector label={`Quantity for ${product.name}`} value={quantity} max={product.stock} onChange={(value) => setCartQuantity(product.id, value)} />
                        <button type="button" onClick={() => removeFromCart(product.id)} className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-destructive">
                          Remove<span className="sr-only"> {product.name}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold tabular-nums">{formatStoreMoney(store, lineTotalMinor)}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{NOT_RESERVED_NOTE}</p>
          </section>

          <aside className="h-fit rounded-card border border-border bg-surface p-4 lg:sticky lg:top-36">
            <CartTotals cart={cart} store={store} />
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {status === "loading" ? "Checking current prices and stock…" : "Delivery or pickup is chosen at checkout."}
            </p>
            <Link href="/checkout" aria-disabled={status !== "ready"} className={`${marketButton} mt-4 ${status !== "ready" ? "pointer-events-none opacity-50" : ""}`}>
              Checkout
            </Link>
            <Link href="/shop" className={`mt-3 block text-center text-sm ${marketLink}`}>Keep shopping</Link>
          </aside>
        </div>
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
        This removes every item from your cart.
      </ConfirmDialog>
    </main>
  );
}

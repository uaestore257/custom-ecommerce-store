"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice, CartLineChange, NOT_RESERVED_NOTE } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { CartTotals } from "@/components/storefront/OrderSummary";
import { SfEmptyState, SfLinkButton, SfLoading, SfNotice } from "@/components/storefront/primitives";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { formatStoreMoney, productDeliveryDescription } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { KINETIC_CONTAINER, kineticButton, kineticEyebrow } from "./styles";

/** Kinetic's full cart page: hard-edged line cards beside an accent-washed summary. Behaviour is the shared cart hook. */
export function KineticCart() {
  const view = useCart();
  if (!view) return null;
  const { context: { store }, cart, status, refresh } = view;

  return (
    <main className={`${KINETIC_CONTAINER} py-8 sm:py-12`}>
      <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-6xl rtl:tracking-normal">Your cart</h1>

      {status === "error" ? (
        <SfNotice tone="error" className="mt-6">
          We couldn&apos;t check current prices and stock.{" "}
          <button type="button" className="font-bold underline" onClick={refresh}>Try again</button>
        </SfNotice>
      ) : status === "loading" && cart.lines.length === 0 ? (
        <SfLoading label="Loading your cart…" />
      ) : cart.lines.length === 0 ? (
        <div className="mt-8">
          <SfEmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Find something you like in the shop."
            action={<SfLinkButton href="/shop">Shop all products</SfLinkButton>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section aria-label="Cart items">
            <CartChangesNotice cart={cart} store={store} className="mb-5" />
            <ul className="space-y-3">
              {cart.lines.map((line) => {
                const { product, quantity, lineTotalMinor } = line;
                return (
                  <li key={product.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 rounded-card border-2 border-foreground bg-surface p-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:p-4">
                    <Link href={productPath(product)} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-control bg-accent/10">
                      <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-full" />
                    </Link>
                    <div className="min-w-0">
                      <Link href={productPath(product)} className="line-clamp-2 font-heading text-lg font-bold leading-snug hover:underline">{product.name}</Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatStoreMoney(store, product.priceMinor)} · {productDeliveryDescription(product, store)}
                      </p>
                      <CartLineChange line={line} store={store} />
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <QuantitySelector
                          label={`Quantity for ${product.name}`}
                          value={quantity}
                          max={product.stock}
                          onChange={(value) => setCartQuantity(product.id, value)}
                        />
                        <button type="button" onClick={() => removeFromCart(product.id)} className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground">
                          Remove<span className="sr-only"> {product.name}</span>
                        </button>
                      </div>
                    </div>
                    <p className="col-start-2 text-base font-extrabold tabular-nums sm:col-start-3 sm:text-end">{formatStoreMoney(store, lineTotalMinor)}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{NOT_RESERVED_NOTE}</p>
          </section>

          <aside className="h-fit rounded-card border-2 border-foreground bg-accent/10 p-6 lg:sticky lg:top-36">
            <p className={kineticEyebrow}>Summary</p>
            <div className="mt-4">
              <CartTotals cart={cart} store={store} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
              {status === "loading" ? "Checking current prices and stock…" : "Delivery or pickup is confirmed at checkout."}
            </p>
            <Link href="/checkout" aria-disabled={status !== "ready"} className={`${kineticButton} mt-6 ${status !== "ready" ? "pointer-events-none opacity-50" : ""}`}>
              Checkout
            </Link>
            <Link href="/shop" className="mt-4 block text-center text-sm font-semibold underline underline-offset-4">Keep shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}

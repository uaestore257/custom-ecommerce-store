"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice, CartLineChange, NOT_RESERVED_NOTE } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { CartTotals } from "@/components/storefront/OrderSummary";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { formatStoreMoney, productDeliveryDescription } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { ATELIER_CONTAINER, atelierButton, atelierEyebrow, atelierTextLink } from "./styles";

/** Atelier's full bag page: an editorial list beside a quiet summary. Behaviour is the shared cart hook. */
export function AtelierCart() {
  const view = useCart();
  if (!view) return null;
  const { context: { store }, cart, status, refresh } = view;

  return (
    <main className={`${ATELIER_CONTAINER} py-12 lg:py-20`}>
      <p className={atelierEyebrow}>{store.name}</p>
      <h1 className="mt-4 font-heading text-5xl font-normal lg:text-6xl">Your bag</h1>

      {status === "error" ? (
        <p className="mt-10 text-sm text-destructive" role="alert">
          We couldn&apos;t check current prices and stock.{" "}
          <button type="button" onClick={refresh} className={atelierTextLink}>Try again</button>
        </p>
      ) : status === "loading" && cart.lines.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground" role="status">Checking your bag…</p>
      ) : cart.lines.length === 0 ? (
        <div className="mt-16 border-t border-border pt-16">
          <p className="font-heading text-3xl">Your bag is empty.</p>
          <Link href="/shop" className={`mt-6 inline-block text-sm ${atelierTextLink}`}>Explore the collection</Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <section aria-label="Pieces in your bag" className="lg:col-span-8">
            <CartChangesNotice cart={cart} store={store} className="mb-8" />
            <ul className="border-t border-border">
              {cart.lines.map((line) => {
                const { product, quantity, lineTotalMinor } = line;
                return (
                  <li key={product.id} className="grid grid-cols-[6rem_1fr] gap-5 border-b border-border py-8 sm:grid-cols-[8rem_1fr_auto]">
                    <Link href={productPath(product)} tabIndex={-1} aria-hidden>
                      <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[4/5] w-full" />
                    </Link>
                    <div className="min-w-0">
                      <Link href={productPath(product)} className="font-heading text-2xl leading-tight hover:opacity-70">{product.name}</Link>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatStoreMoney(store, product.priceMinor)} · {productDeliveryDescription(product, store)}
                      </p>
                      <CartLineChange line={line} store={store} />
                      <div className="mt-5 flex items-center gap-6">
                        <QuantitySelector
                          label={`Quantity for ${product.name}`}
                          value={quantity}
                          max={product.stock}
                          onChange={(value) => setCartQuantity(product.id, value)}
                        />
                        <button type="button" onClick={() => removeFromCart(product.id)} className={`text-xs text-muted-foreground ${atelierTextLink}`}>
                          Remove<span className="sr-only"> {product.name}</span>
                        </button>
                      </div>
                    </div>
                    <p className="col-start-2 text-sm tabular-nums sm:col-start-3 sm:text-end">{formatStoreMoney(store, lineTotalMinor)}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{NOT_RESERVED_NOTE}</p>
          </section>

          <aside className="h-fit bg-surface p-8 lg:sticky lg:top-28 lg:col-span-4">
            <p className={atelierEyebrow}>Summary</p>
            <div className="mt-6">
              <CartTotals cart={cart} store={store} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {status === "loading" ? "Checking current prices and stock…" : "Delivery or collection is confirmed at checkout."}
            </p>
            <Link href="/checkout" aria-disabled={status !== "ready"} className={`${atelierButton} mt-8 ${status !== "ready" ? "pointer-events-none opacity-40" : ""}`}>
              Checkout
            </Link>
            <Link href="/shop" className={`mt-5 block text-center text-xs ${atelierTextLink}`}>Continue browsing</Link>
          </aside>
        </div>
      )}
    </main>
  );
}

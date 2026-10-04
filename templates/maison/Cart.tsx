"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice, CartLineChange, NOT_RESERVED_NOTE } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { CartTotals } from "@/components/storefront/OrderSummary";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { formatStoreMoney } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { MAISON_CONTAINER, maisonButton, maisonLabel, maisonLink } from "./styles";

/** Maison's bag page: hairline-ruled lines of 2:3 photographs beside a quiet summary. Behaviour is the shared cart hook. */
export function MaisonCart() {
  const view = useCart();
  if (!view) return null;
  const { context: { store }, cart, status, refresh } = view;

  return (
    <main className={`${MAISON_CONTAINER} py-14 lg:py-20`}>
      <h1 className="text-center font-heading text-5xl uppercase tracking-[0.08em] lg:text-6xl rtl:tracking-normal">Your bag</h1>

      {status === "error" ? (
        <p className="mt-12 text-center text-sm text-destructive" role="alert">
          We couldn&apos;t check current prices and stock.{" "}
          <button type="button" onClick={refresh} className={maisonLink}>Try again</button>
        </p>
      ) : status === "loading" && cart.lines.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground" role="status">Checking your bag…</p>
      ) : cart.lines.length === 0 ? (
        <div className="mt-16 border-t border-border pt-16 text-center">
          <p className="font-heading text-3xl">Your bag is empty.</p>
          <Link href="/shop" className={`mt-8 inline-block ${maisonLabel} ${maisonLink}`}>Discover the collection</Link>
        </div>
      ) : (
        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <section aria-label="Pieces in your bag" className="lg:col-span-8">
            <CartChangesNotice cart={cart} store={store} className="mb-8" />
            <ul className="border-t border-border">
              {cart.lines.map((line) => {
                const { product, quantity, lineTotalMinor } = line;
                return (
                  <li key={product.id} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-6 border-b border-border py-8 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
                    <Link href={productPath(product)} tabIndex={-1} aria-hidden>
                      <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[2/3] w-full" />
                    </Link>
                    <div className="min-w-0">
                      <Link href={productPath(product)} className={`${maisonLabel} leading-relaxed hover:opacity-60`}>{product.name}</Link>
                      <p className="mt-2 text-sm tabular-nums text-muted-foreground">{formatStoreMoney(store, product.priceMinor)}</p>
                      <CartLineChange line={line} store={store} />
                      <div className="mt-6 flex flex-wrap items-center gap-6">
                        <QuantitySelector
                          label={`Quantity for ${product.name}`}
                          value={quantity}
                          max={product.stock}
                          onChange={(value) => setCartQuantity(product.id, value)}
                        />
                        <button type="button" onClick={() => removeFromCart(product.id)} className={`text-xs text-muted-foreground ${maisonLink}`}>
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

          <aside className="h-fit border border-border p-8 lg:sticky lg:top-28 lg:col-span-4">
            <p className={maisonLabel}>Summary</p>
            <div className="mt-6">
              <CartTotals cart={cart} store={store} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
              {status === "loading" ? "Checking current prices and stock…" : "Delivery or collection is confirmed at checkout."}
            </p>
            <Link href="/checkout" aria-disabled={status !== "ready"} className={`${maisonButton} mt-8 ${status !== "ready" ? "pointer-events-none opacity-40" : ""}`}>
              Checkout
            </Link>
            <Link href="/shop" className={`mt-5 block text-center ${maisonLabel} ${maisonLink}`}>Continue browsing</Link>
          </aside>
        </div>
      )}
    </main>
  );
}

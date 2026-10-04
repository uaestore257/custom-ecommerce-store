"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice, CartLineChange } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { CartTotals } from "@/components/storefront/OrderSummary";
import { removeFromCart, setCartQuantity, useCart, useStorefrontMessages } from "@/lib/storefront";
import { formatStoreMoney } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { NoorOrnament } from "./Ornament";
import { NOOR_CONTAINER, noorAccentButton, noorLink, noorTitle } from "./styles";
import { useNoor } from "./useNoor";

/** Noor's cart page: arched thumbnails in a centred list beside the summary. Behaviour is the shared cart hook. */
export function NoorCart() {
  const view = useCart();
  const shared = useStorefrontMessages();
  const { t } = useNoor();
  if (!view) return null;
  const { context: { store }, cart, status, refresh } = view;

  return (
    <main className={`${NOOR_CONTAINER} py-12 lg:py-16`}>
      <header className="text-center">
        <h1 className={noorTitle}>{t.yourCart}</h1>
        {cart.lines.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{shared.items(cart.itemCount)}</p>}
        <NoorOrnament className="mt-6" />
      </header>

      {status === "error" ? (
        <p className="mt-10 text-center text-sm text-destructive" role="alert">
          {t.couldNotCheck}{" "}
          <button type="button" onClick={refresh} className={noorLink}>{t.tryAgain}</button>
        </p>
      ) : status === "loading" && cart.lines.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground" role="status">{t.checking}</p>
      ) : cart.lines.length === 0 ? (
        <div className="mx-auto mt-12 max-w-md text-center">
          <p className="font-heading text-2xl">{t.cartEmpty}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.cartEmptyText}</p>
          <Link href="/shop" className={`${noorAccentButton} mt-8`}>{t.shopTheCollection}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-label={t.yourCart}>
            <CartChangesNotice cart={cart} store={store} className="mb-6" />
            <ul className="divide-y divide-border border-y border-border">
              {cart.lines.map((line) => {
                const { product, quantity, lineTotalMinor } = line;
                return (
                  <li key={product.id} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-5 py-6 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
                    <Link href={productPath(product)} tabIndex={-1} aria-hidden className="block rounded-t-full border border-border p-1">
                      <span className="block overflow-hidden rounded-t-full">
                        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[3/4] w-full" />
                      </span>
                    </Link>
                    <div className="min-w-0">
                      <Link href={productPath(product)} className="font-heading text-lg leading-snug hover:text-accent">{product.name}</Link>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">{t.each(formatStoreMoney(store, product.priceMinor))}</p>
                      <CartLineChange line={line} store={store} />
                      <div className="mt-4 flex flex-wrap items-center gap-5">
                        <QuantitySelector label={t.quantityFor(product.name)} value={quantity} max={product.stock} onChange={(value) => setCartQuantity(product.id, value)} />
                        <button type="button" onClick={() => removeFromCart(product.id)} className={`text-sm text-muted-foreground ${noorLink}`}>
                          {t.remove}<span className="sr-only"> {product.name}</span>
                        </button>
                      </div>
                    </div>
                    <p className="col-start-2 text-base tabular-nums sm:col-start-3 sm:text-end">{formatStoreMoney(store, lineTotalMinor)}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{shared.notReserved}</p>
          </section>

          <aside aria-label={t.summary} className="h-fit rounded-t-[2.5rem] border border-border bg-surface p-7 text-center lg:sticky lg:top-40">
            <p className="font-heading text-xl">{t.summary}</p>
            <div className="mt-5 text-start">
              <CartTotals cart={cart} store={store} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{status === "loading" ? t.checking : t.chosenAtCheckout}</p>
            <Link href="/checkout" aria-disabled={status !== "ready"} className={`${noorAccentButton} mt-6 w-full ${status !== "ready" ? "pointer-events-none opacity-50" : ""}`}>
              {t.checkout}
            </Link>
            <Link href="/shop" className={`mt-4 inline-block text-sm ${noorLink}`}>{t.continueShopping}</Link>
          </aside>
        </div>
      )}
    </main>
  );
}

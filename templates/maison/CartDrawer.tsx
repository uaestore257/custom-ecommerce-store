"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import { overlayPanelMotion, StorefrontOverlay } from "@/components/storefront/Overlay";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { formatStoreMoney } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { maisonButton, maisonLabel, maisonLink } from "./styles";

/**
 * Maison's bag: a full-height drawer from the inline-end edge (mirrors in
 * RTL) on every screen size. Behaviour — focus, Escape, scroll lock, inert
 * page, closing on navigation — is the shared StorefrontOverlay; the cart
 * is the shared cart hook; checkout is the shared page.
 */
export function MaisonCartDrawer() {
  const { open, hide } = useCartDrawer();
  const view = useCart({ refreshOnMount: false });
  const closeRef = useRef<HTMLButtonElement>(null);
  const refresh = view?.refresh;

  // Fresh prices and stock every time the bag opens.
  useEffect(() => {
    if (open) refresh?.();
  }, [open, refresh]);

  if (!view) return null;
  const { context: { store }, cart, status } = view;

  return (
    <StorefrontOverlay
      open={open}
      onClose={hide}
      label="Your bag"
      initialFocusRef={closeRef}
      as="aside"
      backdropClassName={`absolute inset-0 bg-[#0c0b0a]/40 transition-opacity duration-500 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      panelClassName={`absolute inset-y-0 end-0 flex w-full max-w-md flex-col border-s border-border bg-surface-elevated transition-[transform,visibility] duration-500 ease-out motion-reduce:transition-none ${overlayPanelMotion("end", open)}`}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <p className={maisonLabel}>Your bag ({cart.itemCount})</p>
        <button ref={closeRef} type="button" onClick={hide} aria-label="Close bag" className="-me-2 p-2 hover:opacity-60 focus:outline-none focus-visible:ring-1 focus-visible:ring-focus">
          <X className="h-5 w-5" strokeWidth={1.25} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {status === "error" ? (
          <p className="text-sm text-destructive">We couldn&apos;t check current prices. Please try again.</p>
        ) : cart.lines.length === 0 ? (
          status === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">Checking your bag…</p>
          ) : (
            <div className="py-16 text-center">
              <p className="font-heading text-3xl">Your bag is empty.</p>
              <Link href="/shop" className={`mt-6 inline-block ${maisonLabel} ${maisonLink}`}>Discover the collection</Link>
            </div>
          )
        ) : (
          <>
            <CartChangesNotice cart={cart} store={store} className="mb-6" />
            <ul className="divide-y divide-border">
              {cart.lines.map(({ product, quantity, lineTotalMinor }) => (
                <li key={product.id} className="flex gap-5 py-5 first:pt-0">
                  <Link href={productPath(product)} tabIndex={-1} aria-hidden className="shrink-0">
                    <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[2/3] w-20" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={productPath(product)} className={`${maisonLabel} leading-relaxed hover:opacity-60`}>{product.name}</Link>
                    <p className="mt-1 text-sm tabular-nums">{formatStoreMoney(store, lineTotalMinor)}</p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <QuantitySelector
                        label={`Quantity for ${product.name}`}
                        value={quantity}
                        max={product.stock}
                        onChange={(value) => setCartQuantity(product.id, value)}
                        className="origin-[left_center] scale-90 rtl:origin-[right_center]"
                      />
                      <button type="button" onClick={() => removeFromCart(product.id)} className={`text-xs text-muted-foreground ${maisonLink}`}>
                        Remove<span className="sr-only"> {product.name}</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {cart.lines.length > 0 && (
        <div className="border-t border-border px-6 py-6">
          <div className="flex justify-between text-sm">
            <span className={maisonLabel}>Subtotal</span>
            <span className="tabular-nums">{formatStoreMoney(store, cart.subtotalMinor)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Delivery or collection is chosen at checkout.</p>
          <Link href="/checkout" aria-disabled={status !== "ready"} className={`${maisonButton} mt-6 ${status !== "ready" ? "pointer-events-none opacity-40" : ""}`}>
            Checkout
          </Link>
          <Link href="/cart" className={`mt-4 block text-center ${maisonLabel} ${maisonLink}`}>View bag</Link>
        </div>
      )}
    </StorefrontOverlay>
  );
}

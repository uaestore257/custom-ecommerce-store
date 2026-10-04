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
import { kineticButton } from "./styles";

/**
 * Kinetic's cart surface: a bottom sheet on phones and tablets, a side
 * drawer from the inline-end edge on large screens (the shared overlay's
 * "sheet" placement). Behaviour — focus, Escape, scroll lock, inert page,
 * closing on navigation — is the shared StorefrontOverlay; cart maths is
 * the shared cart hook; checkout is the shared page.
 */
export function KineticCartSheet() {
  const { open, hide } = useCartDrawer();
  const view = useCart({ refreshOnMount: false });
  const closeRef = useRef<HTMLButtonElement>(null);
  const refresh = view?.refresh;

  // Fresh prices and stock every time the sheet opens.
  useEffect(() => {
    if (open) refresh?.();
  }, [open, refresh]);

  if (!view) return null;
  const { context: { store }, cart, status } = view;

  return (
    <StorefrontOverlay
      open={open}
      onClose={hide}
      label="Your cart"
      initialFocusRef={closeRef}
      backdropClassName={`absolute inset-0 bg-foreground/40 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      panelClassName={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col border-t-2 border-foreground bg-surface-elevated transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none lg:inset-x-auto lg:inset-y-0 lg:end-0 lg:max-h-none lg:w-full lg:max-w-md lg:border-t-0 lg:border-s-2 ${overlayPanelMotion("sheet", open)}`}
    >
      <div aria-hidden className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border lg:hidden" />
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-4">
        <p className="font-heading text-xl font-extrabold">
          Your cart <span className="tabular-nums text-muted-foreground">({cart.itemCount})</span>
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={hide}
          aria-label="Close cart"
          className="flex h-10 w-10 items-center justify-center rounded-control border-2 border-foreground hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {status === "error" ? (
          <p className="text-sm text-destructive">We couldn&apos;t check current prices. Please try again.</p>
        ) : cart.lines.length === 0 ? (
          status === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">Checking your cart…</p>
          ) : (
            <div className="py-10 text-center">
              <p className="font-heading text-2xl font-extrabold">Your cart is empty.</p>
              <Link href="/shop" className={`${kineticButton} mt-6 w-auto`}>Shop all products</Link>
            </div>
          )
        ) : (
          <>
            <CartChangesNotice cart={cart} store={store} className="mb-5" />
            <ul className="space-y-4">
              {cart.lines.map(({ product, quantity, lineTotalMinor }) => (
                <li key={product.id} className="flex gap-3 border-2 border-foreground bg-surface p-2.5">
                  <Link href={productPath(product)} tabIndex={-1} aria-hidden className="shrink-0 bg-accent/10">
                    <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-20" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <Link href={productPath(product)} className="line-clamp-2 font-heading text-base font-bold leading-snug hover:underline">
                        {product.name}
                      </Link>
                      <p className="shrink-0 text-sm font-bold tabular-nums">{formatStoreMoney(store, lineTotalMinor)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                      <QuantitySelector
                        label={`Quantity for ${product.name}`}
                        value={quantity}
                        max={product.stock}
                        onChange={(value) => setCartQuantity(product.id, value)}
                        className="origin-[left_center] scale-90 rtl:origin-[right_center]"
                      />
                      <button type="button" onClick={() => removeFromCart(product.id)} className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground">
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
        <div className="border-t-2 border-foreground px-5 py-5">
          <div className="flex justify-between text-base font-bold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatStoreMoney(store, cart.subtotalMinor)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Delivery or pickup is chosen at checkout.</p>
          <Link href="/checkout" aria-disabled={status !== "ready"} className={`${kineticButton} mt-4 ${status !== "ready" ? "pointer-events-none opacity-50" : ""}`}>
            Checkout
          </Link>
          <Link href="/cart" className="mt-3 block text-center text-sm font-semibold underline underline-offset-4">View full cart</Link>
        </div>
      )}
    </StorefrontOverlay>
  );
}

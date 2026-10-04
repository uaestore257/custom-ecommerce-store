"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { CartChangesNotice } from "@/components/storefront/CartChanges";
import { QuantitySelector } from "@/components/storefront/CartControls";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/storefront";
import { formatStoreMoney } from "@/lib/storefront-cart";
import { productPath } from "@/lib/storefront-urls";
import { useCartDrawer } from "./CartDrawerContext";
import { atelierButton, atelierEyebrow, atelierTextLink } from "./styles";

/**
 * Atelier's cart surface: a drawer from the inline-end edge (mirrors in
 * RTL). Pure presentation over the shared cart hook; checkout is the
 * shared page.
 */
export function AtelierCartDrawer() {
  const { open, hide } = useCartDrawer();
  const view = useCart({ refreshOnMount: false });
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const refresh = view?.refresh;

  // Fresh prices and stock every time the drawer opens.
  useEffect(() => {
    if (!open) return;
    refresh?.();
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, hide, refresh]);

  // Navigating away (e.g. to checkout) closes the drawer.
  useEffect(() => {
    hide();
  }, [pathname, hide]);

  if (!view) return null;
  const { context: { store }, cart, status } = view;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-foreground/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={hide}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        inert={!open}
        className={`absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-surface-elevated transition-[transform,visibility] duration-300 ease-out ${
          open ? "visible translate-x-0 shadow-2xl" : "invisible translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <p className={atelierEyebrow}>Your bag · {cart.itemCount}</p>
          <button ref={closeRef} type="button" onClick={hide} aria-label="Close bag" className="p-2 text-foreground hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {status === "error" ? (
            <p className="text-sm text-destructive">We couldn&apos;t check current prices. Please try again.</p>
          ) : cart.lines.length === 0 ? (
            status === "loading" ? (
              <p className="text-sm text-muted-foreground" role="status">Checking your bag…</p>
            ) : (
              <div className="py-16 text-center">
                <p className="font-heading text-2xl">Your bag is empty.</p>
                <Link href="/shop" className={`mt-4 inline-block text-sm ${atelierTextLink}`}>Explore the collection</Link>
              </div>
            )
          ) : (
            <>
              <CartChangesNotice cart={cart} store={store} className="mb-6" />
              <ul className="space-y-6">
                {cart.lines.map(({ product, quantity, lineTotalMinor }) => (
                  <li key={product.id} className="flex gap-4">
                    <Link href={productPath(product)} tabIndex={-1} aria-hidden className="shrink-0">
                      <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[4/5] w-20" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-3">
                        <Link href={productPath(product)} className="font-heading text-lg leading-snug hover:opacity-70">{product.name}</Link>
                        <p className="shrink-0 text-sm tabular-nums">{formatStoreMoney(store, lineTotalMinor)}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <QuantitySelector
                          label={`Quantity for ${product.name}`}
                          value={quantity}
                          max={product.stock}
                          onChange={(value) => setCartQuantity(product.id, value)}
                          className="scale-90 origin-[left_center] rtl:origin-[right_center]"
                        />
                        <button type="button" onClick={() => removeFromCart(product.id)} className={`text-xs text-muted-foreground ${atelierTextLink}`}>
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
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatStoreMoney(store, cart.subtotalMinor)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Delivery or pickup is chosen at checkout.</p>
            <Link href="/checkout" aria-disabled={status !== "ready"} className={`${atelierButton} mt-5 ${status !== "ready" ? "pointer-events-none opacity-40" : ""}`}>
              Checkout
            </Link>
            <Link href="/cart" className={`mt-4 block text-center text-xs ${atelierTextLink}`}>View bag</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

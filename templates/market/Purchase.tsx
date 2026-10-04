"use client";

import { Minus, Plus } from "lucide-react";
import { AddToCartButton, ProductPurchase } from "@/components/storefront/CartControls";
import { setCartQuantity, useQuantityInCart } from "@/lib/storefront";
import type { CartProductRef } from "@/lib/storefront-types";
import { marketAddButton, marketButton } from "./styles";

/**
 * Card control for basket building: "Add" (the shared, store-guarded
 * add-to-cart) until the product is in the cart, then an inline stepper
 * for that cart line, capped at stock; stepping below one removes it.
 */
export function MarketCardControl({ product, shownStoreId, name }: { product: CartProductRef; shownStoreId: string; name: string }) {
  const inCart = useQuantityInCart(product.id);
  if (inCart <= 0 || product.stock <= 0) {
    return <AddToCartButton product={product} shownStoreId={shownStoreId} compact label="Add" buttonClassName={marketAddButton} />;
  }
  const step = "flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-accent-foreground hover:bg-black/10 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus";
  return (
    <div role="group" aria-label={`Quantity of ${name} in cart`} className="flex min-h-10 items-center justify-between rounded-control bg-accent text-accent-foreground">
      <button type="button" className={step} onClick={() => setCartQuantity(product.id, inCart - 1)} aria-label={inCart === 1 ? `Remove ${name} from cart` : `One fewer ${name}`}>
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="text-sm font-bold tabular-nums" aria-live="polite">{inCart}</span>
      <button type="button" className={step} onClick={() => setCartQuantity(product.id, Math.min(inCart + 1, product.stock))} disabled={inCart >= product.stock} aria-label={`One more ${name}`}>
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** The product page purchase: shared quantity + add, in Market's button. */
export function MarketPurchase({ product, shownStoreId }: { product: CartProductRef; shownStoreId: string }) {
  return <ProductPurchase product={product} shownStoreId={shownStoreId} buttonClassName={marketButton} />;
}

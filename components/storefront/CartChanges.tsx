"use client";

import { sfButtonClass, SfNotice } from "@/components/storefront/primitives";
import { acceptCartChanges } from "@/lib/storefront";
import { formatStoreMoney, hasCartChanges, type CartLine, type CartSummary } from "@/lib/storefront-cart";
import type { StorefrontStore } from "@/lib/storefront-types";

export function pluralItems(n: number) {
  return `${n} ${n === 1 ? "item" : "items"}`;
}

/** Explains what changed since items were added, and lets the shopper accept it. */
export function CartChangesNotice({ cart, store, className = "" }: { cart: CartSummary; store: StorefrontStore; className?: string }) {
  if (!hasCartChanges(cart)) return null;
  return (
    <SfNotice tone="warning" className={className}>
      <p className="font-semibold">Your cart was updated to match the store&apos;s current prices and stock.</p>
      <ul className="mt-2 list-disc space-y-1 ps-5">
        {cart.priceChangedCount > 0 && (
          <li>{pluralItems(cart.priceChangedCount)} changed price since you added {cart.priceChangedCount === 1 ? "it" : "them"}.</li>
        )}
        {cart.quantityReducedCount > 0 && (
          <li>{pluralItems(cart.quantityReducedCount)} had {cart.quantityReducedCount === 1 ? "its" : "their"} quantity reduced to what is in stock.</li>
        )}
        {cart.unavailableCount > 0 && (
          <li>
            {pluralItems(cart.unavailableCount)} {cart.unavailableCount === 1 ? "is" : "are"} no longer available and{" "}
            {cart.unavailableCount === 1 ? "was" : "were"} left out.
          </li>
        )}
      </ul>
      <p className="mt-2">The totals shown already use the current prices.</p>
      <button
        type="button"
        className={`${sfButtonClass("secondary", "sm")} mt-3`}
        onClick={() => acceptCartChanges(cart, store.id)}
      >
        OK, update my cart
      </button>
    </SfNotice>
  );
}

/** Per-line explanation of a price or quantity change, or nothing. */
export function CartLineChange({ line, store }: { line: CartLine; store: StorefrontStore }) {
  if (!line.previousPriceMinor && line.quantity === line.requestedQuantity) return null;
  return (
    <div className="mt-1 space-y-0.5 text-xs font-medium text-warning">
      {line.previousPriceMinor && (
        <p>
          Price changed: was {formatStoreMoney(store, line.previousPriceMinor)}, now{" "}
          {formatStoreMoney(store, line.product.priceMinor)}.
        </p>
      )}
      {line.quantity < line.requestedQuantity && (
        <p>
          Only {line.product.stock} available — you asked for {line.requestedQuantity}.
        </p>
      )}
    </div>
  );
}

export const NOT_RESERVED_NOTE = "Items in your cart are not reserved — stock can change at any time.";

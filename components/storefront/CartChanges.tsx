"use client";

import { sfButtonClass, SfNotice } from "@/components/storefront/primitives";
import { acceptCartChanges } from "@/lib/storefront";
import { formatStoreMoney, hasCartChanges, type CartLine, type CartSummary } from "@/lib/storefront-cart";
import { messagesFor, storefrontMessages } from "@/lib/storefront-i18n";
import type { StorefrontStore } from "@/lib/storefront-types";

/** "1 item" / "3 items" (English; localized counts come from storefrontMessages(store).items). */
export function pluralItems(n: number) {
  return messagesFor("en").items(n);
}

/** Explains what changed since items were added, and lets the shopper accept it. */
export function CartChangesNotice({ cart, store, className = "" }: { cart: CartSummary; store: StorefrontStore; className?: string }) {
  if (!hasCartChanges(cart)) return null;
  const t = storefrontMessages(store);
  return (
    <SfNotice tone="warning" className={className}>
      <p className="font-semibold">{t.cartUpdatedTitle}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5">
        {cart.priceChangedCount > 0 && <li>{t.pricesChanged(cart.priceChangedCount)}</li>}
        {cart.quantityReducedCount > 0 && <li>{t.quantitiesReduced(cart.quantityReducedCount)}</li>}
        {cart.unavailableCount > 0 && <li>{t.noLongerAvailable(cart.unavailableCount)}</li>}
      </ul>
      <p className="mt-2">{t.totalsUseCurrentPrices}</p>
      <button
        type="button"
        className={`${sfButtonClass("secondary", "sm")} mt-3`}
        onClick={() => acceptCartChanges(cart, store.id)}
      >
        {t.acceptCartChanges}
      </button>
    </SfNotice>
  );
}

/** Per-line explanation of a price or quantity change, or nothing. */
export function CartLineChange({ line, store }: { line: CartLine; store: StorefrontStore }) {
  if (!line.previousPriceMinor && line.quantity === line.requestedQuantity) return null;
  const t = storefrontMessages(store);
  return (
    <div className="mt-1 space-y-0.5 text-xs font-medium text-warning">
      {line.previousPriceMinor && (
        <p>{t.priceChanged(formatStoreMoney(store, line.previousPriceMinor), formatStoreMoney(store, line.product.priceMinor))}</p>
      )}
      {line.quantity < line.requestedQuantity && (
        <p>{t.onlyAvailable(line.product.stock, line.requestedQuantity)}</p>
      )}
    </div>
  );
}

/** English note (templates showing English); localized: storefrontMessages(store).notReserved. */
export const NOT_RESERVED_NOTE = messagesFor("en").notReserved;

import { formatMoney } from "@/lib/format";
import { formatStoreMoney, type CartSummary } from "@/lib/storefront-cart";
import type { StorefrontStore } from "@/lib/storefront-types";
import type { CurrencyCode } from "@/lib/types";

/**
 * Storefront cart / checkout totals, in exact minor units from the
 * current server catalog.
 */
export function CartTotals({ cart, store }: { cart: CartSummary; store: StorefrontStore }) {
  const freeOver = store.freeDeliveryOverMinor === null ? null : BigInt(store.freeDeliveryOverMinor);
  const missingForFree = freeOver !== null && cart.subtotalMinor < freeOver ? freeOver - cart.subtotalMinor : null;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">Subtotal</dt>
        <dd className="font-medium tabular-nums">{formatStoreMoney(store, cart.subtotalMinor)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-slate-600">Delivery</dt>
        <dd className="text-right font-medium tabular-nums">
          {!cart.deliveryConfigured
            ? "To be confirmed by the store"
            : cart.deliveryMinor === BigInt(0)
              ? "Free"
              : formatStoreMoney(store, cart.deliveryMinor)}
        </dd>
      </div>
      {cart.deliveryConfigured && missingForFree !== null && (
        <p className="text-xs text-slate-500">
          Add {formatStoreMoney(store, missingForFree)} more for free delivery.
        </p>
      )}
      <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
        <dt className="font-semibold">{cart.deliveryConfigured ? "Total" : "Total (excluding delivery)"}</dt>
        <dd className="font-bold tabular-nums">{formatStoreMoney(store, cart.totalMinor)}</dd>
      </div>
    </dl>
  );
}

/** Subtotal / delivery / total block for the admin's browser-only demo orders. */
export function OrderTotals({
  subtotal,
  deliveryFee,
  total,
  currency,
  freeDeliveryThreshold = 0,
}: {
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: CurrencyCode;
  freeDeliveryThreshold?: number;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">Subtotal</dt>
        <dd className="font-medium tabular-nums">{formatMoney(subtotal, currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-600">Delivery</dt>
        <dd className="font-medium tabular-nums">
          {deliveryFee === 0 ? "Free" : formatMoney(deliveryFee, currency)}
        </dd>
      </div>
      {freeDeliveryThreshold > 0 && subtotal < freeDeliveryThreshold && (
        <p className="text-xs text-slate-500">
          Add {formatMoney(freeDeliveryThreshold - subtotal, currency)} more for free delivery.
        </p>
      )}
      <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
        <dt className="font-semibold">Total</dt>
        <dd className="font-bold tabular-nums">{formatMoney(total, currency)}</dd>
      </div>
    </dl>
  );
}

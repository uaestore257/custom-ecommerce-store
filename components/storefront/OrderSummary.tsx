import { formatMoney } from "@/lib/format";
import { formatStoreMoney, type CartSummary } from "@/lib/storefront-cart";
import { storefrontMessages } from "@/lib/storefront-i18n";
import type { StorefrontStore } from "@/lib/storefront-types";
import type { CheckoutFulfillmentMethod } from "@/lib/checkout";
import type { CurrencyCode } from "@/lib/types";

/**
 * Storefront cart / checkout totals, in exact minor units from a fresh
 * server read of the cart's products (shared by every template).
 */
export function CartTotals({
  cart,
  store,
  fulfillmentMethod = cart.requiresPickup ? "PICKUP" : "DELIVERY",
}: {
  cart: CartSummary;
  store: StorefrontStore;
  fulfillmentMethod?: CheckoutFulfillmentMethod;
}) {
  const deliveryMinor = fulfillmentMethod === "PICKUP" ? BigInt(0) : cart.deliveryMinor;
  const totalMinor = cart.subtotalMinor + deliveryMinor;
  const t = storefrontMessages(store);
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t.subtotal}</dt>
        <dd className="font-medium tabular-nums">{formatStoreMoney(store, cart.subtotalMinor)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{fulfillmentMethod === "PICKUP" ? t.pickup : t.delivery}</dt>
        <dd className="text-end font-medium tabular-nums">
          {fulfillmentMethod === "PICKUP"
            ? t.noDeliveryFee
            : deliveryMinor === BigInt(0)
              ? t.free
              : formatStoreMoney(store, deliveryMinor)}
        </dd>
      </div>
      <div className="flex justify-between gap-3 border-t border-border pt-3 text-base">
        <dt className="font-semibold">{t.total}</dt>
        <dd className="font-bold tabular-nums">{formatStoreMoney(store, totalMinor)}</dd>
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
}: {
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: CurrencyCode;
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
      <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
        <dt className="font-semibold">Total</dt>
        <dd className="font-bold tabular-nums">{formatMoney(total, currency)}</dd>
      </div>
    </dl>
  );
}

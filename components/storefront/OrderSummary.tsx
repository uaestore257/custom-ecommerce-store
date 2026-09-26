import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

/** Subtotal / delivery / total block used by the cart and checkout. */
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

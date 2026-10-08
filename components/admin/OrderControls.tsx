"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrderAction, recordStripeRefundAction, setOrderPaymentAction, setOrderStatusAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, Card } from "@/components/ui";
import { cancelProblem, nextOrderStatus, paymentProblem } from "@/lib/admin/order-rules";
import type { ActionResult, AdminOrderDetail, DbOrderStatus } from "@/lib/admin/types";
import { paymentMethodLabel } from "@/lib/config";
import type { PaymentMethodId } from "@/lib/types";

// Status and payment controls on the admin order page. The buttons shown
// follow lib/admin/order-rules.ts, but the server re-checks everything:
// each call sends the status this page shows, and is refused if the order
// changed in the meantime.

const STATUS_LABEL: Record<DbOrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

type Confirming = "cancel" | "unpaid" | null;

export function OrderControls({ storeId, order }: { storeId: string; order: AdminOrderDetail }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [refundId, setRefundId] = useState("");
  const [pending, startTransition] = useTransition();

  const next = nextOrderStatus(order.status);
  const cancelBlocked = cancelProblem(order.status, order.paymentStatus);
  const paymentBlocked = paymentProblem(order.status, order.paymentMethod);
  const paid = order.paymentStatus === "PAID";
  const paymentLabel =
    order.paymentStatus === "PARTIALLY_REFUNDED"
      ? "Partially refunded"
      : order.paymentStatus === "REFUNDED"
        ? "Refunded"
        : paid
          ? "Paid"
          : "Unpaid";
  const manualPaymentStatus = order.paymentStatus === "UNPAID" || order.paymentStatus === "PAID";

  function run(call: () => Promise<ActionResult<unknown>>) {
    setMessage(null);
    startTransition(async () => {
      const result = await call();
      setConfirming(null);
      setMessage({ ok: result.ok, text: result.ok ? (result.message ?? "Saved.") : result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Status</h2>
        <div className="mt-3"><StatusBadge status={order.status} /></div>
        <div className="mt-4 flex flex-col gap-2">
          {next && (
            <button
              type="button"
              disabled={pending}
              className={buttonClass("primary")}
              onClick={() => run(() => setOrderStatusAction(storeId, order.id, order.status, next))}
            >
              {pending ? "Saving…" : `Mark as ${STATUS_LABEL[next].toLowerCase()}`}
            </button>
          )}
          {!cancelBlocked && (
            <button type="button" disabled={pending} className={buttonClass("secondary")} onClick={() => setConfirming("cancel")}>
              Cancel order
            </button>
          )}
        </div>
        {cancelBlocked && (order.status === "PENDING" || order.status === "PROCESSING") && (
          <p className="mt-3 text-xs text-slate-500">{cancelBlocked}</p>
        )}
        {!next && <p className="mt-3 text-xs text-slate-500">This order is {STATUS_LABEL[order.status].toLowerCase()}. Its status can&apos;t change any more.</p>}
        <p className="mt-3 text-xs text-slate-500">Changing the status doesn&apos;t notify the customer or a courier.</p>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Payment</h2>
        <p className="mt-2 text-sm font-medium">
          {order.paymentMethod ? paymentMethodLabel(order.paymentMethod as PaymentMethodId) : "—"}
        </p>
        <p className={`mt-1 text-sm font-semibold ${paid || order.paymentStatus !== "UNPAID" ? "text-emerald-700" : "text-amber-700"}`}>{paymentLabel}</p>
        {order.paymentTransactionStatus === "RECONCILIATION" && (
          <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {order.paymentTransactionFailureCode === "checkout_attempt_expired_unrecoverable_session"
              ? "The Stripe checkout attempt expired without a recoverable session. No replacement session was created because its idempotency window elapsed. Check the connected account's Stripe Dashboard and await or investigate a verified webhook; this order has not been marked paid. If Stripe confirms payment, record a completed refund only after its signed webhook provides a verifiable payment reference."
              : "Stripe confirmed a payment after this order was cancelled. It is held for reconciliation; the order was not reopened or marked paid. Verify and record a completed refund below, or resolve it through your established support process."}
          </p>
        )}
        {order.paymentTransactionReference && (
          <p className="mt-2 break-all text-xs text-slate-500">
            Provider reference: <span className="font-mono">{order.paymentTransactionReference}</span>
          </p>
        )}
        {paymentBlocked ? (
          <p className="mt-3 text-xs text-slate-500">{paymentBlocked}</p>
        ) : !manualPaymentStatus ? (
          <p className="mt-3 text-xs text-slate-500">Refund payment states can only be set from verified provider evidence.</p>
        ) : paid ? (
          <button type="button" disabled={pending} className={`${buttonClass("secondary")} mt-4 w-full`} onClick={() => setConfirming("unpaid")}>
            Mark as unpaid
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            className={`${buttonClass("primary")} mt-4 w-full`}
            onClick={() => run(() => setOrderPaymentAction(storeId, order.id, "UNPAID", "PAID"))}
          >
            {pending ? "Saving…" : "Mark as paid"}
          </button>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Mark an order paid only after the money has actually been received. Stripe payment and refund states are verified with Stripe and cannot be changed manually.
        </p>
        {order.refunds.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-medium">Recorded Stripe refunds</h3>
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              {order.refunds.map((refund) => (
                <li key={refund.providerRefundId} className="break-all">
                  {refund.amountDisplay} · {refund.providerRefundId} · {new Date(refund.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}
        {order.stripeRefundRecordAvailable && order.paymentStatus !== "REFUNDED" && (
          <form
            className="mt-4 border-t border-slate-200 pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => recordStripeRefundAction(storeId, order.id, refundId));
            }}
          >
            <label htmlFor="stripe-refund-id" className="block text-sm font-medium">Record a completed Stripe Dashboard refund</label>
            <input
              id="stripe-refund-id"
              value={refundId}
              onChange={(event) => setRefundId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="re_…"
              maxLength={255}
              autoComplete="off"
              disabled={pending}
            />
            <p className="mt-2 text-xs text-slate-500">
              Only enter a refund ID after Stripe shows it as successful. The server verifies the refund, amount, currency and connected account before recording it.
            </p>
            <button type="submit" disabled={pending || !refundId.trim()} className={`${buttonClass("secondary")} mt-3 w-full`}>
              {pending ? "Verifying…" : "Verify and record refund"}
            </button>
          </form>
        )}
      </Card>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <ConfirmDialog
        open={confirming === "cancel"}
        title={`Cancel order ${order.number}?`}
        confirmLabel={pending ? "Cancelling…" : "Cancel order"}
        cancelLabel="Keep order"
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => run(() => cancelOrderAction(storeId, order.id, order.status))}
      >
        {order.isSample
          ? "This is a sample order. It never reduced stock, so no stock is added back. A cancelled order can't be reopened."
          : "Its items are added back to stock. A cancelled order can't be reopened, and the customer isn't notified."}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirming === "unpaid"}
        title={`Mark order ${order.number} as unpaid?`}
        confirmLabel={pending ? "Saving…" : "Mark as unpaid"}
        onCancel={() => setConfirming(null)}
        onConfirm={() => run(() => setOrderPaymentAction(storeId, order.id, "PAID", "UNPAID"))}
      >
        Use this to fix a mistake, or after refunding the customer outside this system. The change is recorded.
      </ConfirmDialog>
    </>
  );
}

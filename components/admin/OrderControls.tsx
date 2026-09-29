"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrderAction, setOrderPaymentAction, setOrderStatusAction } from "@/app/admin/actions";
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
  const [pending, startTransition] = useTransition();

  const next = nextOrderStatus(order.status);
  const cancelBlocked = cancelProblem(order.status, order.paymentStatus);
  const paymentBlocked = paymentProblem(order.status, order.paymentMethod);
  const paid = order.paymentStatus === "PAID";

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
        <p className={`mt-1 text-sm font-semibold ${paid ? "text-emerald-700" : "text-amber-700"}`}>{paid ? "Paid" : "Unpaid"}</p>
        {paymentBlocked ? (
          <p className="mt-3 text-xs text-slate-500">{paymentBlocked}</p>
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
          Mark an order paid only after the money has actually been received. Nothing is charged or refunded here.
        </p>
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

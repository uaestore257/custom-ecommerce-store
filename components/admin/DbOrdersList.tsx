import Link from "next/link";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui";
import type { AdminOrderSummary } from "@/lib/admin/types";
import { paymentMethodLabel } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { PaymentMethodId } from "@/lib/types";

/** This store's orders from the database; each opens its order page. */
export function DbOrdersList({ orders, storeId, storeName }: { orders: AdminOrderSummary[]; storeId: string; storeName: string }) {
  return (
    <>
      <PageHeader
        title="Orders"
        description={`Orders placed in ${storeName}'s storefront, newest first. Open an order to update its status or payment.`}
      />
      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders yet" description="Orders placed in the storefront will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Placed</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3 text-right">Items</th>
                <th scope="col" className="px-4 py-3 text-right">Total</th>
                <th scope="col" className="px-4 py-3">Payment</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                    <Link href={`/admin/stores/${storeId}/orders/${order.id}`} className="hover:text-brand hover:underline">
                      {order.number}
                    </Link>
                    {order.isSample && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Sample</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(order.placedAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{order.customerName}</p>
                    <p className="text-xs text-slate-500">{order.customerEmail}</p>
                    {order.customerPhone && <p className="text-xs text-slate-500">{order.customerPhone}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{order.itemCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{order.totalDisplay}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p>{order.paymentMethod ? paymentMethodLabel(order.paymentMethod as PaymentMethodId) : "—"}</p>
                    <p className={`text-xs font-semibold ${order.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                      {order.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

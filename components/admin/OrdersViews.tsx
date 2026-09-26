"use client";

import Link from "next/link";
import { useState } from "react";
import { Receipt, SearchX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, Card, inputClass, LinkButton, Notice, PageHeader } from "@/components/ui";
import { OrderTotals } from "@/components/storefront/OrderSummary";
import { ORDER_STATUSES, paymentMethodLabel } from "@/lib/config";
import { updateOrderStatus } from "@/lib/demo-db";
import { formatDate, formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { useSelectedStore } from "./StoreContext";

export function OrdersListView() {
  const { store, data } = useSelectedStore();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const base = `/admin/stores/${store.id}`;
  const orders = [...data.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((o) => !status || o.status === status);

  return (
    <>
      <PageHeader
        title="Orders"
        description={`Demo orders placed in ${store.name}'s storefront.`}
        breadcrumbs={[
          { label: "Client stores", href: "/admin/stores" },
          { label: store.name, href: base },
          { label: "Orders" },
        ]}
      />
      <Notice className="mb-5">
        All orders here are demo data saved in this browser. No payments were taken and nothing is
        sent to a real business or courier.
      </Notice>

      {data.orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders yet"
          description={
            store.status === "active"
              ? "Orders appear here after a customer completes a demo checkout on this store's storefront."
              : "This store isn't active yet, so its storefront can't take orders."
          }
        />
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <label htmlFor="orders-status" className="sr-only">Filter by status</label>
            <select id="orders-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")} className={`${inputClass()} sm:w-48`}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No orders with this status"
              action={<button type="button" className={buttonClass("secondary")} onClick={() => setStatus("")}>Show all orders</button>}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Total</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <Link href={`${base}/orders/${order.id}`} className="font-semibold text-teal-700 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">{order.customerName}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums">{formatMoney(order.total, order.currency)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { store, data } = useSelectedStore();
  const base = `/admin/stores/${store.id}`;
  // Only orders of the selected store can be opened here.
  const order = data.orders.find((o) => o.id === orderId);
  const [savedStatus, setSavedStatus] = useState(false);

  if (!order) {
    return (
      <EmptyState
        icon={Receipt}
        title="Order not found"
        description={`This order does not exist in ${store.name}.`}
        action={<LinkButton href={`${base}/orders`}>Back to orders</LinkButton>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDate(order.createdAt)} · Demo order`}
        breadcrumbs={[
          { label: store.name, href: base },
          { label: "Orders", href: `${base}/orders` },
          { label: order.orderNumber },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="px-5 pt-5 text-lg font-semibold sm:px-6">Items</h2>
            <ul className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                  <span className="min-w-0">
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-slate-500">{item.sku} · {formatMoney(item.unitPrice, order.currency)} × {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{formatMoney(item.unitPrice * item.quantity, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              <OrderTotals subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} currency={order.currency} />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Customer & delivery</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{order.customerName}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd className="break-words font-medium">{order.customerEmail}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{order.customerPhone}</dd></div>
              <div><dt className="text-slate-500">City / emirate</dt><dd className="font-medium">{order.city}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-medium">{order.address}</dd></div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Status</h2>
            <div className="mt-3"><StatusBadge status={order.status} /></div>
            <label htmlFor="order-status" className="mt-4 block text-sm font-medium text-slate-700">Change status</label>
            <select
              id="order-status"
              value={order.status}
              onChange={(e) => {
                updateOrderStatus(store.id, order.id, e.target.value as OrderStatus);
                setSavedStatus(true);
              }}
              className={`${inputClass()} mt-1.5`}
            >
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {savedStatus && <p role="status" className="mt-2 text-sm text-emerald-700">Status updated.</p>}
            <p className="mt-3 text-xs text-slate-500">
              Changing status here does not notify the customer or a courier (demo).
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Payment</h2>
            <p className="mt-2 text-sm font-medium">{paymentMethodLabel(order.paymentMethod)}</p>
            <p className="mt-1 text-sm text-slate-500">
              Payment status is not tracked in this demo. No payment was processed or confirmed.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

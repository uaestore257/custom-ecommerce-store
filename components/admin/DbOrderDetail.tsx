import { Card, PageHeader } from "@/components/ui";
import type { AdminOrderDetail } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { OrderControls } from "./OrderControls";

/** One order of the store, from the database, with its status and payment controls. */
export function DbOrderDetail({
  storeId,
  storeName,
  order,
  readOnly = false,
}: {
  storeId: string;
  storeName: string;
  order: AdminOrderDetail;
  readOnly?: boolean;
}) {
  const base = `/admin/stores/${storeId}`;
  const { address } = order;
  const place = [address.city, address.region, address.countryCode].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDate(order.placedAt)}${order.isSample ? " · Sample order" : ""}`}
        breadcrumbs={[
          { label: storeName, href: base },
          { label: "Orders", href: `${base}/orders` },
          { label: order.number },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="px-5 pt-5 text-lg font-semibold sm:px-6">Items</h2>
            <ul className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {item.name}
                      {item.variantTitle && <span className="font-normal text-slate-500"> · {item.variantTitle}</span>}
                    </span>
                    <span className="text-slate-500">{item.sku} · {item.unitPriceDisplay} × {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{item.lineTotalDisplay}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-slate-200 px-5 py-4 text-sm sm:px-6">
              <Row label="Subtotal" value={order.subtotalDisplay} />
              <Row label="Delivery" value={order.shippingDisplay} />
              {order.discountDisplay && <Row label="Discount" value={`− ${order.discountDisplay}`} />}
              <Row label="Tax" value={order.taxDisplay} />
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{order.totalDisplay}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Customer & delivery</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{order.customerName}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd className="break-words font-medium">{order.customerEmail}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{order.customerPhone || "—"}</dd></div>
              <div><dt className="text-slate-500">City / emirate</dt><dd className="font-medium">{place || "—"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium">
                  {address.recipientName && address.recipientName !== order.customerName && <span className="block">{address.recipientName}</span>}
                  {address.line1 || "—"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        {!readOnly && <div className="space-y-6"><OrderControls storeId={storeId} order={order} /></div>}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-slate-600">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Package, Pause, Pencil, Play, Receipt, Settings, Users, type LucideIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { labelFor, paymentMethodLabel, STORE_TYPES } from "@/lib/config";
import { setStoreStatus } from "@/lib/demo-db";
import { formatDate, formatMoney, roundMoney } from "@/lib/format";
import { PreviewStorefrontButton } from "./PreviewStorefrontButton";
import { useSelectedStore } from "./StoreContext";

export function StoreOverviewView({ justCreated }: { justCreated: boolean }) {
  const { store, data } = useSelectedStore();
  const [confirmPause, setConfirmPause] = useState(false);
  const base = `/admin/stores/${store.id}`;
  const { settings } = store;

  const activeProducts = data.products.filter((p) => p.status === "active").length;
  const openOrders = data.orders.filter((o) => ["pending", "processing"].includes(o.status)).length;
  const demoRevenue = roundMoney(
    data.orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0),
  );
  const recentOrders = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const enabledPayments = settings.paymentMethods.filter((m) => m.enabled).map((m) => paymentMethodLabel(m.id));

  return (
    <>
      <PageHeader
        title="Store overview"
        breadcrumbs={[
          { label: "Agency Admin", href: "/admin" },
          { label: "Client stores", href: "/admin/stores" },
          { label: store.name },
        ]}
        actions={
          <>
            <PreviewStorefrontButton store={store} />
            <LinkButton href={`${base}/settings`} variant="secondary">
              <Pencil className="h-4 w-4" aria-hidden />
              Edit store
            </LinkButton>
            {store.status === "active" ? (
              <button type="button" className={buttonClass("secondary")} onClick={() => setConfirmPause(true)}>
                <Pause className="h-4 w-4" aria-hidden />
                Pause store
              </button>
            ) : (
              <button type="button" className={buttonClass("primary")} onClick={() => setStoreStatus(store.id, "active")}>
                <Play className="h-4 w-4" aria-hidden />
                Activate store
              </button>
            )}
          </>
        }
      />

      {justCreated && (
        <Notice tone="success" className="mb-6">
          <strong>{store.name}</strong> was created from the Master Ecommerce Template. Next, add
          products and review the store settings.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Active products" value={`${activeProducts} / ${data.products.length}`} />
        <Metric label="Open orders" value={String(openOrders)} />
        <Metric label="Customers" value={String(data.customers.length)} />
        <Metric label="Demo order value" value={formatMoney(demoRevenue, settings.currency)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Store information</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Detail label="Store name">{store.name}</Detail>
              <Detail label="Category">{labelFor(STORE_TYPES, store.type)}</Detail>
              <Detail label="Status"><StatusBadge status={store.status} /></Detail>
              <Detail label="Slug"><code className="rounded bg-slate-100 px-1.5 py-0.5">{store.slug}</code></Detail>
              <Detail label="Currency">{settings.currency}</Detail>
              <Detail label="Country / region">{settings.country}</Detail>
              <Detail label="Owner">{store.ownerName} · {store.ownerEmail}</Detail>
              <Detail label="Created">{formatDate(store.createdAt)}</Detail>
              <Detail label="Payment methods">{enabledPayments.join(", ") || "None enabled"}</Detail>
              <Detail label="Delivery fee">
                {formatMoney(settings.deliveryFee, settings.currency)}
                {settings.freeDeliveryThreshold > 0 && ` (free over ${formatMoney(settings.freeDeliveryThreshold, settings.currency)})`}
              </Detail>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Domain configuration</h2>
            <p className="mt-3 text-sm">
              {settings.domain ? (
                <>Configured domain: <code className="rounded bg-slate-100 px-1.5 py-0.5">{settings.domain}</code></>
              ) : (
                <span className="text-slate-600">No domain configured yet.</span>
              )}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Saved as configuration only. This demo does not register domains, change DNS or
              deploy a live site.
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <h2 className="text-lg font-semibold">Recent orders</h2>
              <Link href={`${base}/orders`} className="text-sm font-semibold text-teal-700 hover:underline">
                View all
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-5 pb-6 pt-3 text-sm text-slate-500 sm:px-6">No orders yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link href={`${base}/orders/${order.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50 sm:px-6">
                      <span className="min-w-0">
                        <span className="font-semibold">{order.orderNumber}</span>
                        <span className="block truncate text-slate-500">{order.customerName} · {formatDate(order.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="hidden font-medium tabular-nums sm:inline">{formatMoney(order.total, order.currency)}</span>
                        <StatusBadge status={order.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <nav aria-label="Manage this store" className="space-y-3">
          <QuickLink href={`${base}/products`} icon={Package} title="Products" text={`${data.products.length} products · ${data.categories.length} categories`} />
          <QuickLink href={`${base}/orders`} icon={Receipt} title="Orders" text={`${data.orders.length} demo orders`} />
          <QuickLink href={`${base}/customers`} icon={Users} title="Customers" text={`${data.customers.length} customers`} />
          <QuickLink href={`${base}/settings`} icon={Settings} title="Store settings" text="Branding, domain, delivery, payments" />
        </nav>
      </div>

      <ConfirmDialog
        open={confirmPause}
        title={`Pause ${store.name}?`}
        confirmLabel="Pause store"
        onCancel={() => setConfirmPause(false)}
        onConfirm={() => {
          setStoreStatus(store.id, "paused");
          setConfirmPause(false);
        }}
      >
        While paused, the storefront shows a notice and checkout is disabled. You can activate it again at any time.
      </ConfirmDialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-bold sm:text-2xl" title={value}>{value}</p>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-slate-500">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" aria-hidden />
    </Link>
  );
}

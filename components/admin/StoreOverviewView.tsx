"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Globe, Package, Pause, Pencil, Play, Receipt, Settings, Tags, Users, type LucideIcon } from "lucide-react";
import { setStoreStatusAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { labelFor, paymentMethodLabel, STORE_TYPES } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { AdminStoreDetail, DbStoreStatus } from "@/lib/admin/types";
import type { PaymentMethodId, StoreType } from "@/lib/types";
import type { StoreMembershipRole } from "@/lib/admin/store-access";
import { PreviewStorefrontButton } from "./PreviewStorefrontButton";
import { StoreDemoControls } from "./StoreDemoControls";

export function StoreOverviewView({
  store,
  previewUrl,
  activeProducts,
  justCreated,
  platform,
  role,
}: {
  store: AdminStoreDetail;
  previewUrl: string | null;
  activeProducts: number;
  justCreated: boolean;
  platform: boolean;
  role: StoreMembershipRole;
}) {
  const [confirmPause, setConfirmPause] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const base = `/admin/stores/${store.id}`;
  const enabledPayments = store.paymentMethods
    .filter((m) => m.enabled)
    .map((m) => paymentMethodLabel(m.method as PaymentMethodId));

  function changeStatus(status: DbStoreStatus) {
    startTransition(async () => {
      const result = await setStoreStatusAction(store.id, status);
      setError(result.ok ? null : result.error);
      setConfirmPause(false);
    });
  }

  return (
    <>
      <PageHeader
        title="Store overview"
        breadcrumbs={
          platform
            ? [
                { label: "Agency Admin", href: "/admin" },
                { label: "Client stores", href: "/admin/stores" },
                { label: store.name },
              ]
            : [{ label: store.name }]
        }
        actions={
          <>
            {(platform || role === "OWNER") && <PreviewStorefrontButton store={store} previewUrl={previewUrl} />}
            {platform && (
              <StoreDemoControls
                storeId={store.id}
                isDemo={store.isDemo}
                workServiceSlug={store.workServiceSlug}
                layout="inline"
              />
            )}
            {platform ? (
              <>
                <LinkButton href={`${base}/settings`} variant="secondary">
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit store
                </LinkButton>
                {store.status === "ACTIVE" ? (
                  <button type="button" disabled={pending} className={buttonClass("secondary")} onClick={() => setConfirmPause(true)}>
                    <Pause className="h-4 w-4" aria-hidden />
                    Pause store
                  </button>
                ) : (
                  <button type="button" disabled={pending} className={buttonClass("primary")} onClick={() => changeStatus("ACTIVE")}>
                    <Play className="h-4 w-4" aria-hidden />
                    {pending ? "Saving…" : store.status === "SUSPENDED" ? "Reactivate store" : "Activate store"}
                  </button>
                )}
              </>
            ) : role === "OWNER" ? (
              <LinkButton href="/admin/settings" variant="secondary">
                <Pencil className="h-4 w-4" aria-hidden />
                Store Settings
              </LinkButton>
            ) : null}
          </>
        }
      />

      {justCreated && (
        <Notice tone="success" className="mb-6">
          <strong>{store.name}</strong> was created in the database. Next, add products and review the store settings.
        </Notice>
      )}
      {error && <Notice tone="warning" className="mb-6">{error}</Notice>}
      {platform && (
        <p className="mb-6 text-sm text-slate-600">
          Portfolio includes only active, unarchived demo stores with a registered template, active products, a storefront URL,
          and an explicitly assigned Work service category.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Active products" value={`${activeProducts} / ${store.productCount}`} />
        <Metric label="Categories" value={String(store.categoryCount)} />
        <Metric label="Currency" value={store.baseCurrency} />
        <Metric label="Languages" value={store.languages.join(", ").toUpperCase()} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Store information</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Detail label="Store name">{store.name}</Detail>
              <Detail label="Category">
                {store.businessType ? labelFor(STORE_TYPES, store.businessType as StoreType) : "—"}
              </Detail>
              <Detail label="Status"><StatusBadge status={store.status} /></Detail>
              <Detail label="Slug"><code className="rounded bg-slate-100 px-1.5 py-0.5">{store.slug}</code></Detail>
              <Detail label="Country / region">{store.countryCode}</Detail>
              <Detail label="Currency">
                {store.baseCurrency} ({store.currencyMinorUnits} decimal place{store.currencyMinorUnits === 1 ? "" : "s"})
              </Detail>
              <Detail label="Timezone">{store.timezone}</Detail>
              <Detail label="Default language">{store.defaultLanguage}</Detail>
              <Detail label="Owner">{store.ownerName} · {store.ownerEmail}</Detail>
              <Detail label="Created">{formatDate(store.createdAt)}</Detail>
              <Detail label="Payment methods">{enabledPayments.join(", ") || "None enabled"}</Detail>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Custom domains</h2>
            <p className="mt-2 text-sm text-slate-600">
              Verified domains can provide the storefront&apos;s canonical public URL after production routing is configured by the platform team.
            </p>
          </Card>
        </div>

        <nav aria-label="Manage this store" className="space-y-3">
          {(platform || role === "OWNER" || role === "MANAGER") && (
            <>
              <QuickLink href={`${base}/products`} icon={Package} title="Products" text={`${store.productCount} products`} />
              <QuickLink href={`${base}/categories`} icon={Tags} title="Categories" text={`${store.categoryCount} categories`} />
            </>
          )}
          <QuickLink href={`${base}/orders`} icon={Receipt} title="Orders" text="Manage store orders" />
          <QuickLink href={`${base}/messages`} icon={Users} title="Messages" text="Customer enquiries" />
          {platform && <QuickLink href={`${base}/customers`} icon={Users} title="Customers" text="Demo data" />}
          {platform && (
            <QuickLink href={`${base}/settings`} icon={Settings} title="Store settings" text="Branding, region, delivery, payments" />
          )}
          {!platform && role === "OWNER" && (
            <QuickLink href="/admin/settings" icon={Settings} title="Store Settings" text="Branding, region, delivery, payments" />
          )}
          {!platform && (role === "OWNER" || role === "MANAGER") && (
            <QuickLink href="/admin/team" icon={Users} title="Team" text="Manage store memberships" />
          )}
          {!platform && (role === "OWNER" || role === "MANAGER") && (
            <QuickLink href="/admin/domains" icon={Globe} title="Custom domains" text="Verify storefront hostnames" />
          )}
        </nav>
      </div>

      <ConfirmDialog
        open={confirmPause}
        title={`Pause ${store.name}?`}
        confirmLabel={pending ? "Pausing…" : "Pause store"}
        onCancel={() => setConfirmPause(false)}
        onConfirm={() => changeStatus("PAUSED")}
      >
        A paused store is marked as not open for business. You can activate it again at any time.
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

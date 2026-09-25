"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Store as StoreIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { buttonClass } from "@/components/ui";
import { labelFor, STORE_STATUSES } from "@/lib/config";
import { switchStorefrontStore, useStorefront, type StorefrontView } from "@/lib/storefront";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

/**
 * Wraps every public storefront page: demo bar, header, footer and the
 * selected store's accent colour.
 */
export function StorefrontShell({ children }: { children: ReactNode }) {
  const view = useStorefront();

  if (view === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="h-9 bg-slate-900" />
        <div className="h-[73px] border-b border-slate-200" />
        <LoadingState label="Loading store…" />
      </div>
    );
  }

  if (view === null) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24">
        <EmptyState
          icon={StoreIcon}
          title="No client stores yet"
          description="Create a client store in the agency admin to see its storefront here."
          action={
            <Link href="/admin/stores/new" className={buttonClass("primary")}>
              Create a store
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-white text-slate-900"
      style={{ "--brand": view.store.settings.accentColor } as CSSProperties}
    >
      <DemoBar view={view} />
      <PublicHeader store={view.store} cartCount={view.cartCount} />
      <div className="flex-1">{children}</div>
      <PublicFooter store={view.store} />
    </div>
  );
}

/** Lets the demo viewer switch which client store the storefront shows. */
function DemoBar({ view }: { view: StorefrontView }) {
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const pendingStore = view.state.stores.find((s) => s.id === pendingStoreId);

  function requestSwitch(storeId: string) {
    if (storeId === view.store.id) return;
    if (view.cartCount > 0) setPendingStoreId(storeId);
    else switchStorefrontStore(storeId);
  }

  return (
    <div className="bg-slate-900 text-xs text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-white">
            Demo
          </span>
          <label htmlFor="demo-store-select">Viewing storefront:</label>
          <select
            id="demo-store-select"
            value={view.store.id}
            onChange={(event) => requestSwitch(event.target.value)}
            className="rounded border border-white/20 bg-slate-800 px-1.5 py-0.5 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {view.state.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
                {store.status !== "active" ? ` (${labelFor(STORE_STATUSES, store.status)})` : ""}
              </option>
            ))}
          </select>
          {view.store.status !== "active" && (
            <span className="text-amber-300">
              Preview only — this store is {labelFor(STORE_STATUSES, view.store.status).toLowerCase()} and not accepting orders.
            </span>
          )}
        </div>
        <Link href="/admin" className="font-medium text-white underline-offset-2 hover:underline">
          Agency admin →
        </Link>
      </div>

      <ConfirmDialog
        open={pendingStore !== undefined}
        title={`Switch to ${pendingStore?.name ?? "another store"}?`}
        confirmLabel="Switch and empty cart"
        cancelLabel="Keep current store"
        onCancel={() => setPendingStoreId(null)}
        onConfirm={() => {
          if (pendingStoreId) switchStorefrontStore(pendingStoreId);
          setPendingStoreId(null);
        }}
      >
        Your cart has {view.cartCount} {view.cartCount === 1 ? "item" : "items"} from{" "}
        <strong>{view.store.name}</strong>. A cart can only hold products from one store, so
        switching will empty it.
      </ConfirmDialog>
    </div>
  );
}

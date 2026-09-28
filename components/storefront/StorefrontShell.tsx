"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Store as StoreIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass } from "@/components/ui";
import {
  StorefrontDataContext,
  switchStorefrontStore,
  syncCartStore,
  useStorefront,
  type StorefrontView,
} from "@/lib/storefront";
import type { StorefrontCatalog, StorefrontStoreOption } from "@/lib/storefront-types";
import { PlatformContactDisclosure } from "@/components/PlatformContactDisclosure";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

/**
 * Wraps every public storefront page: demo bar, header, footer and the
 * shown store's accent colour. The catalog comes from the server
 * (app/(storefront)/layout.tsx), for an ACTIVE store only.
 */
export function StorefrontShell({
  children,
  isAdminHost,
  catalog,
  stores,
}: {
  children: ReactNode;
  isAdminHost: boolean;
  catalog: StorefrontCatalog | null;
  stores: StorefrontStoreOption[];
}) {
  const data = useMemo(() => ({ catalog, stores }), [catalog, stores]);
  return (
    <StorefrontDataContext.Provider value={data}>
      <ShellBody isAdminHost={isAdminHost}>{children}</ShellBody>
    </StorefrontDataContext.Provider>
  );
}

function ShellBody({ children, isAdminHost }: { children: ReactNode; isAdminHost: boolean }) {
  const view = useStorefront();
  const shownStoreId = view?.store.id;

  // A cart saved for another store (switched in another tab, or its store
  // is no longer public) must never show up here: empty it.
  useEffect(() => {
    if (shownStoreId) syncCartStore(shownStoreId);
  }, [shownStoreId]);

  if (!view) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24">
        <EmptyState
          icon={StoreIcon}
          title="This storefront isn't available right now"
          description="There is no active store to show here yet."
          action={
            isAdminHost ? (
              <Link href="/admin/stores" className={buttonClass("primary")}>
                Manage stores
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-white text-slate-900"
      style={{ "--brand": view.store.accentColor } as CSSProperties}
    >
      <DemoBar view={view} isAdminHost={isAdminHost} />
      <PublicHeader store={view.store} cartCount={view.cart.itemCount} />
      <div className="flex-1">{children}</div>
      <PublicFooter store={view.store} isAdminHost={isAdminHost} />
    </div>
  );
}

/** Lets the demo viewer switch between the ACTIVE stores. Draft and other non-public stores are never listed. */
function DemoBar({ view, isAdminHost }: { view: StorefrontView; isAdminHost: boolean }) {
  const router = useRouter();
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const pendingStore = view.stores.find((s) => s.id === pendingStoreId);
  const cartCount = view.cart.itemCount;

  function switchTo(storeId: string) {
    switchStorefrontStore(storeId);
    router.refresh();
  }

  function requestSwitch(storeId: string) {
    if (storeId === view.store.id) return;
    if (cartCount > 0) setPendingStoreId(storeId);
    else switchTo(storeId);
  }

  return (
    <div className="bg-slate-900 text-xs text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-white">
            Demo
          </span>
          <label htmlFor="demo-store-select"><span className="hidden sm:inline">Viewing storefront:</span><span className="sr-only sm:hidden">Viewing storefront</span></label>
          <select
            id="demo-store-select"
            value={view.store.id}
            onChange={(event) => requestSwitch(event.target.value)}
            className="max-w-[11rem] truncate rounded border border-white/20 bg-slate-800 px-1.5 py-0.5 text-white focus:outline-none focus:ring-2 focus:ring-white/40 sm:max-w-none"
          >
            {view.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        <PlatformContactDisclosure label={isAdminHost ? "Agency Admin" : "Contact admin"} />
      </div>

      <ConfirmDialog
        open={pendingStore !== undefined}
        title={`Switch to ${pendingStore?.name ?? "another store"}?`}
        confirmLabel="Switch and empty cart"
        cancelLabel="Keep current store"
        onCancel={() => setPendingStoreId(null)}
        onConfirm={() => {
          if (pendingStoreId) switchTo(pendingStoreId);
          setPendingStoreId(null);
        }}
      >
        Your cart has {cartCount} {cartCount === 1 ? "item" : "items"} from{" "}
        <strong>{view.store.name}</strong>. A cart can only hold products from one store, so
        switching will empty it.
      </ConfirmDialog>
    </div>
  );
}

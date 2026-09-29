"use client";

import Link from "next/link";
import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { Store as StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass } from "@/components/ui";
import {
  StorefrontDataContext,
  syncCartStore,
  useStorefront,
  type StorefrontView,
} from "@/lib/storefront";
import type { StorefrontCatalog } from "@/lib/storefront-types";
import { PlatformContactDisclosure } from "@/components/PlatformContactDisclosure";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

/**
 * Wraps every public storefront page: preview bar (platform host only), header, footer and the
 * shown store's accent colour. The catalog comes from the server
 * (app/(storefront)/layout.tsx), for an ACTIVE store only.
 */
export function StorefrontShell({
  children,
  isAdminHost,
  catalog,
}: {
  children: ReactNode;
  isAdminHost: boolean;
  catalog: StorefrontCatalog | null;
}) {
  const data = useMemo(() => ({ catalog }), [catalog]);
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
      {isAdminHost && <PreviewBar view={view} />}
      <PublicHeader store={view.store} cartCount={view.cart.itemCount} />
      <div className="flex-1">{children}</div>
      <PublicFooter store={view.store} isAdminHost={isAdminHost} />
    </div>
  );
}

/**
 * Only on the platform host (ADMIN_HOST): says this is the platform owner's
 * preview of a store. A store's own site has no bar and no way to switch
 * to another store; the store is chosen by the site's hostname.
 */
function PreviewBar({ view }: { view: StorefrontView }) {
  return (
    <div className="bg-slate-900 text-xs text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-white">Preview</span>
          <span>
            Previewing <strong className="text-white">{view.store.name}</strong> on the platform host. Choose another store in the admin.
          </span>
        </p>
        <PlatformContactDisclosure label="Agency Admin" />
      </div>
    </div>
  );
}

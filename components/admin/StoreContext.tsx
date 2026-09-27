"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { Database } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreLogo } from "@/components/StoreLogo";
import { labelFor, STORE_TYPES } from "@/lib/config";
import { findStore, getStoreData, useDemoState } from "@/lib/demo-db";
import type { AdminStoreSummary } from "@/lib/admin/types";
import type { DemoState, Store, StoreData, StoreType } from "@/lib/types";
import { isNavActive, storeNav } from "./AdminShell";

// ---------------------------------------------------------------
// The store every page under /admin/stores/[storeId] works on. It is
// loaded from the database by the (server) layout, using the storeId in
// the URL; pages send that same storeId to the server with each action.
// ---------------------------------------------------------------

const DbStoreContext = createContext<AdminStoreSummary | null>(null);

/** The selected store (from the database). */
export function useAdminStore(): AdminStoreSummary {
  const value = useContext(DbStoreContext);
  if (!value) throw new Error("useAdminStore must be used inside StoreContextLayout");
  return value;
}

export function StoreContextLayout({ store, children }: { store: AdminStoreSummary; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <DbStoreContext.Provider value={store}>
      {/* Selected store indicator */}
      <div className="mb-6 rounded-2xl border border-teal-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <StoreLogo store={store} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Managing {store.letterLabel}
            </p>
            <p className="truncate font-semibold text-slate-900">
              {store.name}{" "}
              {store.businessType && (
                <span className="font-normal text-slate-500">· {labelFor(STORE_TYPES, store.businessType as StoreType)}</span>
              )}
            </p>
          </div>
          <StatusBadge status={store.status} />
        </div>
        <nav aria-label="Store sections" className="overflow-x-auto border-t border-slate-200">
          <ul className="flex min-w-max gap-1 px-2">
            {storeNav(store.id).map((item) => {
              const active = isNavActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "border-teal-700 text-teal-800"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      {children}
    </DbStoreContext.Provider>
  );
}

// ---------------------------------------------------------------
// DEMO-DATA PAGES (orders, customers)
// These pages are not connected to the database yet. They keep reading
// the browser demo data for the selected store.
// ---------------------------------------------------------------

interface SelectedStore {
  state: DemoState;
  store: Store;
  data: StoreData;
  letterLabel: string;
}

const SelectedStoreContext = createContext<SelectedStore | null>(null);

/** Demo data of the selected store (orders and customers pages only). */
export function useSelectedStore(): SelectedStore {
  const value = useContext(SelectedStoreContext);
  if (!value) throw new Error("useSelectedStore must be used inside DemoStoreData");
  return value;
}

export function DemoStoreData({ area, children }: { area: string; children: ReactNode }) {
  const dbStore = useAdminStore();
  const state = useDemoState();
  if (!state) return <LoadingState label="Loading demo data…" />;

  const store = findStore(state, dbStore.id);
  if (!store) {
    return (
      <EmptyState
        icon={Database}
        title={`No ${area} yet`}
        description={`${area[0].toUpperCase()}${area.slice(1)} still use demo data in this phase, and this store only exists in the database. They will appear here once checkout is connected to the database.`}
      />
    );
  }
  return (
    <SelectedStoreContext.Provider
      value={{ state, store, data: getStoreData(state, store.id), letterLabel: dbStore.letterLabel }}
    >
      {children}
    </SelectedStoreContext.Provider>
  );
}

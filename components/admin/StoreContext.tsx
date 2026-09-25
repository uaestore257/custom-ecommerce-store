"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { Store as StoreIcon } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreLogo } from "@/components/StoreLogo";
import { LinkButton } from "@/components/ui";
import { labelFor, STORE_TYPES } from "@/lib/config";
import { findStore, getStoreData, useDemoState } from "@/lib/demo-db";
import { storeLetterLabel } from "@/lib/format";
import type { DemoState, Store, StoreData } from "@/lib/types";
import { isNavActive, storeNav } from "./AdminShell";

interface SelectedStore {
  state: DemoState;
  store: Store;
  data: StoreData;
  /** "Client Store A", "Client Store B", ... */
  letterLabel: string;
}

const SelectedStoreContext = createContext<SelectedStore | null>(null);

/**
 * The store that every page under /admin/stores/[storeId] works on.
 * All reads and writes on those pages use this store's ID, so one
 * store's pages can never change another store's data.
 */
export function useSelectedStore(): SelectedStore {
  const value = useContext(SelectedStoreContext);
  if (!value) throw new Error("useSelectedStore must be used inside StoreContextLayout");
  return value;
}

export function StoreContextLayout({ storeId, children }: { storeId: string; children: ReactNode }) {
  const state = useDemoState();
  const pathname = usePathname();

  if (!state) return <LoadingState label="Loading store…" />;

  const store = findStore(state, storeId);
  if (!store) {
    return (
      <EmptyState
        icon={StoreIcon}
        title="Store not found"
        description="This client store does not exist. It may have been deleted, or the link is wrong."
        action={<LinkButton href="/admin/stores">Back to client stores</LinkButton>}
      />
    );
  }

  const value: SelectedStore = {
    state,
    store,
    data: getStoreData(state, store.id),
    letterLabel: storeLetterLabel(state.stores.indexOf(store)),
  };

  return (
    <SelectedStoreContext.Provider value={value}>
      {/* Selected store indicator */}
      <div className="mb-6 rounded-2xl border border-teal-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <StoreLogo store={store} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Managing {value.letterLabel}
            </p>
            <p className="truncate font-semibold text-slate-900">
              {store.name}{" "}
              <span className="font-normal text-slate-500">· {labelFor(STORE_TYPES, store.type)}</span>
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
    </SelectedStoreContext.Provider>
  );
}

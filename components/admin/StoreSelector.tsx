"use client";

import { useParams, useRouter } from "next/navigation";
import type { ShellStore } from "./AdminShell";

/**
 * Shows which client store is being managed and lets the agency jump to
 * another one. Changing the selection navigates to that store's own URL,
 * so the store ID in the address bar always matches the data on screen.
 */
export function StoreSelector({ stores }: { stores: ShellStore[] }) {
  const router = useRouter();
  const params = useParams<{ storeId?: string }>();
  const selected = params.storeId ? stores.find((s) => s.id === params.storeId) : undefined;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor="store-selector" className="hidden text-sm text-slate-500 sm:block">
        Managing:
      </label>
      <select
        id="store-selector"
        value={selected?.id ?? ""}
        onChange={(e) => router.push(e.target.value ? `/admin/stores/${e.target.value}` : "/admin/stores")}
        className={`min-w-0 max-w-[11rem] truncate rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-100 sm:max-w-xs ${
          selected ? "border-teal-300 bg-teal-50 text-teal-900" : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        <option value="">All stores (agency view)</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}

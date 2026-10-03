"use client";

import { useParams, useRouter } from "next/navigation";
import type { ShellStore } from "./AdminShell";

/**
 * Shows the current store and lets platform admins or portal members switch
 * only through their respective server-authorized navigation paths.
 */
export function StoreSelector({
  stores,
  platform,
  portal,
  selectedStoreId,
}: {
  stores: ShellStore[];
  platform: boolean;
  portal: boolean;
  selectedStoreId: string | null;
}) {
  const router = useRouter();
  const params = useParams<{ storeId?: string }>();
  const selected = params.storeId
    ? stores.find((s) => s.id === params.storeId)
    : portal
      ? selectedStoreId
        ? stores.find((s) => s.id === selectedStoreId)
        : undefined
      : platform
        ? undefined
        : stores[0];

  const selector = (
    <select
      id="store-selector"
      name="storeId"
      value={selected?.id ?? ""}
      onChange={(event) => {
        if (portal) event.currentTarget.form?.requestSubmit();
        else router.push(event.currentTarget.value ? `/admin/stores/${event.currentTarget.value}` : "/admin/stores");
      }}
      className={`min-w-0 max-w-[11rem] truncate rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-100 sm:max-w-xs ${
        selected ? "border-teal-300 bg-teal-50 text-teal-900" : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {platform && <option value="">All stores (agency view)</option>}
      {portal && <option value="" disabled>Select a store</option>}
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor="store-selector" className="hidden text-sm text-slate-500 sm:block">
        Managing:
      </label>
      {portal ? (
        <form action="/admin/select-store" method="post" className="min-w-0">
          {selector}
        </form>
      ) : (
        selector
      )}
    </div>
  );
}

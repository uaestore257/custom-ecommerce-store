"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArchiveRestore, ArrowRight, Pencil, Plus, Search, SearchX, Store as StoreIcon } from "lucide-react";
import { restoreStoreAction } from "@/app/admin/actions";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreLogo } from "@/components/StoreLogo";
import { buttonClass, inputClass, LinkButton, Notice, PageHeader } from "@/components/ui";
import { labelFor, STORE_STATUSES, STORE_TYPES } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { AdminStoreSummary, DbStoreStatus } from "@/lib/admin/types";
import type { StoreType } from "@/lib/types";

const typeLabel = (type: string | null) => (type ? labelFor(STORE_TYPES, type as StoreType) : "—");

/** Stores come from the database (archived ones included, shown on request). */
export function StoresListView({ stores }: { stores: AdminStoreSummary[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<StoreType | "">("");
  const [status, setStatus] = useState<DbStoreStatus | "">("");
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = stores.filter((s) => s.archivedAt).length;
  const q = query.trim().toLowerCase();
  const rows = stores
    .filter((store) => (showArchived ? Boolean(store.archivedAt) : !store.archivedAt))
    .filter((store) => !type || store.businessType === type)
    .filter((store) => !status || store.status === status)
    .filter((store) => !q || [store.name, store.slug, store.letterLabel].some((v) => v.toLowerCase().includes(q)));
  const filtering = Boolean(q || type || status);

  return (
    <>
      <PageHeader
        title="Client stores"
        description="Every client website project your agency manages."
        breadcrumbs={[{ label: "Agency Admin", href: "/admin" }, { label: "Client stores" }]}
        actions={
          <LinkButton href="/admin/stores/new">
            <Plus className="h-4 w-4" aria-hidden />
            Create store
          </LinkButton>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <label htmlFor="stores-search" className="sr-only">Search by name</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="stores-search"
            type="search"
            placeholder="Search by name or slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass()} pl-9`}
          />
        </div>
        <label htmlFor="stores-type" className="sr-only">Category</label>
        <select id="stores-type" value={type} onChange={(e) => setType(e.target.value as StoreType | "")} className={inputClass()}>
          <option value="">All categories</option>
          {STORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label htmlFor="stores-status" className="sr-only">Status</label>
        <select id="stores-status" value={status} onChange={(e) => setStatus(e.target.value as DbStoreStatus | "")} className={inputClass()}>
          <option value="">All statuses</option>
          {STORE_STATUSES.map((s) => <option key={s.value} value={s.value.toUpperCase()}>{s.label}</option>)}
        </select>
      </div>

      <label className="mb-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived stores ({archivedCount})
      </label>
      {showArchived && (
        <Notice className="mb-4">Archived stores are hidden everywhere else. Restoring one brings back all of its data.</Notice>
      )}

      {rows.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={SearchX}
            title="No stores match your filters"
            action={
              <button type="button" className={buttonClass("secondary")} onClick={() => { setQuery(""); setType(""); setStatus(""); }}>
                Clear filters
              </button>
            }
          />
        ) : showArchived ? (
          <EmptyState icon={StoreIcon} title="No archived stores" />
        ) : (
          <EmptyState
            icon={StoreIcon}
            title="No client stores yet"
            description="Create your first client store to get started."
            action={<LinkButton href="/admin/stores/new">Create store</LinkButton>}
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Desktop table (wide screens only) */}
          <table className="hidden w-full text-left text-sm xl:table">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Store</th>
                <th scope="col" className="px-5 py-3 font-semibold">Category</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Products</th>
                <th scope="col" className="px-5 py-3 font-semibold">Created</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((store) => (
                <tr key={store.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StoreLogo store={store} size="sm" />
                      <div className="min-w-0">
                        <StoreName store={store} />
                        <p className="text-xs text-slate-500">{store.letterLabel} · {store.slug} · {store.countryCode} · {store.baseCurrency}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{typeLabel(store.businessType)}</td>
                  <td className="px-5 py-4"><StatusBadge status={store.archivedAt ? "archived" : store.status} /></td>
                  <td className="px-5 py-4 text-slate-600">{store.productCount}</td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(store.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <RowActions store={store} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* List for phones, tablets and small laptops */}
          <ul className="divide-y divide-slate-200 xl:hidden">
            {rows.map((store) => (
              <li key={store.id} className="p-4">
                <div className="flex items-start gap-3">
                  <StoreLogo store={store} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <StoreName store={store} />
                      <StatusBadge status={store.archivedAt ? "archived" : store.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {store.letterLabel} · {typeLabel(store.businessType)} · {store.productCount} products
                    </p>
                    <div className="mt-3 flex gap-2">
                      <RowActions store={store} stretch />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function StoreName({ store }: { store: AdminStoreSummary }) {
  if (store.archivedAt) return <span className="font-semibold text-slate-900">{store.name}</span>;
  return (
    <Link href={`/admin/stores/${store.id}`} className="font-semibold text-slate-900 hover:text-teal-700 hover:underline">
      {store.name}
    </Link>
  );
}

function RowActions({ store, stretch = false }: { store: AdminStoreSummary; stretch?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const grow = stretch ? "flex-1" : "";

  if (store.archivedAt) {
    return (
      <div className={grow}>
        <button
          type="button"
          disabled={pending}
          className={`${buttonClass("secondary", { size: "sm" })} ${stretch ? "w-full" : ""}`}
          onClick={() =>
            startTransition(async () => {
              const result = await restoreStoreAction(store.id);
              setError(result.ok ? null : result.error);
            })
          }
        >
          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
          {pending ? "Restoring…" : `Restore`}
          <span className="sr-only"> {store.name}</span>
        </button>
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <>
      <LinkButton href={`/admin/stores/${store.id}/settings`} variant="secondary" size="sm" className={grow} aria-label={`Edit ${store.name}`}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </LinkButton>
      <LinkButton href={`/admin/stores/${store.id}`} size="sm" className={grow}>
        Manage
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </LinkButton>
    </>
  );
}

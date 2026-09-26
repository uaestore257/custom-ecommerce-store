"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Pencil, Plus, Search, SearchX, Store as StoreIcon } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreLogo } from "@/components/StoreLogo";
import { buttonClass, inputClass, LinkButton, PageHeader } from "@/components/ui";
import { labelFor, STORE_STATUSES, STORE_TYPES } from "@/lib/config";
import { getStoreData, useDemoState } from "@/lib/demo-db";
import { formatDate, storeLetterLabel } from "@/lib/format";
import type { StoreStatus, StoreType } from "@/lib/types";

export function StoresListView() {
  const state = useDemoState();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<StoreType | "">("");
  const [status, setStatus] = useState<StoreStatus | "">("");

  if (!state) return <LoadingState />;

  const q = query.trim().toLowerCase();
  const rows = state.stores
    .map((store, index) => ({ store, letterLabel: storeLetterLabel(index), data: getStoreData(state, store.id) }))
    .filter(({ store }) => !type || store.type === type)
    .filter(({ store }) => !status || store.status === status)
    .filter(({ store, letterLabel }) =>
      !q || [store.name, store.slug, letterLabel, store.ownerName].some((v) => v.toLowerCase().includes(q)),
    );
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
            placeholder="Search by name, slug or owner…"
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
        <select id="stores-status" value={status} onChange={(e) => setStatus(e.target.value as StoreStatus | "")} className={inputClass()}>
          <option value="">All statuses</option>
          {STORE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

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
              {rows.map(({ store, letterLabel, data }) => (
                <tr key={store.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StoreLogo store={store} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/admin/stores/${store.id}`} className="font-semibold text-slate-900 hover:text-teal-700 hover:underline">
                          {store.name}
                        </Link>
                        <p className="text-xs text-slate-500">{letterLabel} · {store.settings.domain || store.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{labelFor(STORE_TYPES, store.type)}</td>
                  <td className="px-5 py-4"><StatusBadge status={store.status} /></td>
                  <td className="px-5 py-4 text-slate-600">{data.products.length}</td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(store.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <LinkButton href={`/admin/stores/${store.id}/settings`} variant="secondary" size="sm" aria-label={`Edit ${store.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </LinkButton>
                      <LinkButton href={`/admin/stores/${store.id}`} size="sm">
                        Manage
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </LinkButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* List for phones, tablets and small laptops */}
          <ul className="divide-y divide-slate-200 xl:hidden">
            {rows.map(({ store, letterLabel, data }) => (
              <li key={store.id} className="p-4">
                <div className="flex items-start gap-3">
                  <StoreLogo store={store} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/stores/${store.id}`} className="font-semibold text-slate-900 hover:underline">
                        {store.name}
                      </Link>
                      <StatusBadge status={store.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {letterLabel} · {labelFor(STORE_TYPES, store.type)} · {data.products.length} products
                    </p>
                    <div className="mt-3 flex gap-2">
                      <LinkButton href={`/admin/stores/${store.id}`} size="sm" className="flex-1">Manage</LinkButton>
                      <LinkButton href={`/admin/stores/${store.id}/settings`} variant="secondary" size="sm" className="flex-1">Edit</LinkButton>
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

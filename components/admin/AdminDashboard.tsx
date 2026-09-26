"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowRight, Building2, LayoutTemplate, Plus, Search, SearchX } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { buttonClass, inputClass, LinkButton, PageHeader } from "@/components/ui";
import { STORE_STATUSES, STORE_TYPES } from "@/lib/config";
import { getStoreData, useDemoState } from "@/lib/demo-db";
import { storeLetterLabel } from "@/lib/format";
import type { StoreStatus } from "@/lib/types";
import { ClientStoreCard, MoreStoresCard } from "./ClientStoreCard";

const TEMPLATE_FEATURES = ["Storefront", "Shop & products", "Cart & checkout", "Orders", "Customers", "Settings"];

export function AdminDashboard() {
  const state = useDemoState();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StoreStatus | "">("");

  if (!state) return <LoadingState />;

  const { agency, stores } = state;
  const counts = {
    total: stores.length,
    active: stores.filter((s) => s.status === "active").length,
    draft: stores.filter((s) => s.status === "draft").length,
    paused: stores.filter((s) => s.status === "paused").length,
  };

  const q = query.trim().toLowerCase();
  const visible = stores
    .map((store, index) => ({ store, letterLabel: storeLetterLabel(index) }))
    .filter(({ store }) => agency.showPausedStores || store.status !== "paused")
    .filter(({ store }) => !status || store.status === status)
    .filter(({ store, letterLabel }) => {
      if (!q) return true;
      const typeLabel = STORE_TYPES.find((t) => t.value === store.type)?.label ?? "";
      return [store.name, typeLabel, letterLabel, store.settings.domain].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  const hiddenPaused = !agency.showPausedStores && counts.paused > 0;

  return (
    <>
      <PageHeader
        title="Your Agency Admin"
        description={`${agency.agencyName} manages customer website projects from one place. Every client store runs on the shared Master Ecommerce Template, with its own branding, products, orders and settings.`}
        actions={
          <LinkButton href="/admin/stores/new">
            <Plus className="h-4 w-4" aria-hidden />
            Create New Store
          </LinkButton>
        }
      />

      {/* Stats */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Client stores" value={counts.total} />
        <Stat label="Active" value={counts.active} tone="text-emerald-700" />
        <Stat label="Draft" value={counts.draft} tone="text-slate-700" />
        <Stat label="Paused" value={counts.paused} tone="text-amber-700" />
      </dl>

      {/* Hierarchy: Agency Admin → Master Template → Client Stores */}
      <section aria-labelledby="structure-heading" className="mt-10">
        <h2 id="structure-heading" className="sr-only">How your agency is organised</h2>

        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Level 1</p>
              <p className="text-lg font-semibold">Your Agency Admin</p>
              <p className="text-sm text-slate-600">
                {agency.agencyName} · {counts.total} client {counts.total === 1 ? "project" : "projects"}
              </p>
            </div>
            <Link href="/admin/settings" className="text-sm font-semibold text-teal-700 hover:underline">
              Settings
            </Link>
          </div>

          <Connector />

          <div className="rounded-2xl border-2 border-teal-600 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
                <LayoutTemplate className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Level 2 · Shared</p>
                <p className="text-lg font-semibold">Master Ecommerce Template</p>
                <p className="text-sm text-slate-600">One reusable codebase for every client store.</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {TEMPLATE_FEATURES.map((feature) => (
                <li key={feature} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/admin/template"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline"
            >
              View template
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <Connector label="Reused by each client store" />
        </div>

        {/* Level 3: client stores */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Level 3 · Independent</p>
            <h2 className="text-xl font-bold tracking-tight">Client stores</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <label htmlFor="dashboard-search" className="sr-only">Search client stores</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="dashboard-search"
                type="search"
                placeholder="Search stores…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputClass()} py-2 pl-9 sm:w-56`}
              />
            </div>
            <label htmlFor="dashboard-status" className="sr-only">Filter by status</label>
            <select
              id="dashboard-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StoreStatus | "")}
              className={`${inputClass()} py-2 sm:w-40`}
            >
              <option value="">All statuses</option>
              {STORE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {hiddenPaused && (
          <p className="mt-3 text-sm text-slate-500">
            {counts.paused} paused {counts.paused === 1 ? "store is" : "stores are"} hidden (change this in{" "}
            <Link href="/admin/settings" className="font-medium text-teal-700 hover:underline">Agency settings</Link>).
          </p>
        )}

        {visible.length === 0 && (q || status) ? (
          <div className="mt-6">
            <EmptyState
              icon={SearchX}
              title="No stores match"
              description="Try a different search or status."
              action={
                <button type="button" className={buttonClass("secondary")} onClick={() => { setQuery(""); setStatus(""); }}>
                  Clear filters
                </button>
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map(({ store, letterLabel }) => (
              <li key={store.id} className="flex flex-col">
                <ArrowDown className="mx-auto mb-2 hidden h-4 w-4 text-slate-300 sm:block" aria-hidden />
                <ClientStoreCard store={store} data={getStoreData(state, store.id)} letterLabel={letterLabel} />
              </li>
            ))}
            <li className="flex flex-col">
              <ArrowDown className="mx-auto mb-2 hidden h-4 w-4 text-slate-300 sm:block" aria-hidden />
              <MoreStoresCard />
            </li>
          </ul>
        )}
      </section>
    </>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-2 text-slate-400" aria-hidden>
      <span className="h-5 w-px bg-slate-300" />
      {label && <span className="my-1 text-xs font-medium text-slate-500">{label}</span>}
      <ArrowDown className="h-5 w-5" />
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`mt-1 text-3xl font-bold ${tone}`}>{value}</dd>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Globe, Pencil, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreLogo } from "@/components/StoreLogo";
import { labelFor, STORE_TYPES } from "@/lib/config";
import type { Store, StoreData } from "@/lib/types";

export function ClientStoreCard({
  store,
  data,
  letterLabel,
}: {
  store: Store;
  data: StoreData;
  letterLabel: string;
}) {
  const base = `/admin/stores/${store.id}`;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <StoreLogo store={store} />
        <StatusBadge status={store.status} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{letterLabel}</p>
      <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
        <Link href={base} className="hover:text-teal-700 hover:underline">
          {store.name}
        </Link>
      </h3>
      <p className="text-sm text-slate-600">{labelFor(STORE_TYPES, store.type)}</p>

      <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-500">
        <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {store.settings.domain || "No domain configured"}
      </p>
      <dl className="mt-3 flex gap-4 text-xs text-slate-500">
        <div>
          <dt className="sr-only">Products</dt>
          <dd><span className="font-semibold text-slate-800">{data.products.length}</span> products</dd>
        </div>
        <div>
          <dt className="sr-only">Orders</dt>
          <dd><span className="font-semibold text-slate-800">{data.orders.length}</span> orders</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center gap-2 pt-5">
        <Link
          href={base}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Manage store
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href={`${base}/settings`}
          aria-label={`Edit ${store.name} settings`}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function MoreStoresCard() {
  return (
    <Link
      href="/admin/stores/new"
      className="group flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-5 text-center transition hover:border-teal-500 hover:bg-teal-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-teal-100 group-hover:text-teal-700">
        <Plus className="h-6 w-6" aria-hidden />
      </span>
      <span className="mt-4 text-lg font-semibold text-slate-900">More Client Stores</span>
      <span className="mt-1 text-sm text-slate-600">Create another client project</span>
    </Link>
  );
}

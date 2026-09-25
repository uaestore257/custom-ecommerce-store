"use client";

import { useState } from "react";
import { Search, SearchX, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, inputClass, PageHeader } from "@/components/ui";
import { customerOrderCount } from "@/lib/demo-db";
import { formatDate } from "@/lib/format";
import { useSelectedStore } from "./StoreContext";

export function CustomersView() {
  const { store, data } = useSelectedStore();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Only customers stored under the selected store are listed.
  const customers = data.customers.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description={`People who have ordered from ${store.name}. Other stores' customers are never shown here.`}
        breadcrumbs={[
          { label: "Client stores", href: "/admin/stores" },
          { label: store.name, href: `/admin/stores/${store.id}` },
          { label: "Customers" },
        ]}
      />

      {data.customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers are added automatically when someone completes a demo checkout on this store."
        />
      ) : (
        <>
          <div className="relative mb-4 sm:max-w-sm">
            <label htmlFor="customers-search" className="sr-only">Search customers</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="customers-search"
              type="search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass()} pl-9`}
            />
          </div>
          {customers.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No customers match"
              action={<button type="button" className={buttonClass("secondary")} onClick={() => setQuery("")}>Clear search</button>}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Email</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Phone</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Orders</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3.5 font-medium">{c.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.phone}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{customerOrderCount(data, c)}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

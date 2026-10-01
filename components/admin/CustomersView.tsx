"use client";

import { useState } from "react";
import { Search, SearchX, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, inputClass, PageHeader } from "@/components/ui";
import type { AdminCustomerSummary } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";

export function CustomersView({
  storeName,
  storeId,
  customers,
  hasMore,
  platform,
}: {
  storeName: string;
  storeId: string;
  customers: AdminCustomerSummary[];
  hasMore: boolean;
  platform: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visibleCustomers = customers.filter(
    (customer) => !q || customer.name.toLowerCase().includes(q) || customer.email.toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description={`Read-only customers who have ordered from ${storeName}.`}
        breadcrumbs={[
          ...(platform ? [{ label: "Client stores", href: "/admin/stores" }] : []),
          { label: storeName, href: `/admin/stores/${storeId}` },
          { label: "Customers" },
        ]}
      />
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers are added when an order is placed." />
      ) : (
        <>
          {hasMore && (
            <p className="mb-4 text-sm text-slate-600">Showing the 200 most recent customers.</p>
          )}
          <div className="relative mb-4 sm:max-w-sm">
            <label htmlFor="customers-search" className="sr-only">Search customers</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="customers-search"
              type="search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inputClass()} pl-9`}
            />
          </div>
          {visibleCustomers.length === 0 ? (
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
                  {visibleCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-5 py-3.5 font-medium">{customer.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{customer.email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{customer.phone}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{customer.orderCount}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(customer.createdAt)}</td>
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

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Package, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import { deleteProductAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, inputClass, LinkButton, Notice, PageHeader } from "@/components/ui";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";
import { useAdminStore } from "./StoreContext";

/** Products and categories of the selected store, loaded from the database. */
export function ProductsListView({ products, categories }: { products: AdminProduct[]; categories: AdminCategory[] }) {
  const store = useAdminStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const base = `/admin/stores/${store.id}`;

  function confirmDelete(product: AdminProduct) {
    startTransition(async () => {
      const result = await deleteProductAction(store.id, product.id);
      setToDelete(null);
      setNotice(result.ok ? { tone: "success", text: result.message ?? "Done." } : { tone: "warning", text: result.error });
    });
  }

  const q = query.trim().toLowerCase();
  const rows = products
    .filter((p) => !category || p.categoryId === category)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));

  const addButton = (
    <LinkButton href={`${base}/products/new`}>
      <Plus className="h-4 w-4" aria-hidden />
      Add product
    </LinkButton>
  );

  return (
    <>
      <PageHeader
        title="Products"
        description={`Products sold by ${store.name} only.`}
        breadcrumbs={[
          { label: "Client stores", href: "/admin/stores" },
          { label: store.name, href: base },
          { label: "Products" },
        ]}
        actions={addButton}
      />

      {notice && (
        <Notice tone={notice.tone} className="mb-5">
          <span role="status">{notice.text}</span>
        </Notice>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description={`${store.name} has no products yet. Add the first one.`}
          action={addButton}
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <label htmlFor="products-search" className="sr-only">Search products</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="products-search"
                type="search"
                placeholder="Search by name or SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputClass()} pl-9`}
              />
            </div>
            <label htmlFor="products-category" className="sr-only">Category</label>
            <select id="products-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No products match"
              action={
                <button type="button" className={buttonClass("secondary")} onClick={() => { setQuery(""); setCategory(""); }}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {rows.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                  <ProductImage src={product.imageUrl} alt={product.name} className="h-14 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link href={`${base}/products/${product.id}`} className="font-semibold text-slate-900 hover:text-teal-700 hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {product.sku} · {product.categoryName}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                    <div className="text-right text-sm">
                      <p className="font-semibold tabular-nums">
                        {product.priceDisplay}
                        {product.compareAtDisplay && (
                          <span className="ml-1.5 text-xs font-normal text-slate-400 line-through">
                            {product.compareAtDisplay}
                          </span>
                        )}
                      </p>
                      <p className={product.stock === 0 ? "text-red-600" : "text-slate-500"}>
                        {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                      </p>
                    </div>
                    <StatusBadge status={product.status} />
                    <div className="flex gap-1">
                      <Link
                        href={`${base}/products/${product.id}`}
                        aria-label={`Edit ${product.name}`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Delete ${product.name}`}
                        onClick={() => setToDelete(product)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete?.hasOrders ? `Archive "${toDelete?.name ?? ""}"?` : `Delete "${toDelete?.name ?? ""}"?`}
        confirmLabel={pending ? "Working…" : toDelete?.hasOrders ? "Archive product" : "Delete product"}
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && confirmDelete(toDelete)}
      >
        {toDelete?.hasOrders
          ? "This product appears in past orders, so it will be archived (hidden) instead of deleted to keep order history."
          : `This permanently removes the product from ${store.name}.`}
      </ConfirmDialog>
    </>
  );
}

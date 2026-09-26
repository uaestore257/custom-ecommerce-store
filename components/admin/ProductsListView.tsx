"use client";

import Link from "next/link";
import { useState } from "react";
import { Package, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, inputClass, LinkButton, PageHeader } from "@/components/ui";
import { categoryName, deleteProduct } from "@/lib/demo-db";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useSelectedStore } from "./StoreContext";

export function ProductsListView() {
  const { store, data } = useSelectedStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const base = `/admin/stores/${store.id}`;

  const q = query.trim().toLowerCase();
  const rows = data.products
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

      {data.products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description={`${store.name} has no products. Add the first one to show it on the storefront.`}
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
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                      {product.sku} · {categoryName(data, product.categoryId)}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                    <div className="text-right text-sm">
                      <p className="font-semibold tabular-nums">{formatMoney(product.price, store.settings.currency)}</p>
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
        title={`Delete "${toDelete?.name ?? ""}"?`}
        confirmLabel="Delete product"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteProduct(store.id, toDelete.id);
          setToDelete(null);
        }}
      >
        This removes the product from {store.name}&apos;s storefront. Existing orders keep their copy of
        the product details.
      </ConfirmDialog>
    </>
  );
}

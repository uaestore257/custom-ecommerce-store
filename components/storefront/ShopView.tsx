"use client";

import { useState } from "react";
import { Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, inputClass } from "@/components/ui";
import { categoryName } from "@/lib/demo-db";
import { useStorefront } from "@/lib/storefront";
import type { Product } from "@/lib/types";
import { PRODUCT_GRID, ProductCard } from "./ProductCard";

type Sort = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const sorters: Record<Sort, (a: Product, b: Product) => number> = {
  featured: (a, b) => Number(b.featured) - Number(a.featured),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "name-desc": (a, b) => b.name.localeCompare(a.name),
};

export function ShopView({ initialCategory = "" }: { initialCategory?: string }) {
  const view = useStorefront();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<Sort>("featured");

  if (!view) return null;
  const { store, data, products, cartLines } = view;

  // Ignore a category from the URL that does not exist in this store.
  const activeCategory = data.categories.some((c) => c.id === category) ? category : "";
  const q = query.trim().toLowerCase();
  const results = products
    .filter((p) => !activeCategory || p.categoryId === activeCategory)
    .filter(
      (p) =>
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    )
    .sort(sorters[sort]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:py-14">
      <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Shop</h1>
      <p className="mt-1.5 max-w-xl text-sm text-slate-600 sm:mt-3 sm:text-base">
        Browse the full {store.name} collection of {products.length}{" "}
        {products.length === 1 ? "product" : "products"}.
      </p>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3">
        <div className="relative col-span-2 sm:col-span-1">
          <label htmlFor="shop-search" className="sr-only">Search products</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="shop-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className={`${inputClass()} pl-9`}
          />
        </div>
        <div>
          <label htmlFor="shop-category" className="sr-only">Category</label>
          <select
            id="shop-category"
            value={activeCategory}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass()}
          >
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="shop-sort" className="sr-only">Sort by</label>
          <select
            id="shop-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className={inputClass()}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low–high</option>
            <option value="price-desc">Price: high–low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm" aria-live="polite">
        Showing {results.length} of {products.length} products
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={SearchX}
            title="No products match"
            description="Try a different search or category."
            action={
              <button
                type="button"
                className={buttonClass("secondary")}
                onClick={() => {
                  setQuery("");
                  setCategory("");
                }}
              >
                Clear filters
              </button>
            }
          />
        </div>
      ) : (
        <ul className={`mt-3 sm:mt-6 ${PRODUCT_GRID}`}>
          {results.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard
                product={product}
                shownStoreId={store.id}
                categoryName={categoryName(data, product.categoryId)}
                currency={store.settings.currency}
                inCart={cartLines.find((l) => l.product.id === product.id)?.quantity ?? 0}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

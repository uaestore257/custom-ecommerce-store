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
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Shop</h1>
      <p className="mt-1.5 max-w-xl text-sm text-slate-600 sm:mt-2 sm:text-base">
        Browse the full {store.name} collection of {products.length}{" "}
        {products.length === 1 ? "product" : "products"}.
      </p>

      {/* Search + sort */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:mt-8 sm:gap-3">
        <div className="relative">
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
          <label htmlFor="shop-sort" className="sr-only">Sort by</label>
          <select
            id="shop-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className={`${inputClass()} w-[8.5rem] sm:w-44`}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low–high</option>
            <option value="price-desc">Price: high–low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>
      </div>

      {/* Category chips (categories are managed in the admin) */}
      <div
        role="group"
        aria-label="Filter by category"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {[{ id: "", name: "All" }, ...data.categories].map((c) => {
          const active = activeCategory === c.id;
          return (
            <button
              key={c.id || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c.id)}
              className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-brand hover:text-brand"
              }`}
            >
              {c.name}
            </button>
          );
        })}
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

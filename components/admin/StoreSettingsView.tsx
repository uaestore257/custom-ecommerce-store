"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, inputClass, PageHeader } from "@/components/ui";
import { addCategory, deleteCategory, deleteStore } from "@/lib/demo-db";
import { StoreForm } from "./StoreForm";
import { useSelectedStore } from "./StoreContext";

export function StoreSettingsView() {
  const router = useRouter();
  const { store, data } = useSelectedStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <PageHeader
        title="Store settings"
        description={`Settings for ${store.name} only. Other client stores are not affected.`}
        breadcrumbs={[
          { label: "Client stores", href: "/admin/stores" },
          { label: store.name, href: `/admin/stores/${store.id}` },
          { label: "Settings" },
        ]}
      />

      <div className="space-y-6">
        {/* key: reload the form if another tab changes this store */}
        <StoreForm key={store.id} mode="edit" store={store} />

        <CategoryManager />

        <Card className="border-red-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-red-700">Delete store</h2>
          <p className="mt-1 text-sm text-slate-600">
            Permanently removes {store.name} and its {data.products.length} products,{" "}
            {data.orders.length} orders and {data.customers.length} customers from this demo.
          </p>
          <button type="button" className={`${buttonClass("danger")} mt-4`} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete this store
          </button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${store.name}?`}
        confirmLabel="Delete store"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          router.push("/admin/stores");
          deleteStore(store.id);
        }}
      >
        All of this store&apos;s products, orders, customers and settings will be removed. This cannot be undone
        (except by resetting all demo data in Agency settings).
      </ConfirmDialog>
    </>
  );
}

function CategoryManager() {
  const { store, data } = useSelectedStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("Enter a category name.");
    if (data.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError("This category already exists.");
    }
    addCategory(store.id, trimmed);
    setName("");
    setError(null);
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 id="categories" className="scroll-mt-24 text-lg font-semibold">Categories</h2>
      <p className="mt-1 text-sm text-slate-600">
        Product categories for {store.name}. A category can only be removed when no products use it.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {data.categories.map((c) => {
          const used = data.products.filter((p) => p.categoryId === c.id).length;
          return (
            <li key={c.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm">
              {c.name}
              <span className="text-xs text-slate-500">({used})</span>
              <button
                type="button"
                disabled={used > 0}
                title={used > 0 ? "Move or delete its products first" : `Remove ${c.name}`}
                aria-label={`Remove category ${c.name}`}
                onClick={() => deleteCategory(store.id, c.id)}
                className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
        {data.categories.length === 0 && <li className="text-sm text-slate-500">No categories yet.</li>}
      </ul>
      <form onSubmit={handleAdd} noValidate className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="sm:w-72">
          <label htmlFor="new-category" className="sr-only">New category name</label>
          <input
            id="new-category"
            placeholder="New category name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "new-category-error" : undefined}
            className={inputClass(!!error)}
          />
          {error && <p id="new-category-error" className="mt-1.5 text-sm text-red-600">{error}</p>}
        </div>
        <button type="submit" className={buttonClass("secondary")}>Add category</button>
      </form>
    </Card>
  );
}

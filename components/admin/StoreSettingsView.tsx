"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tags, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, LinkButton, PageHeader } from "@/components/ui";
import { deleteStore } from "@/lib/demo-db";
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

        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Categories</h2>
            <p className="mt-1 text-sm text-slate-600">
              {data.categories.length} {data.categories.length === 1 ? "category" : "categories"}. Add, rename, reorder or
              delete them, and set their images.
            </p>
          </div>
          <LinkButton href={`/admin/stores/${store.id}/categories`} variant="secondary">
            <Tags className="h-4 w-4" aria-hidden />
            Manage categories
          </LinkButton>
        </Card>

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

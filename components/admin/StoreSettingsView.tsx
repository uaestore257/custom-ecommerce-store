"use client";

import { Tags } from "lucide-react";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import type { AdminStoreDetail, ReferenceOptions } from "@/lib/admin/types";
import { StoreForm } from "./StoreForm";
import { StoreOwnerCard, StoreSuspensionCard } from "./StorePlatformControls";

export function StoreSettingsView({ store, reference }: { store: AdminStoreDetail; reference: ReferenceOptions }) {
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
        <StoreForm key={store.id} mode="edit" store={store} reference={reference} />

        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Categories</h2>
            <p className="mt-1 text-sm text-slate-600">
              {store.categoryCount} {store.categoryCount === 1 ? "category" : "categories"}. Add, rename, reorder or
              delete them, and set their images.
            </p>
          </div>
          <LinkButton href={`/admin/stores/${store.id}/categories`} variant="secondary">
            <Tags className="h-4 w-4" aria-hidden />
            Manage categories
          </LinkButton>
        </Card>

        <StoreOwnerCard key={`owner-${store.ownerEmail}`} store={store} />

        <StoreSuspensionCard store={store} />

      </div>
    </>
  );
}

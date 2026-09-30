import { Notice, PageHeader } from "@/components/ui";
import type { AdminStoreDetail, ReferenceOptions } from "@/lib/admin/types";
import { StoreForm } from "./StoreForm";

export function StoreOwnerSettingsView({
  store,
  reference,
  readOnly,
}: {
  store: AdminStoreDetail;
  reference: ReferenceOptions;
  readOnly: boolean;
}) {
  return (
    <>
      <PageHeader
        title="Store Settings"
        description={`Manage settings for ${store.name}. Your store URL is ${store.slug}.localhost:3000.`}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Store Settings" }]}
      />
      {readOnly && (
        <Notice tone="warning" className="mb-6">
          This store is suspended. Settings are read-only until the Platform Owner reactivates it.
        </Notice>
      )}
      <StoreForm key={store.id} mode="owner-edit" store={store} reference={reference} readOnly={readOnly} />
    </>
  );
}

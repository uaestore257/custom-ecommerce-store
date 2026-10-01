import { Notice, PageHeader } from "@/components/ui";
import type { AdminStorePaymentSettings } from "@/lib/admin/types";
import { StorePaymentSettingsForm } from "./StorePaymentSettingsForm";

export function StoreOwnerSettingsView({
  store,
  readOnly,
}: {
  store: AdminStorePaymentSettings;
  readOnly: boolean;
}) {
  return (
    <>
      <PageHeader
        title="Store Settings"
        description={`Manage payment methods for ${store.name}. Store profile and delivery options are managed elsewhere.`}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Store Settings" }]}
      />
      {readOnly && (
        <Notice tone="warning" className="mb-6">
          This store is suspended. Settings are read-only until the Platform Owner reactivates it.
        </Notice>
      )}
      <StorePaymentSettingsForm key={store.id} store={store} readOnly={readOnly} />
    </>
  );
}

import { Notice, PageHeader } from "@/components/ui";
import type { ReferenceOptions } from "@/lib/admin/types";
import { StoreForm } from "./StoreForm";

export function NewStoreView({ reference }: { reference: ReferenceOptions }) {
  return (
    <>
      <PageHeader
        title="Create a new client store"
        description="The new store runs on the shared platform with the default storefront template (changeable on its Design page) and starts with its own empty product list and settings."
        breadcrumbs={[
          { label: "Agency Admin", href: "/admin" },
          { label: "Client stores", href: "/admin/stores" },
          { label: "New store" },
        ]}
      />
      <Notice className="mb-6">
        The store is saved in the database. Its public storefront, domain and online payments are not set up yet.
      </Notice>
      <StoreForm mode="create" reference={reference} />
    </>
  );
}

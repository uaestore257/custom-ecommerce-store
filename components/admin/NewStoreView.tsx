"use client";

import { LoadingState } from "@/components/EmptyState";
import { Notice, PageHeader } from "@/components/ui";
import { useDemoState } from "@/lib/demo-db";
import { StoreForm } from "./StoreForm";

export function NewStoreView() {
  const state = useDemoState();
  return (
    <>
      <PageHeader
        title="Create a new client store"
        description="The new store reuses the Master Ecommerce Template and starts with its own empty product list, orders, customers and settings."
        breadcrumbs={[
          { label: "Agency Admin", href: "/admin" },
          { label: "Client stores", href: "/admin/stores" },
          { label: "New store" },
        ]}
      />
      <Notice className="mb-6">
        Demo only: the store is saved in this browser. No hosting, database or domain is set up.
      </Notice>
      {/* Wait for saved agency defaults (currency, country) before showing the form. */}
      {state ? <StoreForm mode="create" /> : <LoadingState />}
    </>
  );
}

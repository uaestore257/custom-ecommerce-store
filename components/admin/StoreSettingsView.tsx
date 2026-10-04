"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, Tags } from "lucide-react";
import { archiveStoreAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, LinkButton, PageHeader } from "@/components/ui";
import type { AdminStoreDetail, ReferenceOptions } from "@/lib/admin/types";
import { StoreForm } from "./StoreForm";
import { StoreOwnerCard, StoreSuspensionCard } from "./StorePlatformControls";

export function StoreSettingsView({ store, reference }: { store: AdminStoreDetail; reference: ReferenceOptions }) {
  const router = useRouter();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

        <Card className="border-red-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-red-700">Archive store</h2>
          <p className="mt-1 text-sm text-slate-600">
            Hides {store.name} everywhere in the admin. Nothing is deleted: its {store.productCount} products and all
            settings are kept, and you can restore it from the client store list.
          </p>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <button type="button" className={`${buttonClass("danger")} mt-4`} onClick={() => setConfirmArchive(true)}>
            <Archive className="h-4 w-4" aria-hidden />
            Archive this store
          </button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${store.name}?`}
        confirmLabel={pending ? "Archiving…" : "Archive store"}
        danger
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() =>
          startTransition(async () => {
            const result = await archiveStoreAction(store.id);
            setConfirmArchive(false);
            if (result.ok) router.push("/admin/stores");
            else setError(result.error);
          })
        }
      >
        The store will be hidden but not deleted. You can restore it at any time from the client store list
        (&ldquo;Show archived stores&rdquo;).
      </ConfirmDialog>
    </>
  );
}

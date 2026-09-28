"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass } from "@/components/ui";
import { switchStorefrontStore, useStorefrontSession } from "@/lib/storefront";
import { setStorefrontStoreCookie } from "@/lib/storefront-cookie";

/**
 * Opens the public storefront showing this store. Only ACTIVE stores are
 * shown on the storefront, so a draft, paused or suspended store can't be
 * previewed yet (draft preview is a later phase).
 */
export function PreviewStorefrontButton({ store }: { store: { id: string; name: string; status: string } }) {
  const router = useRouter();
  const session = useStorefrontSession();
  const [confirming, setConfirming] = useState(false);
  const isActive = store.status === "ACTIVE";

  function openPreview() {
    if (session?.storeId === store.id) setStorefrontStoreCookie(store.id);
    else switchStorefrontStore(store.id);
    router.push("/");
  }

  function open() {
    if (!isActive) return;
    if (session && session.storeId !== store.id && session.cart.length > 0) {
      setConfirming(true);
      return;
    }
    openPreview();
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button type="button" className={buttonClass("secondary")} onClick={open} disabled={!isActive}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Preview storefront
        </button>
        {!isActive && (
          <p className="text-xs text-slate-500">Preview is available once the store is active.</p>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Empty the demo cart?"
        confirmLabel="Empty cart and preview"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          openPreview();
        }}
      >
        The demo cart has items from another store. A cart can only hold products from one store,
        so previewing <strong>{store.name}</strong> will empty it.
      </ConfirmDialog>
    </>
  );
}

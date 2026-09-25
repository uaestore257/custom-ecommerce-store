"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass } from "@/components/ui";
import { switchStorefrontStore, useStorefrontSession } from "@/lib/storefront";
import type { Store } from "@/lib/types";

/** Opens the public storefront showing this store's branding and products. */
export function PreviewStorefrontButton({ store }: { store: Store }) {
  const router = useRouter();
  const session = useStorefrontSession();
  const [confirming, setConfirming] = useState(false);

  function open() {
    if (!session || session.storeId === store.id) {
      if (session) router.push("/");
      return;
    }
    if (session.cart.length > 0) {
      setConfirming(true);
      return;
    }
    switchStorefrontStore(store.id);
    router.push("/");
  }

  return (
    <>
      <button type="button" className={buttonClass("secondary")} onClick={open} disabled={!session}>
        <ExternalLink className="h-4 w-4" aria-hidden />
        Preview storefront
      </button>
      <ConfirmDialog
        open={confirming}
        title="Empty the demo cart?"
        confirmLabel="Empty cart and preview"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          switchStorefrontStore(store.id);
          setConfirming(false);
          router.push("/");
        }}
      >
        The demo cart has items from another store. A cart can only hold products from one store,
        so previewing <strong>{store.name}</strong> will empty it.
      </ConfirmDialog>
    </>
  );
}

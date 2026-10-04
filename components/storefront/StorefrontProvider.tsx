"use client";

import { useEffect, type ReactNode } from "react";
import { StorefrontDataContext, syncCartStore } from "@/lib/storefront";
import type { StorefrontContext } from "@/lib/storefront-types";

/** Makes the server-resolved store context available to client islands. */
export function StorefrontProvider({ value, children }: { value: StorefrontContext; children: ReactNode }) {
  const storeId = value.store.id;
  // A cart saved for another store (switched in another tab, or its store
  // is no longer public) must never show up here: empty it.
  useEffect(() => {
    syncCartStore(storeId);
  }, [storeId]);
  return <StorefrontDataContext.Provider value={value}>{children}</StorefrontDataContext.Provider>;
}

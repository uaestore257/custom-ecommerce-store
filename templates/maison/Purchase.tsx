"use client";

import { ProductPurchase } from "@/components/storefront/CartControls";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import type { CartProductRef } from "@/lib/storefront-types";
import { maisonButton } from "./styles";

/** Shared purchase behaviour in Maison's language: "Add to bag" opens the bag drawer. */
export function MaisonPurchase({ product, shownStoreId }: { product: CartProductRef; shownStoreId: string }) {
  const { show } = useCartDrawer();
  return <ProductPurchase product={product} shownStoreId={shownStoreId} label="Add to bag" onAdded={show} buttonClassName={maisonButton} />;
}

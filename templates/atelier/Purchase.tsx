"use client";

import { ProductPurchase } from "@/components/storefront/CartControls";
import type { CartProductRef } from "@/lib/storefront-types";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import { atelierButton } from "./styles";

/** Shared purchase behaviour in Atelier's language: "Add to bag" opens the drawer. */
export function AtelierPurchase({ product, shownStoreId }: { product: CartProductRef; shownStoreId: string }) {
  const { show } = useCartDrawer();
  return <ProductPurchase product={product} shownStoreId={shownStoreId} label="Add to bag" onAdded={show} buttonClassName={atelierButton} />;
}

"use client";

import { AddToCartButton, ProductPurchase } from "@/components/storefront/CartControls";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import type { CartProductRef } from "@/lib/storefront-types";
import { kineticButton, kineticQuickAdd } from "./styles";

/** Shared purchase behaviour (quantity + add) in Kinetic's language; adding opens the cart sheet. */
export function KineticPurchase({ product, shownStoreId, className }: { product: CartProductRef; shownStoreId: string; className?: string }) {
  const { show } = useCartDrawer();
  return <ProductPurchase product={product} shownStoreId={shownStoreId} onAdded={show} buttonClassName={kineticButton} className={className} />;
}

/** Quick add on cards: adds one without leaving the grid; the cart count and "Added" state confirm it. */
export function KineticQuickAdd({ product, shownStoreId }: { product: CartProductRef; shownStoreId: string }) {
  return <AddToCartButton product={product} shownStoreId={shownStoreId} compact buttonClassName={kineticQuickAdd} />;
}

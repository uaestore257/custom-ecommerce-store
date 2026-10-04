"use client";

import { AddToCartButton, ProductPurchase } from "@/components/storefront/CartControls";
import type { CartProductRef } from "@/lib/storefront-types";
import { noorAccentButton, noorCardButton } from "./styles";

// Shared purchase behaviour (store-guarded add-to-cart, stock caps,
// localized labels from the P6 dictionary) in Noor's buttons. Noor's cart
// is a page, so adding does not open a drawer; the header count and the
// button's "Added" state confirm it.

export function NoorPurchase({ product, shownStoreId }: { product: CartProductRef; shownStoreId: string }) {
  return <ProductPurchase product={product} shownStoreId={shownStoreId} buttonClassName={noorAccentButton} />;
}

export function NoorCardAdd({ product, shownStoreId }: { product: CartProductRef; shownStoreId: string }) {
  return <AddToCartButton product={product} shownStoreId={shownStoreId} compact buttonClassName={noorCardButton} />;
}

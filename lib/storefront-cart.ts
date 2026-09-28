// ---------------------------------------------------------------
// STOREFRONT CART MATHS (pure — no React, no browser APIs)
//
// The browser keeps only { storeId, productId, quantity } per cart item,
// plus the price the shopper saw when adding it (priceSeenMinor), which
// is used ONLY to tell them a price changed — it is never charged.
// Every price, stock limit and availability comes from the server's
// current catalog each time the cart is computed. All money maths is in
// exact integer minor units (BigInt).
//
// Nothing here reserves stock: another shopper can still buy the last
// item. Real, server-checked orders arrive in a later phase.
// ---------------------------------------------------------------
import { formatMinorUnits, fromMinorUnits } from "./money";
import type { StorefrontCatalog, StorefrontCategory, StorefrontProduct, StorefrontStore } from "./storefront-types";

export interface StoredCartItem {
  storeId: string;
  productId: string;
  quantity: number;
  priceSeenMinor?: string;
}

export interface StoredSession {
  storeId: string;
  cart: StoredCartItem[];
}

export interface CartLine {
  product: StorefrontProduct;
  /** What would be ordered: the requested quantity, capped to current stock. */
  quantity: number;
  /** What the shopper asked for. Larger than `quantity` when stock ran low. */
  requestedQuantity: number;
  lineTotalMinor: bigint;
  /** The price shown when the item was added, if it has changed since. */
  previousPriceMinor: string | null;
}

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  /** Items left out because the product is gone, no longer for sale, or out of stock. */
  unavailableCount: number;
  quantityReducedCount: number;
  priceChangedCount: number;
  subtotalMinor: bigint;
  deliveryMinor: bigint;
  /** false = the store has no delivery rate yet; delivery is not included in the total. */
  deliveryConfigured: boolean;
  totalMinor: bigint;
}

const ZERO = BigInt(0);

function emptySummary(store: StorefrontStore): CartSummary {
  return {
    lines: [],
    itemCount: 0,
    unavailableCount: 0,
    quantityReducedCount: 0,
    priceChangedCount: 0,
    subtotalMinor: ZERO,
    deliveryMinor: ZERO,
    deliveryConfigured: store.deliveryFeeMinor !== null,
    totalMinor: ZERO,
  };
}

/**
 * The session to use while showing `shownStoreId`. A cart belongs to
 * exactly one store: a session for any other store (or none) becomes an
 * empty cart for the shown store, and stray items are dropped.
 */
export function reconcileSession(session: StoredSession | null | undefined, shownStoreId: string): StoredSession {
  if (!session || session.storeId !== shownStoreId) return { storeId: shownStoreId, cart: [] };
  return {
    storeId: shownStoreId,
    cart: session.cart.filter((item) => item.storeId === shownStoreId && item.quantity > 0),
  };
}

export function computeCart(catalog: StorefrontCatalog, session: StoredSession | null | undefined): CartSummary {
  const { store } = catalog;
  const summary = emptySummary(store);
  if (!session || session.storeId !== store.id) return summary;

  // One entry per product, even if stored data was edited by hand.
  const wanted = new Map<string, { quantity: number; priceSeenMinor?: string }>();
  for (const item of session.cart) {
    if (item.storeId !== store.id) continue;
    const quantity = Number.isFinite(item.quantity) ? Math.floor(item.quantity) : 0;
    if (quantity <= 0) continue;
    const existing = wanted.get(item.productId);
    wanted.set(item.productId, {
      quantity: (existing?.quantity ?? 0) + quantity,
      priceSeenMinor: existing?.priceSeenMinor ?? item.priceSeenMinor,
    });
  }

  for (const [productId, item] of wanted) {
    const product = catalog.products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) {
      summary.unavailableCount++;
      continue;
    }
    const quantity = Math.min(item.quantity, product.stock);
    if (quantity < item.quantity) summary.quantityReducedCount++;
    const previousPriceMinor =
      item.priceSeenMinor !== undefined && item.priceSeenMinor !== product.priceMinor ? item.priceSeenMinor : null;
    if (previousPriceMinor) summary.priceChangedCount++;
    const lineTotalMinor = BigInt(product.priceMinor) * BigInt(quantity);
    summary.lines.push({ product, quantity, requestedQuantity: item.quantity, lineTotalMinor, previousPriceMinor });
    summary.itemCount += quantity;
    summary.subtotalMinor += lineTotalMinor;
  }

  if (summary.lines.length > 0 && store.deliveryFeeMinor !== null) {
    const freeOver = store.freeDeliveryOverMinor === null ? null : BigInt(store.freeDeliveryOverMinor);
    summary.deliveryMinor = freeOver !== null && summary.subtotalMinor >= freeOver ? ZERO : BigInt(store.deliveryFeeMinor);
  }
  summary.totalMinor = summary.subtotalMinor + summary.deliveryMinor;
  return summary;
}

/** Whether the shopper must be told that prices, quantities or items changed. */
export function hasCartChanges(summary: CartSummary) {
  return summary.unavailableCount + summary.quantityReducedCount + summary.priceChangedCount > 0;
}

/** The cart as it is now: unavailable items dropped, quantities capped, current prices noted as seen. */
export function acceptedSession(summary: CartSummary, storeId: string): StoredSession {
  return {
    storeId,
    cart: summary.lines.map((line) => ({
      storeId,
      productId: line.product.id,
      quantity: line.quantity,
      priceSeenMinor: line.product.priceMinor,
    })),
  };
}

export function formatStoreMoney(
  store: Pick<StorefrontStore, "currency" | "minorUnits" | "locale">,
  minor: bigint | string,
): string {
  return formatMinorUnits(typeof minor === "bigint" ? minor : BigInt(minor), store.currency, store.minorUnits, store.locale);
}

export function isProductOnSale(product: Pick<StorefrontProduct, "priceMinor" | "compareAtMinor">) {
  return product.compareAtMinor !== null && BigInt(product.compareAtMinor) > BigInt(product.priceMinor);
}

export function categoryNameOf(categories: StorefrontCategory[], categoryId: string) {
  return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorised";
}

/**
 * Converts exact minor units to the legacy number used by the browser-only
 * DEMO order record (lib/demo-db.ts). Only for that labelled demo record —
 * never for real totals, which stay in minor units.
 */
export function minorToDemoAmount(minor: bigint | string, minorUnits: number) {
  return Number(fromMinorUnits(typeof minor === "bigint" ? minor : BigInt(minor), minorUnits));
}

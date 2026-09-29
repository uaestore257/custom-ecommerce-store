"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import {
  acceptedSession,
  computeCart,
  reconcileSession,
  type CartSummary,
  type StoredSession,
} from "./storefront-cart";
import { clearStorefrontStoreCookie, setStorefrontStoreCookie } from "./storefront-cookie";
import type {
  StorefrontCatalog,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontStore,
} from "./storefront-types";
import { readJson, writeJson } from "./storage";

// ---------------------------------------------------------------
// STOREFRONT (browser side)
// Store branding, categories, products, prices and stock come from the
// server (lib/server/storefront/catalog.ts) through StorefrontDataContext,
// provided by StorefrontShell. The browser keeps only the cart item list
// — { storeId, productId, quantity } — and every price or stock figure is
// recomputed from the current server catalog (lib/storefront-cart.ts).
// A cart always belongs to exactly one store.
// ---------------------------------------------------------------

const KEY = "storefront";

/** undefined = not read from the browser yet (server render / hydration). */
let session: StoredSession | null | undefined;
const listeners = new Set<() => void>();

function load(): StoredSession | null {
  const saved = readJson<StoredSession>(KEY);
  if (!saved || typeof saved.storeId !== "string" || !Array.isArray(saved.cart)) return null;
  return {
    storeId: saved.storeId,
    cart: saved.cart.filter(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        typeof item.storeId === "string" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    ),
  };
}

function getSnapshot() {
  if (session === undefined) session = load();
  return session;
}

function getServerSnapshot(): StoredSession | null | undefined {
  return undefined;
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key.endsWith(KEY)) {
    session = load();
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorageEvent);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorageEvent);
  };
}

function commit(next: StoredSession) {
  session = next;
  writeJson(KEY, next);
  listeners.forEach((l) => l());
}

function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Raw cart session (undefined while loading, null if none). Used by the admin preview button. */
export const useStorefrontSession = useSession;

// ---------------- Actions ----------------

/**
 * Shows another store: remembers the choice in the store cookie and
 * empties the cart. The caller then refreshes the page so the server
 * renders the newly chosen store.
 */
export function switchStorefrontStore(storeId: string) {
  setStorefrontStoreCookie(storeId);
  commit({ storeId, cart: [] });
}

/** Back to the configured default store, with an empty cart. */
export function resetStorefrontStore() {
  clearStorefrontStoreCookie();
  session = null;
  writeJson(KEY, null);
  listeners.forEach((l) => l());
}

/** Empties a cart saved for another store than the one the server is showing. */
export function syncCartStore(shownStoreId: string) {
  const current = getSnapshot();
  if (current && current.storeId !== shownStoreId) commit({ storeId: shownStoreId, cart: [] });
}

export type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "different-store" | "out-of-stock" };

/**
 * @param shownStoreId the store the storefront is showing. Products of
 * any other store are refused.
 */
export function addToCart(product: StorefrontProduct, quantity: number, shownStoreId: string): AddToCartResult {
  if (product.storeId !== shownStoreId) return { ok: false, reason: "different-store" };
  const current = reconcileSession(getSnapshot(), shownStoreId);
  const existing = current.cart.find((item) => item.productId === product.id);
  const already = existing?.quantity ?? 0;
  const capped = Math.min(already + quantity, product.stock);
  if (product.stock <= 0 || capped <= already) return { ok: false, reason: "out-of-stock" };
  const item = { storeId: shownStoreId, productId: product.id, quantity: capped, priceSeenMinor: product.priceMinor };
  const cart = existing
    ? current.cart.map((i) => (i.productId === product.id ? item : i))
    : [...current.cart, item];
  commit({ storeId: shownStoreId, cart });
  return { ok: true };
}

export function setCartQuantity(productId: string, quantity: number) {
  const current = getSnapshot();
  if (!current) return;
  const cart =
    quantity <= 0
      ? current.cart.filter((item) => item.productId !== productId)
      : current.cart.map((item) => (item.productId === productId ? { ...item, quantity } : item));
  commit({ ...current, cart });
}

export function removeFromCart(productId: string) {
  setCartQuantity(productId, 0);
}

export function clearCart() {
  const current = getSnapshot();
  if (current) commit({ ...current, cart: [] });
}

/** The shopper has seen the updated prices/quantities: save the cart as it is now. */
export function acceptCartChanges(summary: CartSummary, storeId: string) {
  commit(acceptedSession(summary, storeId));
}

// ---------------- Server data + combined hook ----------------

export interface StorefrontData {
  catalog: StorefrontCatalog | null;
}

export const StorefrontDataContext = createContext<StorefrontData>({ catalog: null });

export interface StorefrontView {
  store: StorefrontStore;
  categories: StorefrontCategory[];
  /** ACTIVE products of this store, as the server last sent them. */
  products: StorefrontProduct[];
  cart: CartSummary;
  /** false during the server render and hydration, before the saved cart is read. */
  cartLoaded: boolean;
}

/** Everything a storefront page needs, or null if there is no public store to show. */
export function useStorefront(): StorefrontView | null {
  const { catalog } = useContext(StorefrontDataContext);
  const current = useSession();
  if (!catalog) return null;
  return {
    store: catalog.store,
    categories: catalog.categories,
    products: catalog.products,
    cart: computeCart(catalog, current),
    cartLoaded: current !== undefined,
  };
}

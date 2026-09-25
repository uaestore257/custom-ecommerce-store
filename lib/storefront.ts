"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_STOREFRONT_STORE_ID } from "./config";
import { findStore, getStoreData, useDemoState } from "./demo-db";
import { roundMoney } from "./format";
import { readJson, writeJson } from "./storage";
import type { CartItem, DemoState, Product, Store, StoreData } from "./types";

// ---------------------------------------------------------------
// STOREFRONT SESSION (browser only)
// Which client store the public storefront is showing, plus the cart.
// The cart always belongs to exactly ONE store: every item carries the
// storeId, and items from another store are refused.
// ---------------------------------------------------------------

interface StorefrontSession {
  storeId: string;
  cart: CartItem[];
}

const KEY = "storefront";

let session: StorefrontSession | null = null;
const listeners = new Set<() => void>();

function load(): StorefrontSession {
  const saved = readJson<StorefrontSession>(KEY);
  if (saved && typeof saved.storeId === "string" && Array.isArray(saved.cart)) {
    return {
      storeId: saved.storeId,
      // Drop anything that does not belong to the saved store.
      cart: saved.cart.filter((item) => item.storeId === saved.storeId && item.quantity > 0),
    };
  }
  return { storeId: DEFAULT_STOREFRONT_STORE_ID, cart: [] };
}

function getSnapshot() {
  if (session === null) session = load();
  return session;
}

function getServerSnapshot(): StorefrontSession | null {
  return null;
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

function commit(next: StorefrontSession) {
  session = next;
  writeJson(KEY, next);
  listeners.forEach((l) => l());
}

function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Raw storefront session (null while loading). Used by the admin preview button. */
export const useStorefrontSession = useSession;

// ---------------- Actions ----------------

/** Switches the storefront to another store. The cart is emptied. */
export function switchStorefrontStore(storeId: string) {
  commit({ storeId, cart: [] });
}

export type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "different-store" | "out-of-stock" };

/**
 * @param shownStoreId the store the storefront is currently showing
 * (from useStorefront). Items from any other store are refused.
 */
export function addToCart(
  product: Product,
  quantity: number,
  shownStoreId: string,
): AddToCartResult {
  if (product.storeId !== shownStoreId) return { ok: false, reason: "different-store" };
  let current = getSnapshot();
  if (current.storeId !== shownStoreId) {
    // The saved store no longer exists (e.g. deleted in the admin) and the
    // storefront fell back to another store: start a fresh cart for it.
    current = { storeId: shownStoreId, cart: [] };
  }
  const existing = current.cart.find((item) => item.productId === product.id);
  const wanted = (existing?.quantity ?? 0) + quantity;
  const capped = Math.min(wanted, product.stock);
  if (product.stock <= 0 || capped <= (existing?.quantity ?? 0)) {
    return { ok: false, reason: "out-of-stock" };
  }
  const cart = existing
    ? current.cart.map((item) =>
        item.productId === product.id ? { ...item, quantity: capped } : item,
      )
    : [...current.cart, { storeId: product.storeId, productId: product.id, quantity: capped }];
  commit({ ...current, cart });
  return { ok: true };
}

export function setCartQuantity(productId: string, quantity: number) {
  const current = getSnapshot();
  const cart =
    quantity <= 0
      ? current.cart.filter((item) => item.productId !== productId)
      : current.cart.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        );
  commit({ ...current, cart });
}

export function removeFromCart(productId: string) {
  setCartQuantity(productId, 0);
}

export function clearCart() {
  commit({ ...getSnapshot(), cart: [] });
}

// ---------------- Combined hook ----------------

export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export interface StorefrontView {
  state: DemoState;
  store: Store;
  data: StoreData;
  /** Products customers can see: active status only. */
  products: Product[];
  cartLines: CartLine[];
  cartCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** Number of cart items removed because the product no longer exists. */
  unavailableCount: number;
}

function resolveStore(state: DemoState, storeId: string): Store | null {
  return (
    findStore(state, storeId) ??
    findStore(state, DEFAULT_STOREFRONT_STORE_ID) ??
    state.stores[0] ??
    null
  );
}

/**
 * Everything a storefront page needs. Returns:
 * - undefined while browser data is loading
 * - null if there are no stores at all
 */
export function useStorefront(): StorefrontView | null | undefined {
  const state = useDemoState();
  const current = useSession();
  if (!state || !current) return undefined;

  const store = resolveStore(state, current.storeId);
  if (!store) return null;
  const data = getStoreData(state, store.id);
  const products = data.products.filter((p) => p.status === "active");

  // Only use cart items that belong to the store being shown.
  const cartItems = current.storeId === store.id ? current.cart : [];
  const cartLines: CartLine[] = [];
  let unavailableCount = 0;
  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.stock <= 0) {
      unavailableCount++;
      continue;
    }
    const quantity = Math.min(item.quantity, product.stock);
    cartLines.push({ product, quantity, lineTotal: roundMoney(product.price * quantity) });
  }

  const subtotal = roundMoney(cartLines.reduce((sum, line) => sum + line.lineTotal, 0));
  const { deliveryFee: fee, freeDeliveryThreshold } = store.settings;
  const deliveryFee =
    cartLines.length === 0 || (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold)
      ? 0
      : fee;

  return {
    state,
    store,
    data,
    products,
    cartLines,
    cartCount: cartLines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    deliveryFee,
    total: roundMoney(subtotal + deliveryFee),
    unavailableCount,
  };
}

"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import {
  acceptedSession,
  computeCart,
  reconcileSession,
  type CartSummary,
  type StoredSession,
} from "./storefront-cart";
import { clearStorefrontStoreCookie, setStorefrontStoreCookie } from "./storefront-cookie";
import type { CartProductRef, StorefrontContext, StorefrontProductSummary } from "./storefront-types";
import { readJson, writeJson } from "./storage";

// ---------------------------------------------------------------
// STOREFRONT (browser side) — shared by every template.
//
// The server renders catalogue pages; the browser only receives the
// store context (branding, template, navigation) through
// StorefrontDataContext, plus whatever products a page shows. The cart
// keeps only { storeId, productId, quantity } in localStorage, and its
// prices, stock and availability always come from a fresh server read of
// exactly the products in it (/api/storefront/cart-products, resolved by
// host). Cart maths is lib/storefront-cart.ts. A cart always belongs to
// exactly one store. Templates call these hooks; they never fetch or
// compute cart data themselves.
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

function notify() {
  listeners.forEach((l) => l());
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key.endsWith(KEY)) {
    session = load();
    notify();
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
  notify();
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
  notify();
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
export function addToCart(product: CartProductRef, quantity: number, shownStoreId: string): AddToCartResult {
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

// ---------------- Store context (from the server layout) ----------------

export const StorefrontDataContext = createContext<StorefrontContext | null>(null);

/** The store this page serves (branding, template, navigation), or null outside a storefront. */
export function useStorefrontContext(): StorefrontContext | null {
  return useContext(StorefrontDataContext);
}

/** Units in the cart for the shown store (no server read needed). */
export function useCartCount(): number {
  const context = useStorefrontContext();
  const current = useSession();
  if (!context || !current || current.storeId !== context.store.id) return 0;
  return current.cart.reduce((sum, item) => sum + (item.storeId === context.store.id ? item.quantity : 0), 0);
}

/** How many of one product are in the cart (for add-to-cart buttons). */
export function useQuantityInCart(productId: string): number {
  const context = useStorefrontContext();
  const current = useSession();
  if (!context || !current || current.storeId !== context.store.id) return 0;
  return current.cart.find((item) => item.productId === productId && item.storeId === context.store.id)?.quantity ?? 0;
}

// ---------------- Fresh product data for the cart ----------------

interface CartProductsState {
  storeId: string | null;
  products: Map<string, StorefrontProductSummary>;
  /** Ids the server has answered for (present or not) since the last refresh. */
  checked: Set<string>;
  error: boolean;
  inFlight: string | null;
  version: number;
}

let cartProducts: CartProductsState = {
  storeId: null,
  products: new Map(),
  checked: new Set(),
  error: false,
  inFlight: null,
  version: 0,
};
const productListeners = new Set<() => void>();

function setCartProducts(next: Partial<CartProductsState>) {
  cartProducts = { ...cartProducts, ...next, version: cartProducts.version + 1 };
  productListeners.forEach((l) => l());
}

function subscribeCartProducts(listener: () => void) {
  productListeners.add(listener);
  return () => productListeners.delete(listener);
}

const getCartProductsVersion = () => cartProducts.version;
const getServerCartProductsVersion = () => 0;

async function fetchCartProducts(storeId: string, ids: string[]) {
  const key = `${storeId}:${ids.join(",")}`;
  if (cartProducts.inFlight === key) return;
  setCartProducts({ inFlight: key, error: false });
  try {
    const response = await fetch(`/api/storefront/cart-products?ids=${encodeURIComponent(ids.join(","))}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`cart products: ${response.status}`);
    const body = (await response.json()) as { storeId?: unknown; products?: unknown };
    // The server decides the store from the host; refuse a mismatched answer.
    if (body.storeId !== storeId || !Array.isArray(body.products)) throw new Error("cart products: unexpected store");
    const products = new Map(cartProducts.storeId === storeId ? cartProducts.products : []);
    for (const id of ids) products.delete(id);
    for (const product of body.products as StorefrontProductSummary[]) {
      if (product && product.storeId === storeId && ids.includes(product.id)) products.set(product.id, product);
    }
    const checked = new Set(cartProducts.storeId === storeId ? cartProducts.checked : []);
    ids.forEach((id) => checked.add(id));
    setCartProducts({ storeId, products, checked, inFlight: null });
  } catch {
    if (cartProducts.inFlight === key) setCartProducts({ inFlight: null, error: true });
  }
}

/**
 * Forget which cart products were checked, so every product in the cart is
 * read again from the server (useCart's effect performs the read). Stable:
 * safe to use in effect dependencies.
 */
export function requestCartRefresh() {
  setCartProducts({ checked: new Set(), error: false });
}

export type CartStatus = "loading" | "ready" | "error";

export interface CartView {
  context: StorefrontContext;
  cart: CartSummary;
  /** "ready" only once every product in the cart has been checked with the server. */
  status: CartStatus;
  /** Re-read prices and stock of everything in the cart (e.g. when checkout opens). */
  refresh: () => void;
}

/**
 * The shown store's cart, priced from a fresh server read of its products.
 * Opening a component that uses this hook re-checks prices and stock once
 * (pass `refreshOnMount: false` for always-mounted surfaces like a header).
 */
export function useCart({ refreshOnMount = true }: { refreshOnMount?: boolean } = {}): CartView | null {
  const context = useStorefrontContext();
  const current = useSession();
  useSyncExternalStore(subscribeCartProducts, getCartProductsVersion, getServerCartProductsVersion);
  const storeId = context?.store.id ?? null;
  const ids =
    current && storeId && current.storeId === storeId
      ? [...new Set(current.cart.filter((item) => item.storeId === storeId).map((item) => item.productId))].toSorted()
      : [];

  // Re-check everything when the component opens. New products are
  // fetched by the effect below; quantity changes need no server read.
  useEffect(() => {
    if (refreshOnMount) requestCartRefresh();
  }, [refreshOnMount]);

  const sameStore = cartProducts.storeId === storeId;
  const missing = ids.filter((id) => !sameStore || !cartProducts.checked.has(id));
  const missingKey = missing.join(",");
  useEffect(() => {
    if (storeId && missingKey) void fetchCartProducts(storeId, missingKey.split(","));
  }, [storeId, missingKey]);

  if (!context) return null;
  const products = sameStore ? [...cartProducts.products.values()] : [];
  const settled = current !== undefined && cartProducts.inFlight === null;
  const status: CartStatus =
    settled && missing.length === 0 ? "ready" : settled && cartProducts.error ? "error" : "loading";
  return { context, cart: computeCart({ ...context, products }, current), status, refresh: requestCartRefresh };
}

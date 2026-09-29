"use client";

import { useSyncExternalStore } from "react";
import { createSeedState, defaultCategories, defaultStoreSettings } from "./demo-data";
import { readJson, removeKeys, STORAGE_PREFIX, writeJson } from "./storage";
import type {
  AgencySettings,
  Category,
  Customer,
  DemoState,
  Product,
  Store,
  StoreData,
  StoreSettings,
  StoreStatus,
} from "./types";

// ---------------------------------------------------------------
// DEMO DATA LAYER (browser only)
//
// This file stands in for a real backend. Each client store's data is
// saved under its own localStorage key ("store:<storeId>"), and every
// function that reads or changes store data takes a storeId, so one
// store's products, orders and customers are never mixed with another's.
//
// This is NOT security: anyone using the browser can change
// localStorage. Real tenant isolation needs a server and database.
// ---------------------------------------------------------------

const KEYS = {
  agency: "agency",
  stores: "stores",
  storeData: (storeId: string) => `store:${storeId}`,
};

const emptyStoreData = (): StoreData => ({
  categories: [],
  products: [],
  orders: [],
  customers: [],
});

let state: DemoState | null = null;
const listeners = new Set<() => void>();

function loadFromStorage(): DemoState {
  const seed = createSeedState();
  const savedStores = readJson<Store[]>(KEYS.stores);
  const stores = Array.isArray(savedStores) ? savedStores : seed.stores;
  const savedAgency = readJson<AgencySettings>(KEYS.agency);

  const storeData: Record<string, StoreData> = {};
  for (const store of stores) {
    const saved = readJson<StoreData>(KEYS.storeData(store.id));
    storeData[store.id] =
      saved && Array.isArray(saved.products)
        ? { ...emptyStoreData(), ...saved }
        : (seed.storeData[store.id] ?? emptyStoreData());
  }

  return {
    agency: { ...seed.agency, ...(savedAgency ?? {}) },
    stores,
    storeData,
  };
}

function getSnapshot(): DemoState {
  if (state === null) state = loadFromStorage();
  return state;
}

// On the server (and during hydration) there is no localStorage, so we
// report "not loaded yet". Pages show a loading state for that moment,
// which avoids hydration mismatches.
function getServerSnapshot(): DemoState | null {
  return null;
}

function onStorageEvent(event: StorageEvent) {
  // Another browser tab changed the demo data: reload it.
  if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) {
    state = loadFromStorage();
    listeners.forEach((listener) => listener());
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

/** Returns the demo data, or null while it is loading on first render. */
export function useDemoState(): DemoState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function commit(next: DemoState, changed: { agency?: boolean; stores?: boolean; storeIds?: string[] }) {
  state = next;
  if (changed.agency) writeJson(KEYS.agency, next.agency);
  if (changed.stores) writeJson(KEYS.stores, next.stores);
  for (const storeId of changed.storeIds ?? []) {
    writeJson(KEYS.storeData(storeId), next.storeData[storeId]);
  }
  listeners.forEach((listener) => listener());
}

/** Applies a change to ONE store's data collection only. */
function updateStoreData(storeId: string, change: (data: StoreData) => StoreData) {
  const current = getSnapshot();
  const data = current.storeData[storeId];
  if (!data) throw new Error(`Unknown store: ${storeId}`);
  commit(
    { ...current, storeData: { ...current.storeData, [storeId]: change(data) } },
    { storeIds: [storeId] },
  );
}

export function makeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

// ---------------- Selectors ----------------

export function findStore(s: DemoState, storeId: string) {
  return s.stores.find((store) => store.id === storeId) ?? null;
}

export function getStoreData(s: DemoState, storeId: string): StoreData {
  return s.storeData[storeId] ?? emptyStoreData();
}

export function categoryName(data: StoreData, categoryId: string) {
  return data.categories.find((c) => c.id === categoryId)?.name ?? "Uncategorised";
}

export function isSlugTaken(s: DemoState, slug: string, exceptStoreId?: string) {
  return s.stores.some((store) => store.slug === slug && store.id !== exceptStoreId);
}

export function isSkuTaken(data: StoreData, sku: string, exceptProductId?: string) {
  const normalised = sku.trim().toLowerCase();
  return data.products.some(
    (p) => p.sku.trim().toLowerCase() === normalised && p.id !== exceptProductId,
  );
}

// ---------------- Agency ----------------

export function updateAgency(patch: Partial<AgencySettings>) {
  const current = getSnapshot();
  commit({ ...current, agency: { ...current.agency, ...patch } }, { agency: true });
}

export function resetDemoData() {
  removeKeys(() => true);
  state = createSeedState();
  listeners.forEach((listener) => listener());
}

// ---------------- Stores ----------------

export interface NewStoreInput {
  name: string;
  slug: string;
  type: Store["type"];
  status: StoreStatus;
  ownerName: string;
  ownerEmail: string;
  settings: Partial<StoreSettings>;
}

export function createStore(input: NewStoreInput): Store {
  const current = getSnapshot();
  const id = makeId("store");
  const store: Store = {
    id,
    name: input.name.trim(),
    slug: input.slug,
    type: input.type,
    status: input.status,
    ownerName: input.ownerName.trim(),
    ownerEmail: input.ownerEmail.trim(),
    createdAt: new Date().toISOString(),
    settings: defaultStoreSettings({
      heroTitle: `Welcome to ${input.name.trim()}`,
      contactEmail: input.ownerEmail.trim(),
      ...input.settings,
    }),
  };
  const data: StoreData = { ...emptyStoreData(), categories: defaultCategories(id, input.type) };
  commit(
    {
      ...current,
      stores: [...current.stores, store],
      storeData: { ...current.storeData, [id]: data },
    },
    { stores: true, storeIds: [id] },
  );
  return store;
}

export type StoreUpdate = Partial<Omit<Store, "id" | "createdAt" | "settings">> & {
  settings?: Partial<StoreSettings>;
};

export function updateStore(storeId: string, patch: StoreUpdate) {
  const current = getSnapshot();
  commit(
    {
      ...current,
      stores: current.stores.map((store) =>
        store.id === storeId
          ? { ...store, ...patch, settings: { ...store.settings, ...patch.settings } }
          : store,
      ),
    },
    { stores: true },
  );
}

export function setStoreStatus(storeId: string, status: StoreStatus) {
  updateStore(storeId, { status });
}

export function deleteStore(storeId: string) {
  const current = getSnapshot();
  const storeData = { ...current.storeData };
  delete storeData[storeId];
  commit(
    { ...current, stores: current.stores.filter((s) => s.id !== storeId), storeData },
    { stores: true },
  );
  removeKeys((key) => key === STORAGE_PREFIX + KEYS.storeData(storeId));
}

// ---------------- Categories ----------------

export function isCategoryNameTaken(data: StoreData, name: string, exceptCategoryId?: string) {
  const normalised = name.trim().toLowerCase();
  return data.categories.some(
    (c) => c.name.trim().toLowerCase() === normalised && c.id !== exceptCategoryId,
  );
}

export function addCategory(storeId: string, input: { name: string; imageUrl?: string }): Category {
  const category: Category = {
    id: makeId(`${storeId}-cat`),
    storeId,
    name: input.name.trim(),
    imageUrl: input.imageUrl?.trim() ?? "",
  };
  updateStoreData(storeId, (data) => ({ ...data, categories: [...data.categories, category] }));
  return category;
}

/** Rename a category or change its image. Products keep pointing at it by ID. */
export function updateCategory(
  storeId: string,
  categoryId: string,
  patch: { name?: string; imageUrl?: string },
) {
  updateStoreData(storeId, (data) => ({
    ...data,
    categories: data.categories.map((c) =>
      c.id === categoryId
        ? {
            ...c,
            ...(patch.name !== undefined && { name: patch.name.trim() }),
            ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl.trim() }),
          }
        : c,
    ),
  }));
}

/** Moves a category one place up (-1) or down (+1). The list order is the storefront order. */
export function moveCategory(storeId: string, categoryId: string, direction: -1 | 1) {
  updateStoreData(storeId, (data) => {
    const index = data.categories.findIndex((c) => c.id === categoryId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= data.categories.length) return data;
    const categories = [...data.categories];
    [categories[index], categories[target]] = [categories[target], categories[index]];
    return { ...data, categories };
  });
}

/**
 * Deletes a category. If products still use it, they are moved to
 * `moveProductsTo` (another category of the SAME store) first.
 */
export function deleteCategory(storeId: string, categoryId: string, moveProductsTo?: string) {
  updateStoreData(storeId, (data) => {
    const inUse = data.products.some((p) => p.categoryId === categoryId);
    if (inUse) {
      const target = data.categories.find((c) => c.id === moveProductsTo && c.id !== categoryId);
      if (!target) throw new Error("Choose another category for this category's products.");
    }
    return {
      ...data,
      categories: data.categories.filter((c) => c.id !== categoryId),
      products: inUse
        ? data.products.map((p) => (p.categoryId === categoryId ? { ...p, categoryId: moveProductsTo! } : p))
        : data.products,
    };
  });
}

// ---------------- Products ----------------

export type ProductInput = Omit<Product, "id" | "storeId">;

export function createProduct(storeId: string, input: ProductInput): Product {
  const product: Product = { ...input, id: makeId("prd"), storeId };
  updateStoreData(storeId, (data) => ({ ...data, products: [...data.products, product] }));
  return product;
}

export function updateProduct(storeId: string, productId: string, input: ProductInput) {
  updateStoreData(storeId, (data) => ({
    ...data,
    products: data.products.map((p) =>
      // storeId stays locked to the store the product belongs to.
      p.id === productId ? { ...p, ...input, id: p.id, storeId: p.storeId } : p,
    ),
  }));
}

export function deleteProduct(storeId: string, productId: string) {
  updateStoreData(storeId, (data) => ({
    ...data,
    products: data.products.filter((p) => p.id !== productId),
  }));
}

// ---------------- Customers ----------------

export function customerOrderCount(data: StoreData, customer: Customer) {
  return data.orders.filter((o) => o.customerId === customer.id).length;
}

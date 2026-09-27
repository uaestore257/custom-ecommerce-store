"use server";

// ---------------------------------------------------------------
// ADMIN SERVER ACTIONS (stores, products, categories)
//
// Server Actions are public POST endpoints, so each one:
//   1. checks its arguments are plain strings (never trusts the client),
//   2. calls the access hook (authentication arrives in Phase 2 — until
//      then /admin is open to anyone who can reach it, as before),
//   3. delegates to the server-only data-access layer, which validates
//      the input and scopes every product/category query by storeId,
//   4. refreshes the admin pages.
// The storeId always comes from the page's route; form data never
// decides which store is changed. Unexpected errors are logged on the
// server and the browser only gets a generic message.
// ---------------------------------------------------------------
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/admin/types";
import { getDb } from "@/lib/server/db";
import {
  createAdminCategory,
  deleteAdminCategory,
  moveAdminCategory,
  updateAdminCategory,
} from "@/lib/server/admin/categories";
import { authorizePlatformAdmin, authorizeStoreAccess } from "@/lib/server/admin/common";
import { createAdminProduct, deleteAdminProduct, updateAdminProduct } from "@/lib/server/admin/products";
import {
  archiveAdminStore,
  createAdminStore,
  restoreAdminStore,
  setAdminStoreStatus,
  updateAdminStore,
} from "@/lib/server/admin/stores";

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

async function run<T>(label: string, work: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  let result: ActionResult<T>;
  try {
    result = await work();
  } catch (error) {
    // Logged for the developer; never sent to the browser.
    console.error(`[admin action] ${label} failed`, error);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

const badRequest: ActionResult<never> = { ok: false, error: "Invalid request." };

// ---------- Stores ----------

export async function createStoreAction(input: unknown) {
  await authorizePlatformAdmin();
  return run("createStore", () => createAdminStore(getDb(), input));
}

export async function updateStoreAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("updateStore", () => updateAdminStore(getDb(), storeId, input));
}

export async function setStoreStatusAction(storeId: unknown, status: unknown) {
  if (!isId(storeId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("setStoreStatus", () => setAdminStoreStatus(getDb(), storeId, status));
}

export async function archiveStoreAction(storeId: unknown) {
  if (!isId(storeId)) return badRequest;
  await authorizePlatformAdmin();
  return run("archiveStore", () => archiveAdminStore(getDb(), storeId));
}

export async function restoreStoreAction(storeId: unknown) {
  if (!isId(storeId)) return badRequest;
  await authorizePlatformAdmin();
  return run("restoreStore", () => restoreAdminStore(getDb(), storeId));
}

// ---------- Products (always scoped to the route's store) ----------

export async function createProductAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("createProduct", () => createAdminProduct(getDb(), storeId, input));
}

export async function updateProductAction(storeId: unknown, productId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("updateProduct", () => updateAdminProduct(getDb(), storeId, productId, input));
}

export async function deleteProductAction(storeId: unknown, productId: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("deleteProduct", () => deleteAdminProduct(getDb(), storeId, productId));
}

// ---------- Categories (always scoped to the route's store) ----------

export async function createCategoryAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("createCategory", () => createAdminCategory(getDb(), storeId, input));
}

export async function updateCategoryAction(storeId: unknown, categoryId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("updateCategory", () => updateAdminCategory(getDb(), storeId, categoryId, input));
}

export async function moveCategoryAction(storeId: unknown, categoryId: unknown, direction: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("moveCategory", () => moveAdminCategory(getDb(), storeId, categoryId, direction));
}

export async function deleteCategoryAction(storeId: unknown, categoryId: unknown, moveProductsTo: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  if (moveProductsTo !== undefined && moveProductsTo !== null && !isId(moveProductsTo)) return badRequest;
  await authorizeStoreAccess(storeId);
  return run("deleteCategory", () => deleteAdminCategory(getDb(), storeId, categoryId, moveProductsTo ?? undefined));
}

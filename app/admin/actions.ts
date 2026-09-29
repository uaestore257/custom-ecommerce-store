"use server";

// ---------------------------------------------------------------
// ADMIN SERVER ACTIONS (stores, products, categories, orders, messages)
//
// Server Actions are public POST endpoints, so each one:
//   1. checks its arguments are plain strings (never trusts the client),
//   2. checks the signed-in session with requirePlatformOwner(): the user
//      is read from the session cookie and the database, never from the
//      request body. Phase 2a: only the platform owner may use the admin.
//   3. delegates to the server-only data-access layer, which validates
//      the input and scopes every product/category query by storeId,
//   4. refreshes the admin pages.
// Every exported action must appear in ACTION_PERMISSIONS
// (lib/server/admin/permissions.ts); a test fails otherwise.
// Unexpected errors are logged on the server and the browser only gets
// a generic message.
// ---------------------------------------------------------------
import type { ActionResult } from "@/lib/admin/types";
import { getDb } from "@/lib/server/db";
import { AccessDenied, requirePlatformOwner, type PlatformOwner } from "@/lib/server/auth/guards";
import {
  createAdminCategory,
  deleteAdminCategory,
  moveAdminCategory,
  updateAdminCategory,
} from "@/lib/server/admin/categories";
import { setAdminInquiryStatus } from "@/lib/server/admin/inquiries";
import { cancelAdminOrder, setAdminOrderPayment, setAdminOrderStatus } from "@/lib/server/admin/orders";
import { createAdminProduct, deleteAdminProduct, updateAdminProduct } from "@/lib/server/admin/products";
import {
  archiveAdminStore,
  createAdminStore,
  restoreAdminStore,
  setAdminStoreOwner,
  setAdminStoreStatus,
  updateAdminStore,
} from "@/lib/server/admin/stores";
import { requestRuntime } from "@/lib/server/request-runtime";

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";
const SIGNED_OUT: ActionResult<never> = { ok: false, error: "Your session has ended. Please sign in again." };
const FORBIDDEN: ActionResult<never> = { ok: false, error: "You don't have access to do this." };
const badRequest: ActionResult<never> = { ok: false, error: "Invalid request." };

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

/** Runs `work` only for the signed-in platform owner. */
async function asPlatformOwner<T>(
  label: string,
  work: (owner: PlatformOwner) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  let owner: PlatformOwner;
  try {
    owner = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof AccessDenied) return error.reason === "unauthenticated" ? SIGNED_OUT : FORBIDDEN;
    console.error(`[admin action] ${label}: session check failed`, error);
    return { ok: false, error: GENERIC_ERROR };
  }

  let result: ActionResult<T>;
  try {
    result = await work(owner);
  } catch (error) {
    // Logged for the developer; never sent to the browser.
    console.error(`[admin action] ${label} failed`, error);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (result.ok) requestRuntime().revalidateAdmin();
  return result;
}

// ---------- Stores (platform owner only) ----------

export async function createStoreAction(input: unknown) {
  return asPlatformOwner("createStore", (owner) => createAdminStore(owner, getDb(), input));
}

export async function updateStoreAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("updateStore", (owner) => updateAdminStore(owner, getDb(), storeId, input));
}

export async function setStoreOwnerAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("setStoreOwner", (owner) => setAdminStoreOwner(owner, getDb(), storeId, input));
}

export async function setStoreStatusAction(storeId: unknown, status: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("setStoreStatus", (owner) => setAdminStoreStatus(owner, getDb(), storeId, status));
}

export async function archiveStoreAction(storeId: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("archiveStore", (owner) => archiveAdminStore(owner, getDb(), storeId));
}

export async function restoreStoreAction(storeId: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("restoreStore", (owner) => restoreAdminStore(owner, getDb(), storeId));
}

// ---------- Products (scoped to the route's store) ----------

export async function createProductAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("createProduct", () => createAdminProduct(getDb(), storeId, input));
}

export async function updateProductAction(storeId: unknown, productId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  return asPlatformOwner("updateProduct", () => updateAdminProduct(getDb(), storeId, productId, input));
}

export async function deleteProductAction(storeId: unknown, productId: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  return asPlatformOwner("deleteProduct", () => deleteAdminProduct(getDb(), storeId, productId));
}

// ---------- Categories (scoped to the route's store) ----------

export async function createCategoryAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("createCategory", () => createAdminCategory(getDb(), storeId, input));
}

export async function updateCategoryAction(storeId: unknown, categoryId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  return asPlatformOwner("updateCategory", () => updateAdminCategory(getDb(), storeId, categoryId, input));
}

export async function moveCategoryAction(storeId: unknown, categoryId: unknown, direction: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  return asPlatformOwner("moveCategory", () => moveAdminCategory(getDb(), storeId, categoryId, direction));
}

export async function deleteCategoryAction(storeId: unknown, categoryId: unknown, moveProductsTo: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  if (moveProductsTo !== undefined && moveProductsTo !== null && !isId(moveProductsTo)) return badRequest;
  return asPlatformOwner("deleteCategory", () =>
    deleteAdminCategory(getDb(), storeId, categoryId, moveProductsTo ?? undefined),
  );
}

// ---------- Orders (scoped to the route's store) ----------
// "from" is the status the admin saw; the change only applies if the
// order is still in it (see lib/server/admin/orders.ts).

export async function setOrderStatusAction(storeId: unknown, orderId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asPlatformOwner("setOrderStatus", (owner) => setAdminOrderStatus(owner, getDb(), storeId, orderId, from, to));
}

export async function cancelOrderAction(storeId: unknown, orderId: unknown, from: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asPlatformOwner("cancelOrder", (owner) => cancelAdminOrder(owner, getDb(), storeId, orderId, from));
}

export async function setOrderPaymentAction(storeId: unknown, orderId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asPlatformOwner("setOrderPayment", (owner) => setAdminOrderPayment(owner, getDb(), storeId, orderId, from, to));
}

// ---------- Contact messages (scoped to the route's store) ----------
// "from" is the status the admin saw; the change only applies if the
// message still has it (see lib/server/admin/inquiries.ts).

export async function setInquiryStatusAction(storeId: unknown, inquiryId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(inquiryId)) return badRequest;
  return asPlatformOwner("setInquiryStatus", (owner) => setAdminInquiryStatus(owner, getDb(), storeId, inquiryId, from, to));
}

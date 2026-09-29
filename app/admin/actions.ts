"use server";

// ---------------------------------------------------------------
// ADMIN SERVER ACTIONS (stores, products, categories, orders, messages)
//
// Server Actions are public POST endpoints, so each one:
//   1. checks its arguments are plain strings (never trusts the client),
//   2. checks the signed-in session on THIS host, never trusting the
//      request body: requirePlatformOwner() for platform-only actions
//      (the platform owner on ADMIN_HOST), requireStoreAccess(storeId,
//      "write") for actions inside one store (the platform owner on
//      ADMIN_HOST, or that exact store's OWNER on its own host; refused
//      while the store is suspended),
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
import {
  AccessDenied,
  requirePlatformOwner,
  requireStoreAccess,
  type PlatformOwner,
  type StoreAccessGrant,
} from "@/lib/server/auth/guards";
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
const READ_ONLY: ActionResult<never> = {
  ok: false,
  error: "This store is suspended, so nothing can be changed. Contact the platform owner to reactivate it.",
};
const badRequest: ActionResult<never> = { ok: false, error: "Invalid request." };

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

/** Runs `check` (a guard), then `work` with what it returns. Unexpected errors become a generic message. */
async function guarded<A, T>(
  label: string,
  check: () => Promise<A>,
  work: (allowed: A) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  let allowed: A;
  try {
    allowed = await check();
  } catch (error) {
    if (error instanceof AccessDenied) {
      return error.reason === "unauthenticated" ? SIGNED_OUT : error.reason === "read-only" ? READ_ONLY : FORBIDDEN;
    }
    console.error(`[admin action] ${label}: session check failed`, error);
    return { ok: false, error: GENERIC_ERROR };
  }

  let result: ActionResult<T>;
  try {
    result = await work(allowed);
  } catch (error) {
    // Logged for the developer; never sent to the browser.
    console.error(`[admin action] ${label} failed`, error);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (result.ok) requestRuntime().revalidateAdmin();
  return result;
}

/** Platform-only actions: the platform owner, on ADMIN_HOST. */
function asPlatformOwner<T>(label: string, work: (owner: PlatformOwner) => Promise<ActionResult<T>>) {
  return guarded(label, requirePlatformOwner, work);
}

/**
 * Actions that change ONE store: the platform owner on ADMIN_HOST, or
 * that store's OWNER on its own host. Refused (read-only) while the store
 * is suspended; the storeId must be the store the host serves.
 */
function asStoreWriter<T>(label: string, storeId: string, work: (grant: StoreAccessGrant) => Promise<ActionResult<T>>) {
  return guarded(label, () => requireStoreAccess(storeId, "write"), work);
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

// ---------- Products (one store: platform owner or that store's owner) ----------

export async function createProductAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asStoreWriter("createProduct", storeId, () => createAdminProduct(getDb(), storeId, input));
}

export async function updateProductAction(storeId: unknown, productId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  return asStoreWriter("updateProduct", storeId, () => updateAdminProduct(getDb(), storeId, productId, input));
}

export async function deleteProductAction(storeId: unknown, productId: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  return asStoreWriter("deleteProduct", storeId, () => deleteAdminProduct(getDb(), storeId, productId));
}

// ---------- Categories (one store: platform owner or that store's owner) ----------

export async function createCategoryAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asStoreWriter("createCategory", storeId, () => createAdminCategory(getDb(), storeId, input));
}

export async function updateCategoryAction(storeId: unknown, categoryId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  return asStoreWriter("updateCategory", storeId, () => updateAdminCategory(getDb(), storeId, categoryId, input));
}

export async function moveCategoryAction(storeId: unknown, categoryId: unknown, direction: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  return asStoreWriter("moveCategory", storeId, () => moveAdminCategory(getDb(), storeId, categoryId, direction));
}

export async function deleteCategoryAction(storeId: unknown, categoryId: unknown, moveProductsTo: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  if (moveProductsTo !== undefined && moveProductsTo !== null && !isId(moveProductsTo)) return badRequest;
  return asStoreWriter("deleteCategory", storeId, () =>
    deleteAdminCategory(getDb(), storeId, categoryId, moveProductsTo ?? undefined),
  );
}

// ---------- Orders (scoped to the route's store) ----------
// "from" is the status the admin saw; the change only applies if the
// order is still in it (see lib/server/admin/orders.ts).

export async function setOrderStatusAction(storeId: unknown, orderId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asStoreWriter("setOrderStatus", storeId, ({ actor }) => setAdminOrderStatus(actor, getDb(), storeId, orderId, from, to));
}

export async function cancelOrderAction(storeId: unknown, orderId: unknown, from: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asStoreWriter("cancelOrder", storeId, ({ actor }) => cancelAdminOrder(actor, getDb(), storeId, orderId, from));
}

export async function setOrderPaymentAction(storeId: unknown, orderId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asStoreWriter("setOrderPayment", storeId, ({ actor }) => setAdminOrderPayment(actor, getDb(), storeId, orderId, from, to));
}

// ---------- Contact messages (scoped to the route's store) ----------
// "from" is the status the admin saw; the change only applies if the
// message still has it (see lib/server/admin/inquiries.ts).

export async function setInquiryStatusAction(storeId: unknown, inquiryId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(inquiryId)) return badRequest;
  return asStoreWriter("setInquiryStatus", storeId, ({ actor }) => setAdminInquiryStatus(actor, getDb(), storeId, inquiryId, from, to));
}

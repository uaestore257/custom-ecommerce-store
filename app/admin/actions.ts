"use server";

// ---------------------------------------------------------------
// ADMIN SERVER ACTIONS (stores, products, categories, orders, messages)
//
// Server Actions are public POST endpoints, so each one:
//   1. checks its arguments are plain strings (never trusts the client),
//   2. checks the signed-in session on THIS host, never trusting the
//      request body: requirePlatformOwner() for platform-only actions
//      (the platform owner on ADMIN_HOST), role-scoped store guards for
//      actions on the authenticated store-admin host,
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
import { getAuth } from "@/lib/server/auth/auth";
import { updateOwnAccount } from "@/lib/server/auth/account";
import {
  AccessDenied,
  requireAdminViewer,
  requirePlatformOwner,
  requireStoreAccess,
  mayRunStoreAction,
  type StoreAction,
  type PlatformOwner,
  type AdminViewer,
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
  updateStoreOwnerSettings,
} from "@/lib/server/admin/stores";
import { requestRuntime } from "@/lib/server/request-runtime";
import { storeAdminUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { isManagedStoreTeamRole } from "@/lib/admin/team";
import {
  createStoreInvitation,
  revokeStoreInvitation,
  revokeStoreTeamMember,
  updateStoreTeamMemberRole,
} from "@/lib/server/admin/team";
import { getMailer } from "@/lib/server/mailer";
import { hostContext } from "@/lib/server/auth/store-access";
import {
  addStoreDomain,
  disableStoreDomain,
  setPrimaryStoreDomain,
  verifyStoreDomain,
} from "@/lib/server/admin/domains";

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
function asStoreWriter<T>(
  label: string,
  storeId: string,
  action: StoreAction,
  work: (grant: StoreAccessGrant) => Promise<ActionResult<T>>,
) {
  return guarded(label, () => requireStoreAccess(storeId, "write", action), work);
}

/** Store-management actions are limited to authorized OWNER/MANAGER users on the current store-admin host. */
function asCurrentStoreManager<T>(
  label: string,
  action: "team-management" | "domain-management",
  work: (viewer: Extract<AdminViewer, { kind: "store" }>) => Promise<ActionResult<T>>,
) {
  return guarded(
    label,
    async () => {
      const viewer = await requireAdminViewer();
      if (viewer.kind !== "store") throw new AccessDenied("forbidden");
      if (viewer.access !== "write") throw new AccessDenied("read-only");
      if (!mayRunStoreAction(viewer.role, action)) throw new AccessDenied("forbidden");
      return viewer;
    },
    work,
  );
}

// ---------- Stores (platform owner only) ----------

export async function createStoreAction(input: unknown) {
  return asPlatformOwner("createStore", (owner) => createAdminStore(owner, getDb(), input));
}

export async function updateStoreAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("updateStore", (owner) => updateAdminStore(owner, getDb(), storeId, input));
}

export async function updateOwnStoreSettingsAction(input: unknown) {
  return guarded(
    "updateOwnStoreSettings",
    async () => {
      const viewer = await requireAdminViewer();
      if (viewer.kind !== "store" || viewer.role !== "OWNER") throw new AccessDenied("forbidden");
      if (viewer.access !== "write") throw new AccessDenied("read-only");
      return viewer;
    },
    (viewer) => updateStoreOwnerSettings(getDb(), viewer.store.id, viewer.user.id, input),
  );
}

export async function setStoreOwnerAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asPlatformOwner("setStoreOwner", (owner) => setAdminStoreOwner(owner, getDb(), storeId, input));
}

export async function updateMyAccountAction(input: unknown) {
  return guarded("updateMyAccount", requireAdminViewer, (viewer) =>
    updateOwnAccount(getAuth(), getDb(), viewer.user.id, input),
  );
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
  return asStoreWriter("createProduct", storeId, "products", () => createAdminProduct(getDb(), storeId, input));
}

export async function updateProductAction(storeId: unknown, productId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  return asStoreWriter("updateProduct", storeId, "products", () => updateAdminProduct(getDb(), storeId, productId, input));
}

export async function deleteProductAction(storeId: unknown, productId: unknown) {
  if (!isId(storeId) || !isId(productId)) return badRequest;
  return asStoreWriter("deleteProduct", storeId, "products", () => deleteAdminProduct(getDb(), storeId, productId));
}

// ---------- Categories (one store: platform owner or that store's owner) ----------

export async function createCategoryAction(storeId: unknown, input: unknown) {
  if (!isId(storeId)) return badRequest;
  return asStoreWriter("createCategory", storeId, "categories", () => createAdminCategory(getDb(), storeId, input));
}

export async function updateCategoryAction(storeId: unknown, categoryId: unknown, input: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  return asStoreWriter("updateCategory", storeId, "categories", () => updateAdminCategory(getDb(), storeId, categoryId, input));
}

export async function moveCategoryAction(storeId: unknown, categoryId: unknown, direction: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  return asStoreWriter("moveCategory", storeId, "categories", () => moveAdminCategory(getDb(), storeId, categoryId, direction));
}

export async function deleteCategoryAction(storeId: unknown, categoryId: unknown, moveProductsTo: unknown) {
  if (!isId(storeId) || !isId(categoryId)) return badRequest;
  if (moveProductsTo !== undefined && moveProductsTo !== null && !isId(moveProductsTo)) return badRequest;
  return asStoreWriter("deleteCategory", storeId, "categories", () =>
    deleteAdminCategory(getDb(), storeId, categoryId, moveProductsTo ?? undefined),
  );
}

// ---------- Orders (scoped to the route's store) ----------
// "from" is the status the admin saw; the change only applies if the
// order is still in it (see lib/server/admin/orders.ts).

export async function setOrderStatusAction(storeId: unknown, orderId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asStoreWriter("setOrderStatus", storeId, "orders", ({ actor }) => setAdminOrderStatus(actor, getDb(), storeId, orderId, from, to));
}

export async function cancelOrderAction(storeId: unknown, orderId: unknown, from: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asStoreWriter("cancelOrder", storeId, "orders", ({ actor }) => cancelAdminOrder(actor, getDb(), storeId, orderId, from));
}

export async function setOrderPaymentAction(storeId: unknown, orderId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(orderId)) return badRequest;
  return asStoreWriter("setOrderPayment", storeId, "orders", ({ actor }) => setAdminOrderPayment(actor, getDb(), storeId, orderId, from, to));
}

// ---------- Contact messages (scoped to the route's store) ----------
// "from" is the status the admin saw; the change only applies if the
// message still has it (see lib/server/admin/inquiries.ts).

export async function setInquiryStatusAction(storeId: unknown, inquiryId: unknown, from: unknown, to: unknown) {
  if (!isId(storeId) || !isId(inquiryId)) return badRequest;
  return asStoreWriter("setInquiryStatus", storeId, "messages", ({ actor }) => setAdminInquiryStatus(actor, getDb(), storeId, inquiryId, from, to));
}

// ---------- Store team (current Store Owner's store only) ----------

export async function updateStoreMemberRoleAction(memberId: unknown, role: unknown) {
  if (!isId(memberId) || !isManagedStoreTeamRole(role)) return badRequest;
  return asCurrentStoreManager("updateStoreMemberRole", "team-management", (viewer) =>
    updateStoreTeamMemberRole(getDb(), viewer.store.id, viewer.user.id, memberId, role),
  );
}

export async function revokeStoreMemberAction(memberId: unknown) {
  if (!isId(memberId)) return badRequest;
  return asCurrentStoreManager("revokeStoreMember", "team-management", (viewer) =>
    revokeStoreTeamMember(getDb(), viewer.store.id, viewer.user.id, memberId),
  );
}

export async function createStoreInvitationAction(email: unknown, role: unknown) {
  if (typeof email !== "string" || !isManagedStoreTeamRole(role)) return badRequest;
  return asCurrentStoreManager("createStoreInvitation", "team-management", async (viewer) => {
    const db = getDb();
    const headers = await requestRuntime().headers();
    const rawHost = headers.get("host");
    const { host, hostStore } = await hostContext(db, rawHost ?? "");
    if (host.kind !== "store" || !hostStore || hostStore.id !== viewer.store.id) return FORBIDDEN;
    if (!rawHost) return FORBIDDEN;
    const store = await db.store.findUnique({
      where: { id: viewer.store.id },
      select: { name: true },
    });
    if (!store) return FORBIDDEN;
    const storeAdminUrl = storeAdminUrlForSlug(host.slug, process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    if (!storeAdminUrl) return FORBIDDEN;
    const acceptUrl = new URL("/accept-invitation", storeAdminUrl);
    return createStoreInvitation(
      db,
      { storeId: viewer.store.id, actorUserId: viewer.user.id, email, role, storeName: store.name, acceptUrl: acceptUrl.toString() },
      getMailer(),
    );
  });
}

export async function revokeStoreInvitationAction(invitationId: unknown) {
  if (!isId(invitationId)) return badRequest;
  return asCurrentStoreManager("revokeStoreInvitation", "team-management", (viewer) =>
    revokeStoreInvitation(getDb(), {
      storeId: viewer.store.id,
      actorUserId: viewer.user.id,
      invitationId,
    }),
  );
}

// ---------- Custom domains (current store OWNER/MANAGER only) ----------

export async function addStoreDomainAction(hostname: unknown) {
  return asCurrentStoreManager("addStoreDomain", "domain-management", (viewer) =>
    addStoreDomain(getDb(), viewer.store.id, viewer.user.id, hostname, storeHostConfig()),
  );
}

export async function verifyStoreDomainAction(domainId: unknown) {
  if (!isId(domainId)) return badRequest;
  return asCurrentStoreManager("verifyStoreDomain", "domain-management", (viewer) =>
    verifyStoreDomain(getDb(), viewer.store.id, viewer.user.id, domainId),
  );
}

export async function setPrimaryStoreDomainAction(domainId: unknown) {
  if (!isId(domainId)) return badRequest;
  return asCurrentStoreManager("setPrimaryStoreDomain", "domain-management", (viewer) =>
    setPrimaryStoreDomain(getDb(), viewer.store.id, viewer.user.id, domainId),
  );
}

export async function disableStoreDomainAction(domainId: unknown) {
  if (!isId(domainId)) return badRequest;
  return asCurrentStoreManager("disableStoreDomain", "domain-management", (viewer) =>
    disableStoreDomain(getDb(), viewer.store.id, viewer.user.id, domainId),
  );
}

import "server-only";

// ---------------------------------------------------------------
// Who may call each exported Server Action in app/admin/actions.ts.
// tests/db/auth-actions.test.ts calls EVERY exported action signed out,
// as a non-owner and as the platform owner, and fails if an action is
// missing here — so a new action can't ship without a rule.
//
// Store owners manage their own store's products, categories, orders,
// messages, delivery and payment settings; store lifecycle, status, slug
// and ownership stay platform-only.
// ---------------------------------------------------------------

/**
 * "platform-owner": only the platform owner, on ADMIN_HOST (store
 * lifecycle, status, slug and ownership). "store-owner": inside one
 * store — the platform owner on ADMIN_HOST or that store's OWNER on its
 * own host, never while the store is suspended (requireStoreAccess).
 * "store-owner-context": an OWNER or permitted MANAGER on their own store
 * host, never a platform owner acting as another store.
 */
export type ActionPermission = "platform-owner" | "store-owner" | "store-owner-context" | "admin-viewer";

export const ACTION_PERMISSIONS = {
  createStoreAction: "platform-owner",
  updateStoreAction: "platform-owner",
  // OWNER on their own store's admin host only (the platform owner edits
  // store settings through updateStoreAction instead).
  updateOwnStoreSettingsAction: "store-owner-context",
  startStripeConnectAction: "store-owner-context",
  updateStoreMemberRoleAction: "store-owner-context",
  revokeStoreMemberAction: "store-owner-context",
  createStoreInvitationAction: "store-owner-context",
  revokeStoreInvitationAction: "store-owner-context",
  addStoreDomainAction: "store-owner-context",
  verifyStoreDomainAction: "store-owner-context",
  setPrimaryStoreDomainAction: "store-owner-context",
  disableStoreDomainAction: "store-owner-context",
  setStoreOwnerAction: "platform-owner",
  updateStoreDesignAction: "store-owner",
  setStoreDemoAction: "platform-owner",
  setStoreWorkServiceCategoryAction: "platform-owner",
  setStoreWorkOrderAction: "platform-owner",
  provisionTemplateDemoStoresAction: "platform-owner",
  // Agency settings: the public agency website's profile (platform data).
  updateAgencySettingsAction: "platform-owner",
  setStoreStatusAction: "platform-owner",
  archiveStoreAction: "platform-owner",
  restoreStoreAction: "platform-owner",
  updateMyAccountAction: "admin-viewer",
  createProductAction: "store-owner",
  updateProductAction: "store-owner",
  deleteProductAction: "store-owner",
  createCategoryAction: "store-owner",
  updateCategoryAction: "store-owner",
  moveCategoryAction: "store-owner",
  deleteCategoryAction: "store-owner",
  setOrderStatusAction: "store-owner",
  cancelOrderAction: "store-owner",
  setOrderPaymentAction: "store-owner",
  recordStripeRefundAction: "store-owner",
  setInquiryStatusAction: "store-owner",
} as const satisfies Record<string, ActionPermission>;

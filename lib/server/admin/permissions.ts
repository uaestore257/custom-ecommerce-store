import "server-only";

// ---------------------------------------------------------------
// Who may call each exported Server Action in app/admin/actions.ts.
// tests/db/auth-actions.test.ts calls EVERY exported action signed out,
// as a non-owner and as the platform owner, and fails if an action is
// missing here — so a new action can't ship without a rule.
//
// Phase 2a: everything is platform-owner only. Phase 2b adds
// "store-owner" for products, categories and the owner-editable
// store settings, while store lifecycle and ownership stay platform-only.
// ---------------------------------------------------------------

export type ActionPermission = "platform-owner";

export const ACTION_PERMISSIONS = {
  createStoreAction: "platform-owner",
  updateStoreAction: "platform-owner",
  setStoreOwnerAction: "platform-owner",
  setStoreStatusAction: "platform-owner",
  archiveStoreAction: "platform-owner",
  restoreStoreAction: "platform-owner",
  createProductAction: "platform-owner",
  updateProductAction: "platform-owner",
  deleteProductAction: "platform-owner",
  createCategoryAction: "platform-owner",
  updateCategoryAction: "platform-owner",
  moveCategoryAction: "platform-owner",
  deleteCategoryAction: "platform-owner",
  setOrderStatusAction: "platform-owner",
  cancelOrderAction: "platform-owner",
  setOrderPaymentAction: "platform-owner",
} as const satisfies Record<string, ActionPermission>;

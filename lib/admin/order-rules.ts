import type { DbOrderStatus, DbPaymentStatus } from "./types";

// ---------------------------------------------------------------
// ORDER RULES (shared by the admin UI and the server)
// The server (lib/server/admin/orders.ts) enforces these; the admin UI
// only uses them to decide which buttons to show.
//
//   Pending -> Processing -> Shipped -> Delivered   (forward only, no skipping)
//   Pending / Processing -> Cancelled               (only while unpaid)
//   Delivered and Cancelled are final.
//
// Payment can be marked paid or unpaid on any order that isn't
// cancelled, and only for payment methods staff settle by hand.
// ---------------------------------------------------------------

export const ORDER_STATUS_VALUES: readonly DbOrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
export const PAYMENT_STATUS_VALUES: readonly DbPaymentStatus[] = ["UNPAID", "PAID"];

const NEXT_STATUS: Record<DbOrderStatus, DbOrderStatus | null> = {
  PENDING: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

/** Payment methods whose payment staff confirm by hand (no provider involved). */
export const MANUAL_PAYMENT_METHODS: readonly string[] = ["cash_on_delivery", "bank_transfer"];

export function isOrderStatus(value: unknown): value is DbOrderStatus {
  return typeof value === "string" && ORDER_STATUS_VALUES.includes(value as DbOrderStatus);
}

export function isPaymentStatus(value: unknown): value is DbPaymentStatus {
  return typeof value === "string" && PAYMENT_STATUS_VALUES.includes(value as DbPaymentStatus);
}

/** The one status an order can move forward to, or null if it can't move. */
export function nextOrderStatus(status: DbOrderStatus): DbOrderStatus | null {
  return NEXT_STATUS[status];
}

/** Why an order can't be cancelled, or null if it can. */
export function cancelProblem(status: DbOrderStatus, paymentStatus: DbPaymentStatus): string | null {
  if (status === "CANCELLED") return "This order is already cancelled.";
  if (status !== "PENDING" && status !== "PROCESSING") return "Only pending or processing orders can be cancelled.";
  if (paymentStatus === "PAID") return "This order is marked as paid. Refund the customer, mark it unpaid, then cancel it.";
  return null;
}

/** Why the payment status can't be changed, or null if it can. */
export function paymentProblem(status: DbOrderStatus, paymentMethod: string): string | null {
  if (status === "CANCELLED") return "A cancelled order's payment can't be changed.";
  if (!MANUAL_PAYMENT_METHODS.includes(paymentMethod)) return "This payment method's status can't be changed here.";
  return null;
}

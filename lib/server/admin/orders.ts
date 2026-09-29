import "server-only";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { cancelProblem, isOrderStatus, isPaymentStatus, nextOrderStatus, paymentProblem } from "@/lib/admin/order-rules";
import type { AdminOrderDetail, AdminOrderSummary, DbOrderStatus, DbPaymentStatus } from "@/lib/admin/types";
import { formatMinorUnits } from "@/lib/money";
import { storeFormatLocale } from "@/lib/standards";
import { recordAudit } from "../audit";
import type { StoreActor } from "../auth/guards";
import { fail, NOT_FOUND, ok, type Client } from "./common";

// ---------------------------------------------------------------
// ORDERS (admin) — always inside ONE store.
// The storeId comes from the route; an order of another store is "not
// found". Callers must already have passed requireStorePage(storeId) (reads) or
// requireStoreAccess(storeId, "write") (changes, which take its actor).
//
// Every change names the state the admin saw ("from"). The database only
// applies it while the order is still in that state (a conditional
// update), so a stale page or two admins clicking at once can never apply
// a change twice — in particular, a cancellation returns stock only once.
// The change and its audit event are written in one transaction.
// ---------------------------------------------------------------

const MAX_ROWS = 200;

const CHANGED = "This order was changed in the meantime. Reload the page to see its current status.";
const NOT_ALLOWED = "This status change isn't allowed.";

const storeSelect = { id: true, orderNumberPrefix: true, defaultLanguage: true, countryCode: true, formatLocale: true } as const;

function findStore(client: Client, storeId: string) {
  return client.store.findFirst({ where: { id: storeId, archivedAt: null }, select: storeSelect });
}

type StoreRow = NonNullable<Awaited<ReturnType<typeof findStore>>>;

interface OrderRow {
  id: string;
  number: number;
  placedAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  totalMinor: bigint;
  currency: string;
  currencyRef: { minorUnits: number };
  paymentMethod: string | null;
  paymentStatus: DbPaymentStatus;
  status: DbOrderStatus;
  isDemo: boolean;
  items: { quantity: number }[];
}

function toSummary(order: OrderRow, store: StoreRow, locale: string): AdminOrderSummary {
  return {
    id: order.id,
    number: store.orderNumberPrefix ? `${store.orderNumberPrefix}-${order.number}` : String(order.number),
    placedAt: order.placedAt.toISOString(),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone ?? "",
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    totalDisplay: formatMinorUnits(order.totalMinor, order.currency, order.currencyRef.minorUnits, locale),
    paymentMethod: order.paymentMethod ?? "",
    paymentStatus: order.paymentStatus,
    status: order.status,
    isSample: order.isDemo,
  };
}

/** Orders of the store, newest first, or null if the store is missing/archived. */
export async function listAdminOrders(client: Client, storeId: string): Promise<AdminOrderSummary[] | null> {
  const store = await findStore(client, storeId);
  if (!store) return null;
  const locale = storeFormatLocale(store);

  const orders = await client.order.findMany({
    where: { storeId: store.id },
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
    take: MAX_ROWS,
    include: {
      currencyRef: { select: { minorUnits: true } },
      items: { select: { quantity: true } },
    },
  });
  return orders.map((order) => toSummary(order, store, locale));
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** One order of the store, or null if the store or the order isn't found there. */
export async function getAdminOrder(client: Client, storeId: string, orderId: string): Promise<AdminOrderDetail | null> {
  const store = await findStore(client, storeId);
  if (!store) return null;
  const order = await client.order.findFirst({
    where: { id: orderId, storeId: store.id },
    include: {
      currencyRef: { select: { minorUnits: true } },
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!order) return null;

  const locale = storeFormatLocale(store);
  const money = (minor: bigint) => formatMinorUnits(minor, order.currency, order.currencyRef.minorUnits, locale);
  const address = (order.shippingAddress ?? {}) as Record<string, unknown>;
  return {
    ...toSummary(order, store, locale),
    address: {
      recipientName: text(address.recipientName),
      line1: text(address.line1),
      city: text(address.city),
      region: text(address.region),
      countryCode: text(address.countryCode),
    },
    items: order.items.map((item) => ({
      id: item.id,
      name: item.productName,
      variantTitle: item.variantTitle ?? "",
      sku: item.sku,
      quantity: item.quantity,
      unitPriceDisplay: money(item.unitPriceMinor),
      lineTotalDisplay: money(item.lineTotalMinor),
    })),
    subtotalDisplay: money(order.subtotalMinor),
    shippingDisplay: money(order.shippingMinor),
    taxDisplay: money(order.taxMinor),
    discountDisplay: order.discountMinor > BigInt(0) ? money(order.discountMinor) : "",
  };
}

// ---------------- Changes ----------------

/** The order as it is now, or an error message if the store or order isn't found. */
async function currentOrder(tx: Prisma.TransactionClient, storeId: string, orderId: string) {
  const store = await tx.store.findFirst({ where: { id: storeId, archivedAt: null }, select: { id: true } });
  if (!store) return { found: false, error: NOT_FOUND.store } as const;
  const order = await tx.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true, status: true, paymentStatus: true, paymentMethod: true, isDemo: true },
  });
  if (!order) return { found: false, error: NOT_FOUND.order } as const;
  return { found: true, order } as const;
}

/** Moves an order one step forward: Pending → Processing → Shipped → Delivered. */
export async function setAdminOrderStatus(
  actor: StoreActor,
  client: PrismaClient,
  storeId: string,
  orderId: string,
  from: unknown,
  to: unknown,
) {
  if (!isOrderStatus(from) || !isOrderStatus(to) || nextOrderStatus(from) !== to) return fail(NOT_ALLOWED);
  return client.$transaction(async (tx) => {
    const current = await currentOrder(tx, storeId, orderId);
    if (!current.found) return fail(current.error);
    if (current.order.status !== from) return fail(CHANGED);

    const updated = await tx.order.updateMany({ where: { id: orderId, storeId, status: from }, data: { status: to } });
    if (updated.count !== 1) return fail(CHANGED);
    await recordAudit(tx, {
      action: "order.status_change",
      actorUserId: actor.userId,
      storeId,
      targetType: "order",
      targetId: orderId,
      metadata: { from, to },
    });
    return ok({ id: orderId }, "Order status updated.");
  });
}

/**
 * Cancels a pending or processing, unpaid order and returns its stock.
 * Seeded sample orders never reduced stock, so none is returned for them.
 */
export async function cancelAdminOrder(actor: StoreActor, client: PrismaClient, storeId: string, orderId: string, from: unknown) {
  if (!isOrderStatus(from)) return fail(NOT_ALLOWED);
  return client.$transaction(async (tx) => {
    const current = await currentOrder(tx, storeId, orderId);
    if (!current.found) return fail(current.error);
    const { order } = current;
    if (order.status !== from) return fail(CHANGED);
    const problem = cancelProblem(order.status, order.paymentStatus);
    if (problem) return fail(problem);

    // Only one cancellation can pass this: a second one (or a payment
    // change in between) no longer matches, so stock is never returned twice.
    const updated = await tx.order.updateMany({
      where: { id: orderId, storeId, status: from, paymentStatus: "UNPAID" },
      data: { status: "CANCELLED" },
    });
    if (updated.count !== 1) return fail(CHANGED);

    const restock = !order.isDemo;
    if (restock) {
      const items = await tx.orderItem.findMany({ where: { orderId, storeId }, select: { variantId: true, quantity: true } });
      const quantities = new Map<string, number>();
      for (const item of items) {
        if (item.variantId) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
      }
      // Variant id order, the same order checkout locks them in.
      for (const variantId of [...quantities.keys()].sort()) {
        await tx.productVariant.updateMany({
          where: { id: variantId, storeId },
          data: { stock: { increment: quantities.get(variantId)! } },
        });
      }
    }
    await recordAudit(tx, {
      action: "order.cancel",
      actorUserId: actor.userId,
      storeId,
      targetType: "order",
      targetId: orderId,
      metadata: { from, to: "CANCELLED", stockReturned: restock },
    });
    return ok(
      { id: orderId },
      restock ? "Order cancelled. Its items were added back to stock." : "Sample order cancelled. Sample orders never reduced stock, so none was added back.",
    );
  });
}

/** Marks a cash on delivery or bank transfer order as paid or unpaid. */
export async function setAdminOrderPayment(
  actor: StoreActor,
  client: PrismaClient,
  storeId: string,
  orderId: string,
  from: unknown,
  to: unknown,
) {
  if (!isPaymentStatus(from) || !isPaymentStatus(to) || from === to) return fail("Choose a valid payment status.");
  return client.$transaction(async (tx) => {
    const current = await currentOrder(tx, storeId, orderId);
    if (!current.found) return fail(current.error);
    const { order } = current;
    if (order.paymentStatus !== from) return fail(CHANGED);
    const problem = paymentProblem(order.status, order.paymentMethod ?? "");
    if (problem) return fail(problem);

    const updated = await tx.order.updateMany({
      where: { id: orderId, storeId, paymentStatus: from, status: { not: "CANCELLED" } },
      data: { paymentStatus: to },
    });
    if (updated.count !== 1) return fail(CHANGED);
    await recordAudit(tx, {
      action: "order.payment_change",
      actorUserId: actor.userId,
      storeId,
      targetType: "order",
      targetId: orderId,
      metadata: { from, to },
    });
    return ok({ id: orderId }, to === "PAID" ? "Order marked as paid." : "Order marked as unpaid.");
  });
}

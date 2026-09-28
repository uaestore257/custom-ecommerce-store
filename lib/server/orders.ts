import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import {
  CHECKOUT_PAYMENT_METHODS,
  validateCheckout,
  type CheckoutPaymentMethod,
  type CleanCheckout,
  type PlacedOrder,
  type PlaceOrderResult,
} from "@/lib/checkout";
import { withinRateLimit } from "./rate-limit";
import { storeScope } from "./store-scope";

// ---------------------------------------------------------------
// ORDER PLACEMENT (public storefront — cash on delivery and bank transfer)
//
// Nothing the browser sends about money, stock or ownership is trusted:
// prices, delivery and totals are recalculated here from the database in
// the store's currency (minor units); the browser's total is only compared
// (a difference refuses the order). The store is resolved by the caller
// on the server; the browser's storeId is only compared with it.
//
// Correctness under concurrency (PostgreSQL, READ COMMITTED):
//   * Everything that writes happens in ONE transaction: stock decrements,
//     customer, order number and the order with its items. Any failure —
//     including "not enough stock" on a later line — rolls all of it back.
//   * The transaction first locks the store row (SELECT … FOR UPDATE), so
//     orders for one store are placed one at a time. That makes the
//     idempotency re-check, customer creation and order numbering race-free,
//     and means no deadlocks between orders (all take the same first lock).
//   * Stock is reduced with a conditional update (stock >= quantity); the
//     database's own "stock >= 0" CHECK is a second safety net. Two buyers
//     of the last unit: exactly one succeeds.
//   * Duplicates: a repeated submission with the same idempotency key
//     returns the first order (only if the request is identical) — checked
//     before and again inside the lock; the unique (storeId, idempotencyKey)
//     index is the final backstop.
// Adding to the cart never reserves stock; only a placed order reduces it.
// ---------------------------------------------------------------

const IP_RATE_LIMIT = { max: 10, windowMs: 10 * 60 * 1000 }; // per store, per IP
const SHARED_RATE_LIMIT = { max: 40, windowMs: 10 * 60 * 1000 }; // per store, visitors with no known IP

const TX_OPTIONS = { timeout: 10_000, maxWait: 5_000 } as const;

export const ORDER_MESSAGES = {
  tooMany: "Too many orders were placed recently. Please try again in a few minutes.",
  storeUnavailable: "This store isn't accepting orders right now.",
  otherStore: "Your cart is from a different store. Please review your cart and try again.",
  noDelivery: "This store hasn't set up delivery yet, so orders can't be placed.",
  paymentUnavailable: "This payment method isn't available for this store.",
  unavailable: "Some items in your cart are no longer available. Please review your cart.",
  stock: "There isn't enough stock for some items in your cart. Please review your cart.",
  priceChanged: "Prices or delivery changed since you opened checkout. Please review your cart and try again.",
  keyReused: "This checkout was already submitted with different details. Please review your order and try again.",
  invalid: "Please fix the highlighted fields.",
  busy: "The store is busy right now. Please try again in a moment.",
} as const;

class OrderRefused extends Error {
  constructor(readonly userMessage: string) {
    super(userMessage);
  }
}

/**
 * Tests only (never passed by the Server Action): runs inside the
 * transaction after EVERYTHING was written — stock, customer, order number,
 * order and items — so a test can prove a late failure rolls all of it back.
 */
export interface PlaceOrderTestHooks {
  beforeCommit?: () => Promise<void>;
}

/** Identifies what was ordered, so a reused idempotency key with a different request is refused. */
export function requestFingerprint(values: CleanCheckout): string {
  const canonical = JSON.stringify({
    storeId: values.storeId,
    items: values.items,
    customer: values.customer,
    address: values.address,
    paymentMethod: values.paymentMethod,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/** A refusal: nothing was saved, and the next attempt must use a new idempotency key. */
function refuse(error: string): PlaceOrderResult {
  return { ok: false, error, retrySameKey: false };
}

const orderInclude = {
  items: { orderBy: { id: "asc" } },
  store: { select: { orderNumberPrefix: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toPlacedOrder(order: OrderRow): PlacedOrder {
  const address = (order.shippingAddress ?? {}) as { line1?: unknown; city?: unknown };
  const prefix = order.store.orderNumberPrefix;
  return {
    orderNumber: prefix ? `${prefix}-${order.number}` : String(order.number),
    status: "PENDING",
    paymentStatus: "UNPAID",
    paymentMethod: order.paymentMethod as CheckoutPaymentMethod,
    currency: order.currency,
    lines: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      lineTotalMinor: item.lineTotalMinor.toString(),
    })),
    subtotalMinor: order.subtotalMinor.toString(),
    shippingMinor: order.shippingMinor.toString(),
    totalMinor: order.totalMinor.toString(),
    deliveryTo: [address.line1, address.city].filter((part) => typeof part === "string" && part).join(", "),
  };
}

/** The earlier order for this key, or a refusal if the key was used for a different request. */
async function existingForKey(
  client: PrismaClient | Prisma.TransactionClient,
  storeId: string,
  key: string,
  fingerprint: string,
): Promise<PlaceOrderResult | null> {
  const existing = await client.order.findUnique({
    where: { storeId_idempotencyKey: { storeId, idempotencyKey: key } },
    include: orderInclude,
  });
  if (!existing) return null;
  if (existing.requestFingerprint !== fingerprint) return refuse(ORDER_MESSAGES.keyReused);
  return { ok: true, order: toPlacedOrder(existing), duplicate: true };
}

/**
 * Places a real order in `storeId`, which the CALLER resolved on the
 * server (never taken from the request).
 */
export async function placeOrder(
  client: PrismaClient,
  storeId: string,
  input: unknown,
  context: { ipAddress: string | null },
  testHooks: PlaceOrderTestHooks = {},
): Promise<PlaceOrderResult> {
  // 1. Rate limit before any other lookup, whatever the request contains.
  const boundedStoreId = storeId.slice(0, 64);
  const [key, limit] = context.ipAddress
    ? [`order:${boundedStoreId}:${context.ipAddress}`, IP_RATE_LIMIT]
    : [`order:${boundedStoreId}:shared`, SHARED_RATE_LIMIT];
  if (!(await withinRateLimit(client, key, limit))) return refuse(ORDER_MESSAGES.tooMany);

  // 2. The store decides the phone and address rules.
  const publicStore = await client.store.findFirst({
    where: { id: storeId, status: "ACTIVE", archivedAt: null },
    select: { id: true, countryCode: true },
  });
  if (!publicStore) return refuse(ORDER_MESSAGES.storeUnavailable);

  // 3. Validate what the browser sent.
  const validation = validateCheckout(input, publicStore.countryCode);
  if (!validation.ok) {
    return validation.requestError
      ? refuse(validation.requestError)
      : { ok: false, error: ORDER_MESSAGES.invalid, fieldErrors: validation.errors, retrySameKey: false };
  }
  const values = validation.values;
  if (values.storeId !== publicStore.id) return refuse(ORDER_MESSAGES.otherStore);
  const fingerprint = requestFingerprint(values);

  // 4. A repeated submission returns the first order (fast path, no lock).
  const earlier = await existingForKey(client, publicStore.id, values.idempotencyKey, fingerprint);
  if (earlier) return earlier;

  try {
    const outcome = await client.$transaction(async (tx) => {
      // Lock the store row: orders for this store are placed one at a time.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Store"
        WHERE "id" = ${publicStore.id} AND "status" = 'ACTIVE' AND "archivedAt" IS NULL
        FOR UPDATE`;
      if (locked.length === 0) throw new OrderRefused(ORDER_MESSAGES.storeUnavailable);

      // Re-check inside the lock: a concurrent duplicate may have just committed.
      const duplicate = await existingForKey(tx, publicStore.id, values.idempotencyKey, fingerprint);
      if (duplicate) return duplicate;

      const store = await tx.store.findUniqueOrThrow({
        where: { id: publicStore.id },
        include: {
          paymentMethods: { where: { enabled: true } },
          shippingZones: {
            orderBy: { id: "asc" },
            take: 1,
            include: { rates: { where: { active: true }, orderBy: { id: "asc" }, take: 1 } },
          },
        },
      });

      const allowed = (CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(values.paymentMethod);
      if (!allowed || !store.paymentMethods.some((m) => m.method === values.paymentMethod)) {
        throw new OrderRefused(ORDER_MESSAGES.paymentUnavailable);
      }
      const rate = store.shippingZones[0]?.rates[0];
      if (!rate) throw new OrderRefused(ORDER_MESSAGES.noDelivery);

      // Current products: ACTIVE, of THIS store, with their default variant.
      const products = await tx.product.findMany({
        where: { id: { in: values.items.map((i) => i.productId) }, storeId: store.id, status: "ACTIVE" },
        include: {
          translations: { where: { locale: store.defaultLanguage } },
          variants: { where: { isDefault: true, currency: store.baseCurrency }, take: 1 },
        },
      });
      const lines = values.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const variant = product?.variants[0];
        if (!product || !variant) throw new OrderRefused(ORDER_MESSAGES.unavailable);
        return { item, product, variant, lineTotalMinor: variant.priceMinor * BigInt(item.quantity) };
      });

      // Totals from database values only.
      const subtotalMinor = lines.reduce((sum, l) => sum + l.lineTotalMinor, BigInt(0));
      const shippingMinor =
        rate.freeOverMinor !== null && subtotalMinor >= rate.freeOverMinor ? BigInt(0) : rate.priceMinor;
      const totalMinor = subtotalMinor + shippingMinor;
      if (totalMinor !== values.expectedTotalMinor) throw new OrderRefused(ORDER_MESSAGES.priceChanged);

      // Reduce stock, only where enough is left (variant id order).
      for (const line of [...lines].sort((a, b) => (a.variant.id < b.variant.id ? -1 : 1))) {
        const updated = await tx.productVariant.updateMany({
          where: { id: line.variant.id, storeId: store.id, stock: { gte: line.item.quantity } },
          data: { stock: { decrement: line.item.quantity } },
        });
        if (updated.count !== 1) throw new OrderRefused(ORDER_MESSAGES.stock);
      }

      // Customer: created once per store and email; existing details are
      // never overwritten from a public form (the order keeps its own copy).
      const customer =
        (await tx.customer.findUnique({
          where: { storeId_email: { storeId: store.id, email: values.customer.email } },
          select: { id: true },
        })) ??
        (await tx.customer.create({
          data: {
            storeId: store.id,
            email: values.customer.email,
            name: values.customer.name,
            phone: values.customer.phone,
            preferredLocale: store.defaultLanguage,
          },
          select: { id: true },
        }));

      const { number } = await storeScope(tx, store.id).allocateOrderNumber(tx);
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          number,
          customerId: customer.id,
          status: "PENDING",
          paymentMethod: values.paymentMethod,
          paymentStatus: "UNPAID",
          currency: store.baseCurrency,
          locale: store.defaultLanguage,
          pricesIncludeTax: store.pricesIncludeTax,
          subtotalMinor,
          shippingMinor,
          taxMinor: BigInt(0),
          discountMinor: BigInt(0),
          totalMinor,
          customerName: values.customer.name,
          customerEmail: values.customer.email,
          customerPhone: values.customer.phone,
          shippingAddress: {
            recipientName: values.customer.name,
            line1: values.address.line1,
            city: values.address.city,
            region: values.address.region,
            countryCode: store.countryCode,
            phone: values.customer.phone,
          },
          idempotencyKey: values.idempotencyKey,
          requestFingerprint: fingerprint,
          isDemo: false,
        },
        select: { id: true },
      });
      await tx.orderItem.createMany({
        data: lines.map((l) => ({
          storeId: store.id,
          orderId: order.id,
          currency: store.baseCurrency,
          variantId: l.variant.id,
          productName: l.product.translations[0]?.name ?? l.variant.sku,
          variantTitle: l.variant.title,
          sku: l.variant.sku,
          unitPriceMinor: l.variant.priceMinor,
          quantity: l.item.quantity,
          taxMinor: BigInt(0),
          lineTotalMinor: l.lineTotalMinor,
        })),
      });
      const created = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
      await testHooks.beforeCommit?.();
      return { ok: true, order: toPlacedOrder(created), duplicate: false } satisfies PlaceOrderResult;
    }, TX_OPTIONS);
    return outcome;
  } catch (error) {
    if (error instanceof OrderRefused) return refuse(error.userMessage);
    // Final backstop: a duplicate that slipped past both checks.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const earlierOrder = await existingForKey(client, publicStore.id, values.idempotencyKey, fingerprint);
      if (earlierOrder) return earlierOrder;
    }
    // Lock wait / transaction timeout: nothing was saved; retrying with the same key is safe.
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2028" || error.code === "P2034")) {
      return { ok: false, error: ORDER_MESSAGES.busy, retrySameKey: true };
    }
    throw error;
  }
}

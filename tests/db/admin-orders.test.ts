// Admin order management (lib/server/admin/orders.ts): the order page,
// status changes, cancellation with stock return, and payment status.
// Every store here is created fresh, so nothing depends on seeded data.
// Permission checks for the matching Server Actions are in
// auth-actions.test.ts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { listAdminCategories } from "../../lib/server/admin/categories";
import {
  cancelAdminOrder,
  getAdminOrder,
  listAdminOrders,
  setAdminOrderPayment,
  setAdminOrderStatus,
} from "../../lib/server/admin/orders";
import { createAdminProduct } from "../../lib/server/admin/products";
import { archiveAdminStore, createAdminStore } from "../../lib/server/admin/stores";
import { placeOrder } from "../../lib/server/orders";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

let owner: Awaited<ReturnType<typeof testActor>>;
before(async () => {
  owner = await testActor(db);
});

const CHANGED = /changed in the meantime/i;

async function makeStore() {
  const result = await createAdminStore(owner, db, {
    name: `Admin orders ${uid()}`,
    slug: `admin-orders-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });
  assert.ok(result.ok, JSON.stringify(result));
  const storeId = result.data.id;
  const zone = await db.shippingZone.create({ data: { storeId, name: "Domestic" } });
  await db.shippingRate.create({
    data: { storeId, zoneId: zone.id, name: "Standard", currency: "AED", priceMinor: BigInt(2500), freeOverMinor: null },
  });
  await db.storePaymentMethod.update({ where: { storeId_method: { storeId, method: "bank_transfer" } }, data: { enabled: true } });
  return storeId;
}

async function makeProduct(storeId: string, stock = "5") {
  const categoryId = (await listAdminCategories(db, storeId))![0].id;
  const result = await createAdminProduct(db, storeId, {
    name: `Sofa ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "A comfortable sofa for testing orders.",
    price: "100.00",
    compareAtPrice: "",
    imageUrl: "",
    stock,
    status: "ACTIVE",
    featured: false,
  });
  assert.ok(result.ok, JSON.stringify(result));
  const variant = await db.productVariant.findFirstOrThrow({ where: { productId: result.data.id, isDefault: true } });
  return { id: result.data.id, variantId: variant.id };
}

/** Places a real order through checkout: 2 × A and 1 × B at 100.00 each, plus 25.00 delivery. */
async function placeTestOrder(storeId: string, a: { id: string }, b: { id: string }, paymentMethod = "cash_on_delivery") {
  const result = await placeOrder(
    db,
    storeId,
    {
      storeId,
      idempotencyKey: randomUUID(),
      expectedTotalMinor: "32500",
      items: [{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 1 }],
      name: "Jane Visitor",
      email: `jane-${uid()}@example.com`,
      phone: "050 123 4567",
      address: "Villa 12, Example Street",
      city: "Dubai",
      paymentMethod,
    },
    { ipAddress: `10.9.${uid()}` },
  );
  assert.ok(result.ok, JSON.stringify(result));
  return (await db.order.findFirstOrThrow({ where: { storeId }, orderBy: { createdAt: "desc" } })).id;
}

async function setup() {
  const store = await makeStore();
  const a = await makeProduct(store);
  const b = await makeProduct(store);
  const order = await placeTestOrder(store, a, b);
  return { store, a, b, order };
}

const stockOf = async (variantId: string) => (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
const orderRow = (id: string) => db.order.findUniqueOrThrow({ where: { id } });
const auditFor = (orderId: string) => db.auditEvent.findMany({ where: { targetType: "order", targetId: orderId }, orderBy: { createdAt: "asc" } });

/** Everything a refused change could have touched. */
async function snapshot(orderId: string, variantIds: string[]) {
  const order = await orderRow(orderId);
  return JSON.stringify({
    status: order.status,
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt,
    stock: await Promise.all(variantIds.map(stockOf)),
    audit: (await auditFor(orderId)).length,
  });
}

// ---------- The order page ----------

test("the order page shows the order's items, totals, address and payment, in the order's currency", async () => {
  const { store, order } = await setup();
  const detail = await getAdminOrder(db, store, order);
  assert.ok(detail);
  assert.equal(detail.status, "PENDING");
  assert.equal(detail.paymentStatus, "UNPAID");
  assert.equal(detail.paymentMethod, "cash_on_delivery");
  assert.equal(detail.isSample, false);
  assert.equal(detail.items.length, 2);
  assert.deepEqual(detail.items.map((i) => i.quantity).sort(), [1, 2]);
  assert.equal(detail.itemCount, 3);
  assert.match(detail.totalDisplay, /325\.00/);
  assert.match(detail.shippingDisplay, /25\.00/);
  assert.equal(detail.discountDisplay, "");
  assert.equal(detail.address.line1, "Villa 12, Example Street");
  assert.equal(detail.address.city, "Dubai");
  assert.equal(detail.address.countryCode, "AE");
});

test("an order of another store, a missing order, or an archived store is not found", async () => {
  const one = await setup();
  const other = await makeStore();
  assert.equal(await getAdminOrder(db, other, one.order), null);
  assert.equal(await getAdminOrder(db, one.store, `missing-${uid()}`), null);

  const before = await snapshot(one.order, [one.a.variantId, one.b.variantId]);
  for (const result of [
    await setAdminOrderStatus(owner, db, other, one.order, "PENDING", "PROCESSING"),
    await cancelAdminOrder(owner, db, other, one.order, "PENDING"),
    await setAdminOrderPayment(owner, db, other, one.order, "UNPAID", "PAID"),
  ]) {
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /not found in this store/i);
  }
  assert.equal(await snapshot(one.order, [one.a.variantId, one.b.variantId]), before, "the other store's order is untouched");

  assert.ok((await archiveAdminStore(owner, db, one.store)).ok);
  assert.equal(await getAdminOrder(db, one.store, one.order), null);
  assert.equal(await listAdminOrders(db, one.store), null);
  const archived = await setAdminOrderStatus(owner, db, one.store, one.order, "PENDING", "PROCESSING");
  assert.equal(archived.ok, false);
  assert.equal(await snapshot(one.order, [one.a.variantId, one.b.variantId]), before);
});

// ---------- Status ----------

test("an order moves Pending → Processing → Shipped → Delivered, each change audited", async () => {
  const { store, a, b, order } = await setup();
  const stock = [await stockOf(a.variantId), await stockOf(b.variantId)];
  for (const [from, to] of [["PENDING", "PROCESSING"], ["PROCESSING", "SHIPPED"], ["SHIPPED", "DELIVERED"]] as const) {
    const result = await setAdminOrderStatus(owner, db, store, order, from, to);
    assert.ok(result.ok, `${from} -> ${to}: ${JSON.stringify(result)}`);
    assert.equal((await orderRow(order)).status, to);
  }
  const events = await auditFor(order);
  assert.deepEqual(events.map((e) => e.action), ["order.status_change", "order.status_change", "order.status_change"]);
  assert.deepEqual(events.map((e) => e.metadata), [
    { from: "PENDING", to: "PROCESSING" },
    { from: "PROCESSING", to: "SHIPPED" },
    { from: "SHIPPED", to: "DELIVERED" },
  ]);
  assert.ok(events.every((e) => e.actorUserId === owner.userId && e.storeId === store));
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], stock, "status changes never touch stock");
  assert.equal((await listAdminOrders(db, store))![0].status, "DELIVERED");

  // Delivered is final.
  for (const to of ["PENDING", "PROCESSING", "SHIPPED", "CANCELLED"]) {
    assert.equal((await setAdminOrderStatus(owner, db, store, order, "DELIVERED", to)).ok, false, to);
  }
  assert.equal((await cancelAdminOrder(owner, db, store, order, "DELIVERED")).ok, false);
  assert.equal((await orderRow(order)).status, "DELIVERED");
});

test("skipping a step, going backwards, cancelling through the status action, or unknown values are refused", async () => {
  const { store, a, b, order } = await setup();
  const before = await snapshot(order, [a.variantId, b.variantId]);
  for (const [from, to] of [
    ["PENDING", "SHIPPED"],
    ["PENDING", "DELIVERED"],
    ["PENDING", "PENDING"],
    ["PENDING", "CANCELLED"],
    ["PROCESSING", "PENDING"],
    ["pending", "processing"],
    ["PENDING", "REFUNDED"],
    [null, "PROCESSING"],
    ["PENDING", { status: "PROCESSING" }],
  ] as const) {
    const result = await setAdminOrderStatus(owner, db, store, order, from, to);
    assert.equal(result.ok, false, JSON.stringify([from, to]));
  }
  assert.equal((await cancelAdminOrder(owner, db, store, order, "pending")).ok, false);
  assert.equal(await snapshot(order, [a.variantId, b.variantId]), before, "nothing changed");
});

test("a change based on a stale page is refused and nothing changes", async () => {
  const { store, a, b, order } = await setup();
  assert.ok((await setAdminOrderStatus(owner, db, store, order, "PENDING", "PROCESSING")).ok);
  const before = await snapshot(order, [a.variantId, b.variantId]);

  // A second tab still showing "Pending":
  const again = await setAdminOrderStatus(owner, db, store, order, "PENDING", "PROCESSING");
  assert.equal(again.ok, false);
  if (!again.ok) assert.match(again.error, CHANGED);
  const staleCancel = await cancelAdminOrder(owner, db, store, order, "PENDING");
  assert.equal(staleCancel.ok, false);
  if (!staleCancel.ok) assert.match(staleCancel.error, CHANGED);
  assert.equal(await snapshot(order, [a.variantId, b.variantId]), before);
});

test("two admins moving the same order at once: exactly one change is applied", async () => {
  const { store, order } = await setup();
  const results = await Promise.all([
    setAdminOrderStatus(owner, db, store, order, "PENDING", "PROCESSING"),
    setAdminOrderStatus(owner, db, store, order, "PENDING", "PROCESSING"),
    setAdminOrderStatus(owner, db, store, order, "PENDING", "PROCESSING"),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results));
  assert.equal((await orderRow(order)).status, "PROCESSING");
  assert.equal((await auditFor(order)).length, 1, "one audit event for the one change");
});

// ---------- Cancelling ----------

test("cancelling a pending order returns exactly its items to stock", async () => {
  const { store, a, b, order } = await setup();
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], [3, 4], "checkout reduced stock");
  const result = await cancelAdminOrder(owner, db, store, order, "PENDING");
  assert.ok(result.ok, JSON.stringify(result));
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], [5, 5]);
  const row = await orderRow(order);
  assert.equal(row.status, "CANCELLED");
  assert.equal(row.paymentStatus, "UNPAID");
  const [event] = await auditFor(order);
  assert.equal(event.action, "order.cancel");
  assert.deepEqual(event.metadata, { from: "PENDING", to: "CANCELLED", stockReturned: true });
  assert.equal(event.actorUserId, owner.userId);
});

test("a processing order can be cancelled too; a shipped or delivered one can't", async () => {
  const one = await setup();
  assert.ok((await setAdminOrderStatus(owner, db, one.store, one.order, "PENDING", "PROCESSING")).ok);
  assert.ok((await cancelAdminOrder(owner, db, one.store, one.order, "PROCESSING")).ok);
  assert.deepEqual([await stockOf(one.a.variantId), await stockOf(one.b.variantId)], [5, 5]);

  const two = await setup();
  assert.ok((await setAdminOrderStatus(owner, db, two.store, two.order, "PENDING", "PROCESSING")).ok);
  assert.ok((await setAdminOrderStatus(owner, db, two.store, two.order, "PROCESSING", "SHIPPED")).ok);
  const before = await snapshot(two.order, [two.a.variantId, two.b.variantId]);
  const shipped = await cancelAdminOrder(owner, db, two.store, two.order, "SHIPPED");
  assert.equal(shipped.ok, false);
  if (!shipped.ok) assert.match(shipped.error, /only pending or processing/i);
  assert.equal(await snapshot(two.order, [two.a.variantId, two.b.variantId]), before);
});

test("a cancelled order is final: cancelling again never returns stock twice", async () => {
  const { store, a, b, order } = await setup();
  assert.ok((await cancelAdminOrder(owner, db, store, order, "PENDING")).ok);
  const before = await snapshot(order, [a.variantId, b.variantId]);
  assert.equal((await cancelAdminOrder(owner, db, store, order, "PENDING")).ok, false, "stale page");
  assert.equal((await cancelAdminOrder(owner, db, store, order, "CANCELLED")).ok, false, "already cancelled");
  assert.equal((await setAdminOrderStatus(owner, db, store, order, "CANCELLED", "PROCESSING")).ok, false, "can't reopen");
  assert.equal(await snapshot(order, [a.variantId, b.variantId]), before);
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], [5, 5]);
});

test("two cancellations at the same moment return stock exactly once", async () => {
  const { store, a, b, order } = await setup();
  const results = await Promise.all([
    cancelAdminOrder(owner, db, store, order, "PENDING"),
    cancelAdminOrder(owner, db, store, order, "PENDING"),
    cancelAdminOrder(owner, db, store, order, "PENDING"),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results));
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], [5, 5], "never more than was ordered");
  assert.equal((await auditFor(order)).filter((e) => e.action === "order.cancel").length, 1);
});

test("a paid order can't be cancelled until it is marked unpaid", async () => {
  const { store, a, b, order } = await setup();
  assert.ok((await setAdminOrderPayment(owner, db, store, order, "UNPAID", "PAID")).ok);
  const before = await snapshot(order, [a.variantId, b.variantId]);
  const refused = await cancelAdminOrder(owner, db, store, order, "PENDING");
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.error, /refund/i);
  assert.equal(await snapshot(order, [a.variantId, b.variantId]), before);

  assert.ok((await setAdminOrderPayment(owner, db, store, order, "PAID", "UNPAID")).ok);
  assert.ok((await cancelAdminOrder(owner, db, store, order, "PENDING")).ok);
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], [5, 5]);
});

test("marking paid and cancelling at the same moment: only one wins, and the result is consistent", async () => {
  const { store, a, b, order } = await setup();
  const [paid, cancelled] = await Promise.all([
    setAdminOrderPayment(owner, db, store, order, "UNPAID", "PAID"),
    cancelAdminOrder(owner, db, store, order, "PENDING"),
  ]);
  assert.equal(Number(paid.ok) + Number(cancelled.ok), 1, JSON.stringify({ paid, cancelled }));
  const row = await orderRow(order);
  const stock = [await stockOf(a.variantId), await stockOf(b.variantId)];
  if (cancelled.ok) {
    assert.deepEqual([row.status, row.paymentStatus, stock], ["CANCELLED", "UNPAID", [5, 5]]);
  } else {
    assert.deepEqual([row.status, row.paymentStatus, stock], ["PENDING", "PAID", [3, 4]]);
  }
});

test("cancelling a sample order adds no stock back (sample orders never reduced it)", async () => {
  const { store, a, b, order } = await setup();
  await db.order.update({ where: { id: order }, data: { isDemo: true } });
  const result = await cancelAdminOrder(owner, db, store, order, "PENDING");
  assert.ok(result.ok, JSON.stringify(result));
  if (result.ok) assert.match(result.message ?? "", /sample/i);
  assert.deepEqual([await stockOf(a.variantId), await stockOf(b.variantId)], [3, 4], "unchanged");
  const [event] = await auditFor(order);
  assert.deepEqual(event.metadata, { from: "PENDING", to: "CANCELLED", stockReturned: false });
});

test("cancelling only returns stock to this store's variants", async () => {
  const one = await setup();
  const two = await setup();
  const otherStock = [await stockOf(two.a.variantId), await stockOf(two.b.variantId)];
  assert.ok((await cancelAdminOrder(owner, db, one.store, one.order, "PENDING")).ok);
  assert.deepEqual([await stockOf(two.a.variantId), await stockOf(two.b.variantId)], otherStock);
  assert.equal((await orderRow(two.order)).status, "PENDING");
});

// ---------- Payment ----------

test("payment can be marked paid and back to unpaid, each change audited", async () => {
  const { store, order } = await setup();
  const paid = await setAdminOrderPayment(owner, db, store, order, "UNPAID", "PAID");
  assert.ok(paid.ok, JSON.stringify(paid));
  assert.equal((await orderRow(order)).paymentStatus, "PAID");
  assert.ok((await setAdminOrderStatus(owner, db, store, order, "PENDING", "PROCESSING")).ok, "status still moves when paid");
  const unpaid = await setAdminOrderPayment(owner, db, store, order, "PAID", "UNPAID");
  assert.ok(unpaid.ok, JSON.stringify(unpaid));
  assert.equal((await orderRow(order)).paymentStatus, "UNPAID");
  const payments = (await auditFor(order)).filter((e) => e.action === "order.payment_change");
  assert.deepEqual(payments.map((e) => e.metadata), [{ from: "UNPAID", to: "PAID" }, { from: "PAID", to: "UNPAID" }]);
});

test("bank transfer orders can be marked paid too", async () => {
  const store = await makeStore();
  const a = await makeProduct(store);
  const b = await makeProduct(store);
  const order = await placeTestOrder(store, a, b, "bank_transfer");
  assert.ok((await setAdminOrderPayment(owner, db, store, order, "UNPAID", "PAID")).ok);
  assert.equal((await orderRow(order)).paymentStatus, "PAID");
});

test("stale, same-value or unknown payment changes are refused", async () => {
  const { store, a, b, order } = await setup();
  const before = await snapshot(order, [a.variantId, b.variantId]);
  const stale = await setAdminOrderPayment(owner, db, store, order, "PAID", "UNPAID");
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.match(stale.error, CHANGED);
  for (const [from, to] of [["UNPAID", "UNPAID"], ["UNPAID", "REFUNDED"], ["unpaid", "paid"], [null, "PAID"]] as const) {
    assert.equal((await setAdminOrderPayment(owner, db, store, order, from, to)).ok, false, JSON.stringify([from, to]));
  }
  assert.equal(await snapshot(order, [a.variantId, b.variantId]), before);
});

test("a cancelled order's payment, or a non-manual payment method, can't be changed", async () => {
  const one = await setup();
  assert.ok((await cancelAdminOrder(owner, db, one.store, one.order, "PENDING")).ok);
  const cancelled = await setAdminOrderPayment(owner, db, one.store, one.order, "UNPAID", "PAID");
  assert.equal(cancelled.ok, false);
  if (!cancelled.ok) assert.match(cancelled.error, /cancelled/i);
  assert.equal((await orderRow(one.order)).paymentStatus, "UNPAID");

  const two = await setup();
  await db.order.update({ where: { id: two.order }, data: { paymentMethod: "online_card" } });
  const card = await setAdminOrderPayment(owner, db, two.store, two.order, "UNPAID", "PAID");
  assert.equal(card.ok, false);
  if (!card.ok) assert.match(card.error, /can't be changed here/i);
  assert.equal((await orderRow(two.order)).paymentStatus, "UNPAID");
});

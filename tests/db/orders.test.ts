// Server-validated order placement (lib/server/orders.ts) and the admin's
// read-only orders list (lib/server/admin/orders.ts). Every store here is
// created fresh, so nothing depends on seeded data.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { listAdminOrders } from "../../lib/server/admin/orders";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { createAdminProduct, deleteAdminProduct } from "../../lib/server/admin/products";
import { archiveAdminStore, createAdminStore, setAdminStoreStatus } from "../../lib/server/admin/stores";
import { ORDER_MESSAGES, placeOrder } from "../../lib/server/orders";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

interface StoreOptions {
  status?: "ACTIVE" | "DRAFT" | "PAUSED";
  country?: string;
  currency?: string;
  tz?: string;
  bankTransfer?: boolean;
}

async function makeStore(options: StoreOptions = {}) {
  const { status = "ACTIVE", country = "AE", currency = "AED", tz = "Asia/Dubai", bankTransfer = true } = options;
  const result = await createAdminStore(await testActor(db), db, {
    name: `Orders ${uid()}`,
    slug: `orders-${uid()}`,
    businessType: "furniture",
    status,
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "an orders test passphrase 2026",
    countryCode: country,
    baseCurrency: currency,
    timezone: tz,
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });
  assert.ok(result.ok, JSON.stringify(result));
  const storeId = result.data.id;
  if (bankTransfer) {
    await db.storePaymentMethod.update({ where: { storeId_method: { storeId, method: "bank_transfer" } }, data: { enabled: true } });
  }
  return storeId;
}

async function makeProduct(storeId: string, {
  price = "100.00",
  stock = "5",
  status = "ACTIVE",
  deliveryFee = "12.50",
  freeDelivery = false,
  pickupOnly = false,
}: {
  price?: string;
  stock?: string;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
  deliveryFee?: string;
  freeDelivery?: boolean;
  pickupOnly?: boolean;
} = {}) {
  const categoryId = (await listAdminCategories(db, storeId))![0].id;
  const result = await createAdminProduct(db, storeId, {
    name: `Chair ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "A sturdy chair for testing orders.",
    price,
    compareAtPrice: "",
    deliveryFee,
    freeDelivery,
    pickupOnly,
    imageUrl: "",
    stock,
    status,
    featured: false,
  });
  assert.ok(result.ok, JSON.stringify(result));
  const variant = await db.productVariant.findFirstOrThrow({ where: { productId: result.data.id, isDefault: true } });
  return { id: result.data.id, variantId: variant.id };
}

const ip = () => ({ ipAddress: `10.1.${uid()}` });
const stockOf = async (variantId: string) => (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
const nextNumber = async (storeId: string) => (await db.store.findUniqueOrThrow({ where: { id: storeId } })).nextOrderNumber;
const orderCount = (storeId: string) => db.order.count({ where: { storeId } });

function orderInput(
  storeId: string,
  items: { productId: string; quantity: number }[],
  expectedTotalMinor: string,
  extra: Record<string, unknown> = {},
) {
  return {
    storeId,
    idempotencyKey: randomUUID(),
    expectedTotalMinor,
    fulfillmentMethod: "DELIVERY",
    items,
    name: "Jane Visitor",
    email: `Jane-${uid()}@Example.com`,
    phone: "050 123 4567",
    address: "Villa 12, Example Street",
    city: "Dubai",
    paymentMethod: "cash_on_delivery",
    ...extra,
  };
}

/** Everything that must be unchanged after a refused or rolled-back order. */
async function snapshot(storeId: string, variantIds: string[]) {
  return {
    stock: await Promise.all(variantIds.map(stockOf)),
    orders: await orderCount(storeId),
    nextNumber: await nextNumber(storeId),
    customers: await db.customer.count({ where: { storeId } }),
  };
}

let owner: Awaited<ReturnType<typeof testActor>>;
before(async () => {
  owner = await testActor(db);
});

// ---------- Successful orders ----------

test("cash on delivery: a real, unpaid, pending order at database prices, stock reduced", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { price: "100.00", stock: "5", deliveryFee: "12.50" });
  const before = await nextNumber(store);
  const input = orderInput(store, [{ productId: p.id, quantity: 2 }], "22500");

  const result = await placeOrder(db, store, input, ip());
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.duplicate, false);
  assert.equal(result.order.paymentStatus, "UNPAID");
  assert.equal(result.order.subtotalMinor, "20000");
  assert.equal(result.order.shippingMinor, "2500");
  assert.equal(result.order.totalMinor, "22500");

  const order = await db.order.findFirstOrThrow({ where: { storeId: store }, include: { items: true, customer: true } });
  assert.equal(order.status, "PENDING");
  assert.equal(order.paymentStatus, "UNPAID");
  assert.equal(order.paymentMethod, "cash_on_delivery");
  assert.equal(order.isDemo, false);
  assert.equal(order.currency, "AED");
  assert.equal(order.number, before);
  assert.equal(order.totalMinor, BigInt(22500));
  assert.equal(order.customerEmail, input.email.toLowerCase());
  assert.equal(order.customerPhone, "+971501234567");
  assert.deepEqual(order.shippingAddress, {
    recipientName: "Jane Visitor",
    fulfillmentMethod: "DELIVERY",
    line1: "Villa 12, Example Street",
    city: "Dubai",
    region: "Dubai",
    countryCode: "AE",
    phone: "+971501234567",
  });
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].unitPriceMinor, BigInt(10000));
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.items[0].lineTotalMinor, BigInt(20000));
  assert.equal(order.items[0].variantId, p.variantId);
  assert.equal(order.customer?.email, input.email.toLowerCase());
  assert.equal(await stockOf(p.variantId), 3);
  assert.equal(await nextNumber(store), before + 1);
});

test("bank transfer: placed as pending and unpaid — never marked paid", async () => {
  const store = await makeStore();
  const p = await makeProduct(store);
  const result = await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500", { paymentMethod: "bank_transfer" }), ip());
  assert.ok(result.ok, JSON.stringify(result));
  const order = await db.order.findFirstOrThrow({ where: { storeId: store } });
  assert.equal(order.paymentMethod, "bank_transfer");
  assert.equal(order.paymentStatus, "UNPAID");
  assert.equal(order.status, "PENDING");
});

test("free delivery is product-level, and exact 3-decimal (KWD) totals use product fees", async () => {
  const aed = await makeStore();
  const big = await makeProduct(aed, { price: "250.00", freeDelivery: true, deliveryFee: "0" });
  const free = await placeOrder(db, aed, orderInput(aed, [{ productId: big.id, quantity: 2 }], "50000"), ip());
  assert.ok(free.ok && free.order.shippingMinor === "0" && free.order.totalMinor === "50000", JSON.stringify(free));

  const kwd = await makeStore({ country: "KW", currency: "KWD", tz: "Asia/Kuwait" });
  const lamp = await makeProduct(kwd, { price: "12.345", deliveryFee: "1.500" });
  const result = await placeOrder(
    db,
    kwd,
    orderInput(kwd, [{ productId: lamp.id, quantity: 3 }], "41535", { city: "Kuwait City", phone: "+965 5000 0000" }),
    ip(),
  );
  assert.ok(result.ok, JSON.stringify(result));
  const order = await db.order.findFirstOrThrow({ where: { storeId: kwd } });
  assert.equal(order.currency, "KWD");
  assert.equal(order.subtotalMinor, BigInt(37035));
  assert.equal(order.shippingMinor, BigInt(4500));
  assert.equal(order.totalMinor, BigInt(41535));
});

// ---------- Tampering ----------

test("prices, totals and stock sent by the browser are ignored; the order uses database values", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { price: "100.00" });
  const input = orderInput(store, [{ productId: p.id, quantity: 1, priceMinor: "1", unitPrice: 0.01, stock: 999 } as never], "12500", {
    totalMinor: "1",
    subtotalMinor: "1",
    paymentStatus: "PAID",
    status: "DELIVERED",
  });
  const result = await placeOrder(db, store, input, ip());
  assert.ok(result.ok, JSON.stringify(result));
  const order = await db.order.findFirstOrThrow({ where: { storeId: store }, include: { items: true } });
  assert.equal(order.totalMinor, BigInt(12500));
  assert.equal(order.items[0].unitPriceMinor, BigInt(10000));
  assert.equal(order.paymentStatus, "UNPAID");
  assert.equal(order.status, "PENDING");
});

test("a tampered (or stale) expected total is refused and nothing changes", async () => {
  const store = await makeStore();
  const p = await makeProduct(store);
  const before = await snapshot(store, [p.variantId]);
  const result = await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "100"), ip());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, ORDER_MESSAGES.priceChanged);
  assert.deepEqual(await snapshot(store, [p.variantId]), before);
});

test("a cart for another store, or another store's product, is refused", async () => {
  const storeA = await makeStore();
  const storeB = await makeStore();
  const productB = await makeProduct(storeB);
  const before = await snapshot(storeB, [productB.variantId]);

  const mismatch = await placeOrder(db, storeA, orderInput(storeB, [{ productId: productB.id, quantity: 1 }], "12500"), ip());
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.error, ORDER_MESSAGES.otherStore);

  const crossStore = await placeOrder(db, storeA, orderInput(storeA, [{ productId: productB.id, quantity: 1 }], "12500"), ip());
  assert.equal(crossStore.ok, false);
  if (!crossStore.ok) assert.equal(crossStore.error, ORDER_MESSAGES.unavailable);

  assert.deepEqual(await snapshot(storeB, [productB.variantId]), before);
  assert.equal(await orderCount(storeA), 0);
});

// ---------- Store and product state ----------

test("a paused, suspended, draft or archived store accepts no orders", async () => {
  // The product is created while the store is still usable in the admin;
  // the store is taken out of service afterwards (an archived store's
  // products can't be created through the admin at all).
  const cases: [string, StoreOptions, (store: string) => Promise<unknown>][] = [
    ["paused", {}, (s) => setAdminStoreStatus(owner, db, s, "PAUSED")],
    ["suspended", {}, (s) => setAdminStoreStatus(owner, db, s, "SUSPENDED")],
    ["draft", { status: "DRAFT" }, async () => undefined],
    ["archived", {}, (s) => archiveAdminStore(owner, db, s)],
  ];
  for (const [label, options, takeOutOfService] of cases) {
    const store = await makeStore(options);
    const p = await makeProduct(store);
    const changed = await takeOutOfService(store);
    if (changed) assert.ok((changed as { ok: boolean }).ok, `${label}: ${JSON.stringify(changed)}`);
    const result = await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500"), ip());
    assert.equal(result.ok, false, label);
    if (!result.ok) assert.equal(result.error, ORDER_MESSAGES.storeUnavailable, label);
    assert.equal(await stockOf(p.variantId), 5, label);
    assert.equal(await orderCount(store), 0, label);
  }
});

test("a disabled payment method or an out-of-scope method is refused", async () => {
  const noBank = await makeStore({ bankTransfer: false });
  const p2 = await makeProduct(noBank);
  const r2 = await placeOrder(db, noBank, orderInput(noBank, [{ productId: p2.id, quantity: 1 }], "12500", { paymentMethod: "bank_transfer" }), ip());
  assert.ok(!r2.ok && r2.error === ORDER_MESSAGES.paymentUnavailable, JSON.stringify(r2));

  // Card on delivery is enabled here, but it is out of scope in this phase.
  const withCard = await makeStore();
  await db.storePaymentMethod.update({ where: { storeId_method: { storeId: withCard, method: "card_on_delivery" } }, data: { enabled: true } });
  const p3 = await makeProduct(withCard);
  for (const method of ["card_on_delivery", "online_card"]) {
    const r = await placeOrder(db, withCard, orderInput(withCard, [{ productId: p3.id, quantity: 1 }], "12500", { paymentMethod: method }), ip());
    assert.equal(r.ok, false, method);
    if (!r.ok) assert.ok(r.fieldErrors?.paymentMethod, method);
  }
  for (const [store, p] of [[noBank, p2], [withCard, p3]] as const) {
    assert.equal(await stockOf(p.variantId), 5);
    assert.equal(await orderCount(store), 0);
  }
});

test("pickup-only products refuse delivery and can be ordered with pickup", async () => {
  const store = await makeStore();
  const product = await makeProduct(store, { pickupOnly: true, deliveryFee: "0" });
  const refused = await placeOrder(
    db,
    store,
    orderInput(store, [{ productId: product.id, quantity: 1 }], "10000"),
    ip(),
  );
  assert.ok(!refused.ok && refused.error === ORDER_MESSAGES.pickupOnly, JSON.stringify(refused));
  assert.equal(await orderCount(store), 0);

  const pickup = await placeOrder(
    db,
    store,
    orderInput(store, [{ productId: product.id, quantity: 1 }], "10000", {
      fulfillmentMethod: "PICKUP",
      address: "",
      city: "",
    }),
    ip(),
  );
  assert.ok(pickup.ok, JSON.stringify(pickup));
  if (pickup.ok) {
    assert.equal(pickup.order.fulfillmentMethod, "PICKUP");
    assert.equal(pickup.order.shippingMinor, "0");
    assert.equal(pickup.order.deliveryTo, "Store pickup");
  }
  const order = await db.order.findFirstOrThrow({ where: { storeId: store } });
  assert.deepEqual(order.shippingAddress, { fulfillmentMethod: "PICKUP" });
});

test("draft, archived, deleted and unknown products are refused", async () => {
  const store = await makeStore();
  const ok = await makeProduct(store);
  const draft = await makeProduct(store, { status: "DRAFT" });
  const archived = await makeProduct(store, { status: "ARCHIVED" });
  const deleted = await makeProduct(store);
  assert.ok((await deleteAdminProduct(db, store, deleted.id)).ok);

  for (const productId of [draft.id, archived.id, deleted.id, `missing-${uid()}`]) {
    const result = await placeOrder(
      db,
      store,
      orderInput(store, [{ productId: ok.id, quantity: 1 }, { productId, quantity: 1 }], "22500"),
      ip(),
    );
    assert.equal(result.ok, false, productId);
    if (!result.ok) assert.equal(result.error, ORDER_MESSAGES.unavailable, productId);
  }
  assert.equal(await stockOf(ok.variantId), 5);
  assert.equal(await orderCount(store), 0);
});

test("insufficient stock is refused and nothing changes", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "2" });
  const before = await snapshot(store, [p.variantId]);
  const result = await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 3 }], "33750"), ip());
  assert.ok(!result.ok && result.error === ORDER_MESSAGES.stock, JSON.stringify(result));
  assert.deepEqual(await snapshot(store, [p.variantId]), before);
});

// ---------- Concurrency ----------

test("two orders racing for the last unit: exactly one succeeds, stock ends at 0", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "1" });
  const results = await Promise.all([
    placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500"), ip()),
    placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500"), ip()),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results));
  const loser = results.find((r) => !r.ok);
  if (loser && !loser.ok) assert.equal(loser.error, ORDER_MESSAGES.stock);
  assert.equal(await stockOf(p.variantId), 0);
  assert.equal(await orderCount(store), 1);
});

test("three buyers for two units: exactly two succeed, never oversold", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "2" });
  const results = await Promise.all(
    [1, 2, 3].map(() => placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500"), ip())),
  );
  assert.equal(results.filter((r) => r.ok).length, 2, JSON.stringify(results));
  assert.equal(await stockOf(p.variantId), 0);
  assert.equal(await orderCount(store), 2);
  const numbers = (await db.order.findMany({ where: { storeId: store }, select: { number: true } })).map((o) => o.number);
  assert.equal(new Set(numbers).size, 2, "each order gets its own number");
});

// ---------- Idempotency ----------

test("the same submission twice creates one order; the repeat returns it without reducing stock again", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "5" });
  const input = orderInput(store, [{ productId: p.id, quantity: 2 }], "22500");
  const first = await placeOrder(db, store, input, ip());
  const second = await placeOrder(db, store, input, ip());
  assert.ok(first.ok && second.ok, JSON.stringify({ first, second }));
  if (!first.ok || !second.ok) return;
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.order.orderNumber, first.order.orderNumber);
  assert.equal(await orderCount(store), 1);
  assert.equal(await stockOf(p.variantId), 3);
});

test("a reused key with a different request is refused", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "5" });
  const input = orderInput(store, [{ productId: p.id, quantity: 1 }], "12500");
  assert.ok((await placeOrder(db, store, input, ip())).ok);
  const changed = await placeOrder(db, store, { ...input, items: [{ productId: p.id, quantity: 2 }], expectedTotalMinor: "22500" }, ip());
  assert.ok(!changed.ok && changed.error === ORDER_MESSAGES.keyReused, JSON.stringify(changed));
  assert.equal(await orderCount(store), 1);
  assert.equal(await stockOf(p.variantId), 4);
});

test("concurrent duplicate submissions (double click) create exactly one order", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "5" });
  const input = orderInput(store, [{ productId: p.id, quantity: 1 }], "12500");
  const results = await Promise.all([1, 2, 3].map(() => placeOrder(db, store, input, ip())));
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
  const numbers = new Set(results.map((r) => (r.ok ? r.order.orderNumber : "")));
  assert.equal(numbers.size, 1, "every response names the same order");
  assert.equal(results.filter((r) => r.ok && !r.duplicate).length, 1);
  assert.equal(await orderCount(store), 1);
  assert.equal(await stockOf(p.variantId), 4);
});

// ---------- Rollback ----------

test("a later line failing rolls back the earlier line's stock, the customer and the order number", async () => {
  const store = await makeStore();
  const plenty = await makeProduct(store, { stock: "5" });
  const scarce = await makeProduct(store, { stock: "1" });
  const before = await snapshot(store, [plenty.variantId, scarce.variantId]);
  const result = await placeOrder(
    db,
    store,
    orderInput(store, [{ productId: plenty.id, quantity: 2 }, { productId: scarce.id, quantity: 2 }], "42500"),
    ip(),
  );
  assert.ok(!result.ok && result.error === ORDER_MESSAGES.stock, JSON.stringify(result));
  assert.deepEqual(await snapshot(store, [plenty.variantId, scarce.variantId]), before);
});

test("a failure after everything was written rolls back stock, customer, order number, order and items", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "5" });
  const input = orderInput(store, [{ productId: p.id, quantity: 2 }], "22500");
  const before = await snapshot(store, [p.variantId]);
  const itemsBefore = await db.orderItem.count({ where: { storeId: store } });
  let reachedEnd = false;
  await assert.rejects(
    placeOrder(db, store, input, ip(), {
      beforeCommit: async () => {
        reachedEnd = true;
        throw new Error("simulated failure just before commit");
      },
    }),
    /simulated failure/,
  );
  assert.ok(reachedEnd, "the failure happened after all writes");
  assert.deepEqual(await snapshot(store, [p.variantId]), before);
  assert.equal(await db.orderItem.count({ where: { storeId: store } }), itemsBefore);

  // Nothing was kept, so the same attempt can be retried safely and succeeds.
  const retry = await placeOrder(db, store, input, ip());
  assert.ok(retry.ok && !retry.duplicate, JSON.stringify(retry));
  assert.equal(await stockOf(p.variantId), 3);
});

// ---------- Validation, rate limit, customers ----------

test("invalid customer or delivery details are refused with field errors, and nothing is saved", async () => {
  const store = await makeStore();
  const p = await makeProduct(store);
  const before = await snapshot(store, [p.variantId]);
  const result = await placeOrder(
    db,
    store,
    orderInput(store, [{ productId: p.id, quantity: 1 }], "12500", { email: "nope", phone: "12", address: "x", city: "Paris", name: "" }),
    ip(),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, ORDER_MESSAGES.invalid);
    assert.deepEqual(Object.keys(result.fieldErrors ?? {}).sort(), ["address", "city", "email", "name", "phone"]);
    assert.equal(result.retrySameKey, false);
  }
  const malformed = await placeOrder(db, store, { ...orderInput(store, [], "0") }, ip());
  assert.ok(!malformed.ok && !malformed.fieldErrors, JSON.stringify(malformed));
  assert.deepEqual(await snapshot(store, [p.variantId]), before);
});

test("rate limiting runs first: invalid attempts count toward the same budget", async () => {
  const store = await makeStore();
  const p = await makeProduct(store);
  const context = ip();
  for (let i = 0; i < 10; i++) {
    const r = await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500", { email: "bad" }), context);
    assert.ok(!r.ok && r.error === ORDER_MESSAGES.invalid, JSON.stringify(r));
  }
  const valid = await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500"), context);
  assert.ok(!valid.ok && valid.error === ORDER_MESSAGES.tooMany, JSON.stringify(valid));
  assert.equal(await orderCount(store), 0);
});

test("a returning email reuses the store's customer record without overwriting it", async () => {
  const store = await makeStore();
  const p = await makeProduct(store, { stock: "5" });
  const email = `repeat-${uid()}@example.com`;
  assert.ok((await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500", { email, name: "First Name" }), ip())).ok);
  assert.ok((await placeOrder(db, store, orderInput(store, [{ productId: p.id, quantity: 1 }], "12500", { email: email.toUpperCase(), name: "Someone Else" }), ip())).ok);
  const customers = await db.customer.findMany({ where: { storeId: store }, include: { orders: true } });
  assert.equal(customers.length, 1);
  assert.equal(customers[0].name, "First Name", "a public form can't rename an existing customer");
  assert.equal(customers[0].orders.length, 2);
  const orders = await db.order.findMany({ where: { storeId: store }, orderBy: { number: "asc" } });
  assert.deepEqual(orders.map((o) => o.customerName), ["First Name", "Someone Else"], "each order keeps what was submitted");
});

// ---------- Admin: read-only orders list ----------

test("the admin orders list shows only that store's orders, newest first, with payment status", async () => {
  const storeA = await makeStore();
  const storeB = await makeStore();
  const pa = await makeProduct(storeA, { stock: "5" });
  const pb = await makeProduct(storeB, { stock: "5" });
  const first = await placeOrder(db, storeA, orderInput(storeA, [{ productId: pa.id, quantity: 1 }], "12500"), ip());
  const second = await placeOrder(db, storeA, orderInput(storeA, [{ productId: pa.id, quantity: 2 }], "22500", { paymentMethod: "bank_transfer" }), ip());
  assert.ok((await placeOrder(db, storeB, orderInput(storeB, [{ productId: pb.id, quantity: 1 }], "12500"), ip())).ok);
  assert.ok(first.ok && second.ok);
  if (!first.ok || !second.ok) return;

  const rows = (await listAdminOrders(db, storeA))!;
  assert.equal(rows.length, 2, "store B's order is not listed");
  assert.deepEqual(rows.map((r) => r.number), [second.order.orderNumber, first.order.orderNumber]);
  assert.equal(rows[0].paymentMethod, "bank_transfer");
  assert.equal(rows[0].paymentStatus, "UNPAID");
  assert.equal(rows[0].status, "PENDING");
  assert.equal(rows[0].itemCount, 2);
  assert.match(rows[0].totalDisplay, /225\.00/);
  assert.equal(rows[0].isSample, false);
  assert.equal(await listAdminOrders(db, `missing-${uid()}`), null);
});

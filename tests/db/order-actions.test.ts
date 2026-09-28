// The public placeOrderAction wrapper: the store is resolved on the
// server from the store cookie (Cookie header) or the configured default,
// never from the request body. Headers are injected the same way
// tests/db/auth-actions.test.ts does for admin actions.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { placeOrderAction } from "../../app/(storefront)/actions";
import { DEFAULT_STOREFRONT_STORE_ID } from "../../lib/config";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { createAdminProduct } from "../../lib/server/admin/products";
import { createAdminStore } from "../../lib/server/admin/stores";
import { ORDER_MESSAGES } from "../../lib/server/orders";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(async () => {
  setRequestRuntimeForTests(null);
  await db.$disconnect();
});

function asVisitor(cookie: string | null) {
  setRequestRuntimeForTests({
    async headers() {
      const headers = new Headers();
      if (cookie) headers.set("cookie", cookie);
      return headers;
    },
    revalidateAdmin() {},
  });
}

async function makeStore(status: "ACTIVE" | "DRAFT") {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Order action ${uid()}`,
    slug: `order-action-${uid()}`,
    businessType: "furniture",
    status,
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
  const zone = await db.shippingZone.create({ data: { storeId: result.data.id, name: "Domestic" } });
  await db.shippingRate.create({
    data: { storeId: result.data.id, zoneId: zone.id, name: "Standard", currency: "AED", priceMinor: BigInt(2500), freeOverMinor: null },
  });
  return result.data.id;
}

async function makeProduct(storeId: string) {
  const categoryId = (await listAdminCategories(db, storeId))![0].id;
  const result = await createAdminProduct(db, storeId, {
    name: `Stool ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "A sturdy stool for testing orders.",
    price: "100.00",
    compareAtPrice: "",
    imageUrl: "",
    stock: "5",
    status: "ACTIVE",
    featured: false,
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

const input = (storeId: string, productId: string) => ({
  storeId,
  idempotencyKey: randomUUID(),
  expectedTotalMinor: "12500",
  items: [{ productId, quantity: 1 }],
  name: "Jane Visitor",
  email: `jane-${uid()}@example.com`,
  phone: "050 123 4567",
  address: "Villa 12, Example Street",
  city: "Dubai",
  paymentMethod: "cash_on_delivery",
});

let active = "";
let draft = "";
let activeProduct = "";

before(async () => {
  active = await makeStore("ACTIVE");
  draft = await makeStore("DRAFT");
  activeProduct = await makeProduct(active);
});

test("the store comes from the store cookie on the server, and the order is placed there", async () => {
  asVisitor(`storefront_store=${active}`);
  const result = await placeOrderAction(input(active, activeProduct));
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(await db.order.count({ where: { storeId: active } }), 1);
});

test("a cart claiming another store than the one the cookie selects is refused", async () => {
  asVisitor(`storefront_store=${active}`);
  const other = await makeStore("ACTIVE");
  const result = await placeOrderAction(input(other, activeProduct));
  assert.ok(!result.ok && result.error === ORDER_MESSAGES.otherStore, JSON.stringify(result));
});

test("a cookie naming a non-public store falls back to the default store — never to the named one", async () => {
  asVisitor(`storefront_store=${draft}`);
  const draftProduct = await makeProduct(draft);
  const result = await placeOrderAction(input(draft, draftProduct));
  assert.equal(result.ok, false);
  if (!result.ok) {
    // The default store is shown instead, so a draft-store cart doesn't match it.
    assert.ok([ORDER_MESSAGES.otherStore, ORDER_MESSAGES.storeUnavailable].includes(result.error as never), result.error);
  }
  assert.equal(await db.order.count({ where: { storeId: draft } }), 0);
  assert.notEqual(DEFAULT_STOREFRONT_STORE_ID, draft);
});

test("a malformed request is refused safely, without internal details", async () => {
  asVisitor(`storefront_store=${active}`);
  for (const bad of [null, "x", 42, {}, { storeId: active }, { ...input(active, activeProduct), items: "all" }]) {
    const result = await placeOrderAction(bad);
    assert.equal(result.ok, false, JSON.stringify(bad));
    if (!result.ok) {
      assert.equal(result.retrySameKey, false);
      assert.doesNotMatch(result.error, /prisma|sql|stack|Error:/i);
    }
  }
});

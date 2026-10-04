// The public placeOrderAction wrapper: the store is resolved on the
// server from the request's Host (a store's own subdomain here), never
// from the request body or, on a store's host, from the preview cookie.
// Headers are injected the same way tests/db/auth-actions.test.ts does for
// admin actions.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { placeOrderAction } from "../../app/(storefront)/actions";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { createAdminProduct } from "../../lib/server/admin/products";
import { createAdminStore } from "../../lib/server/admin/stores";
import { ORDER_MESSAGES } from "../../lib/server/orders";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
const savedEnv = { root: process.env.PLATFORM_ROOT_DOMAIN, admin: process.env.ADMIN_HOST, authUrl: process.env.BETTER_AUTH_URL };
after(async () => {
  setRequestRuntimeForTests(null);
  process.env.PLATFORM_ROOT_DOMAIN = savedEnv.root;
  process.env.ADMIN_HOST = savedEnv.admin;
  process.env.BETTER_AUTH_URL = savedEnv.authUrl;
  await db.$disconnect();
});

/** Makes the action see a request to this host (with an optional Cookie header). */
function asVisitor(host: string, cookie: string | null = null) {
  setRequestRuntimeForTests({
    async headers() {
      const headers = new Headers({ host });
      if (cookie) headers.set("cookie", cookie);
      return headers;
    },
    revalidateAdmin() {},
  });
}
const hostOf = async (storeId: string) => `${(await db.store.findUniqueOrThrow({ where: { id: storeId } })).slug}.shops.test`;

async function makeStore(status: "ACTIVE" | "DRAFT") {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Order action ${uid()}`,
    slug: `order-action-${uid()}`,
    businessType: "furniture",
    status,
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "an order action passphrase 2026",
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });
  assert.ok(result.ok, JSON.stringify(result));
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
    deliveryFee: "12.50",
    freeDelivery: false,
    pickupOnly: false,
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
  // 100.00 + the product's own 12.50 delivery fee (delivery is per product).
  expectedTotalMinor: "11250",
  fulfillmentMethod: "DELIVERY",
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
  process.env.PLATFORM_ROOT_DOMAIN = "shops.test";
  process.env.ADMIN_HOST = "admin.shops.test";
  // The auth config requires ADMIN_HOST to be BETTER_AUTH_URL's host (store
  // creation provisions the owner's credentials through Better Auth).
  process.env.BETTER_AUTH_URL = "http://admin.shops.test";
  active = await makeStore("ACTIVE");
  draft = await makeStore("DRAFT");
  activeProduct = await makeProduct(active);
});

test("the store comes from the request's host on the server, and the order is placed there", async () => {
  asVisitor(await hostOf(active));
  const result = await placeOrderAction(input(active, activeProduct));
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(await db.order.count({ where: { storeId: active } }), 1);
});

test("a cart claiming another store than the one the host serves is refused", async () => {
  asVisitor(await hostOf(active));
  const other = await makeStore("ACTIVE");
  const result = await placeOrderAction(input(other, activeProduct));
  assert.ok(!result.ok && result.error === ORDER_MESSAGES.otherStore, JSON.stringify(result));
});

test("on a store's own host, a preview cookie naming another store is ignored", async () => {
  const other = await makeStore("ACTIVE");
  asVisitor(await hostOf(other), `storefront_store=${active}`);
  const result = await placeOrderAction(input(active, activeProduct));
  assert.ok(!result.ok && result.error === ORDER_MESSAGES.otherStore, JSON.stringify(result));
  assert.equal(await db.order.count({ where: { storeId: other } }), 0);
});

test("a draft store's host, or an unknown host, takes no order", async () => {
  const draftProduct = await makeProduct(draft);
  const before = await db.order.count({ where: { storeId: { in: [active, draft] } } });
  for (const host of [await hostOf(draft), "elsewhere.example", `no-such-store-${uid()}.shops.test`]) {
    asVisitor(host, `storefront_store=${active}`);
    const result = await placeOrderAction(input(draft, draftProduct));
    assert.ok(!result.ok && result.error === ORDER_MESSAGES.storeUnavailable, `${host}: ${JSON.stringify(result)}`);
  }
  assert.equal(await db.order.count({ where: { storeId: { in: [active, draft] } } }), before);
});

test("a preview cookie selects a store only on the explicit path-preview host, never on the platform admin host", async () => {
  // The platform admin host never serves a storefront from a cookie.
  asVisitor("admin.shops.test", `storefront_store=${active}`);
  const refused = await placeOrderAction(input(active, activeProduct));
  assert.ok(!refused.ok && refused.error === ORDER_MESSAGES.storeUnavailable, JSON.stringify(refused));

  // The temporary preview-only host (STOREFRONT_PREVIEW_MODE=path) honours it.
  const saved = { root: process.env.PLATFORM_ROOT_DOMAIN, admin: process.env.ADMIN_HOST, mode: process.env.STOREFRONT_PREVIEW_MODE };
  process.env.PLATFORM_ROOT_DOMAIN = "preview.shops.test";
  process.env.ADMIN_HOST = "preview.shops.test";
  process.env.STOREFRONT_PREVIEW_MODE = "path";
  try {
    asVisitor("preview.shops.test", `storefront_store=${active}`);
    const result = await placeOrderAction(input(active, activeProduct));
    assert.ok(result.ok, JSON.stringify(result));
  } finally {
    process.env.PLATFORM_ROOT_DOMAIN = saved.root;
    process.env.ADMIN_HOST = saved.admin;
    process.env.STOREFRONT_PREVIEW_MODE = saved.mode ?? "";
  }
});

test("a malformed request is refused safely, without internal details", async () => {
  asVisitor(await hostOf(active));
  for (const bad of [null, "x", 42, {}, { storeId: active }, { ...input(active, activeProduct), items: "all" }]) {
    const result = await placeOrderAction(bad);
    assert.equal(result.ok, false, JSON.stringify(bad));
    if (!result.ok) {
      assert.equal(result.retrySameKey, false);
      assert.doesNotMatch(result.error, /prisma|sql|stack|Error:/i);
    }
  }
});

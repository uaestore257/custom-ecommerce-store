// Public storefront reads (lib/server/storefront/catalog.ts, the shared
// storefront core): which store is shown, which products are public, which
// template a store renders with, and what reaches the browser.
// Every store here is created fresh, so nothing depends on seeded data.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { createAdminProduct, updateAdminProduct } from "../../lib/server/admin/products";
import { archiveAdminStore, createAdminStore, setAdminStoreStatus } from "../../lib/server/admin/stores";
import {
  getFeaturedProducts,
  getSitemapProducts,
  getStorefrontContext,
  getStorefrontProduct,
  getStorefrontProductListing,
  resolveStoreForHost,
  resolveStorefrontStoreId,
} from "../../lib/server/storefront/catalog";
import type { ListingQuery } from "../../lib/storefront-types";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

const firstPage = (overrides: Partial<ListingQuery> = {}): ListingQuery => ({ page: 1, sort: "newest", q: "", ...overrides });

/** A store's context plus the first page of its products (newest first), as pages receive them. */
async function catalogOf(storeId: string) {
  const context = await getStorefrontContext(db, storeId);
  if (!context) return null;
  const listing = await getStorefrontProductListing(db, storeId, null, firstPage());
  assert.ok(listing, "a public store always has a listing");
  return { ...context, products: listing.products };
}

type Status = "ACTIVE" | "DRAFT" | "PAUSED";

async function makeStore(status: Status, currency = { country: "AE", code: "AED", tz: "Asia/Dubai" }) {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Storefront ${status} ${uid()}`,
    slug: `storefront-${status.toLowerCase()}-${uid()}`,
    businessType: "furniture",
    status,
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "a catalog owner passphrase 2026",
    countryCode: currency.country,
    baseCurrency: currency.code,
    timezone: currency.tz,
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

async function makeProduct(storeId: string, overrides: Record<string, unknown> = {}) {
  const categoryId = (await listAdminCategories(db, storeId))![0].id;
  const result = await createAdminProduct(db, storeId, {
    name: `Oak table ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "Solid oak.",
    price: "129.50",
    compareAtPrice: "",
    imageUrl: "",
    stock: "7",
    deliveryFee: "0",
    freeDelivery: false,
    pickupOnly: false,
    status: "ACTIVE",
    featured: false,
    ...overrides,
  });
  assert.ok(result.ok, JSON.stringify(result));
  return { id: result.data.id, categoryId };
}

let active = "";
let otherActive = "";
let draft = "";
let paused = "";
let suspended = "";
let archived = "";

before(async () => {
  active = await makeStore("ACTIVE");
  otherActive = await makeStore("ACTIVE");
  draft = await makeStore("DRAFT");
  paused = await makeStore("PAUSED");
  suspended = await makeStore("ACTIVE");
  const owner = await testActor(db);
  assert.ok((await setAdminStoreStatus(owner, db, suspended, "SUSPENDED")).ok);
  archived = await makeStore("ACTIVE");
  assert.ok((await archiveAdminStore(owner, db, archived)).ok);
});

// ---------- Which store is shown ----------

test("a cookie naming an ACTIVE store is used", async () => {
  assert.equal(await resolveStorefrontStoreId(db, otherActive, active), otherActive);
});

test("a cookie naming a draft, paused, suspended, archived or missing store falls back to the default", async () => {
  for (const cookie of [draft, paused, suspended, archived, `missing-${uid()}`]) {
    assert.equal(await resolveStorefrontStoreId(db, cookie, active), active, cookie);
  }
});

test("a malformed, oversized or absent cookie falls back to the default without querying it", async () => {
  for (const cookie of [undefined, "", "x".repeat(65), "bad id", "a;b", 123, null]) {
    assert.equal(await resolveStorefrontStoreId(db, cookie, active), active, JSON.stringify(cookie));
  }
});

test("when neither the cookie store nor the default is public, the result is null — deterministically, never another store", async () => {
  const pairs: [unknown, string][] = [
    [paused, suspended],
    [draft, archived],
    [undefined, draft],
    [`missing-${uid()}`, `missing-${uid()}`],
  ];
  for (const [cookie, fallback] of pairs) {
    // Other ACTIVE stores exist in this database; none may be picked instead.
    for (let i = 0; i < 3; i++) {
      assert.equal(await resolveStorefrontStoreId(db, cookie, fallback), null, JSON.stringify({ cookie, fallback }));
    }
  }
});

test("a valid cookie store still wins when the default is unavailable", async () => {
  assert.equal(await resolveStorefrontStoreId(db, active, suspended), active);
});

// ---------- Store from the hostname ----------

const HOST_ENV = {
  ADMIN_HOST: "admin.shops.test",
  PLATFORM_ROOT_DOMAIN: "shops.test",
  NODE_ENV: "production",
} as unknown as NodeJS.ProcessEnv;
const slugOf = async (id: string) => (await db.store.findUniqueOrThrow({ where: { id } })).slug;

test("a store's own subdomain serves that store, and ignores any preview cookie", async () => {
  const host = `${await slugOf(active)}.shops.test`;
  assert.equal(await resolveStoreForHost(db, host, undefined, HOST_ENV), active);
  assert.equal(await resolveStoreForHost(db, `${host}:3000`, otherActive, HOST_ENV), active, "cookie naming another store is ignored");
  assert.equal(await resolveStoreForHost(db, host.toUpperCase(), undefined, HOST_ENV), active, "hostnames are case-insensitive");
});

test("a mapped custom domain serves its store", async () => {
  const env = { ...HOST_ENV, STORE_DOMAINS: `shop.client.test=${await slugOf(otherActive)}` } as unknown as NodeJS.ProcessEnv;
  assert.equal(await resolveStoreForHost(db, "shop.client.test", active, env), otherActive);
});

test("a non-public store's host, an unknown slug or an unknown domain serves no store — never another one", async () => {
  for (const id of [draft, paused, suspended, archived]) {
    assert.equal(await resolveStoreForHost(db, `${await slugOf(id)}.shops.test`, active, HOST_ENV), null, id);
  }
  for (const host of [`no-such-store-${uid()}.shops.test`, "elsewhere.example", "shops.test", "", "www.shops.test"]) {
    assert.equal(await resolveStoreForHost(db, host, active, HOST_ENV), null, host);
  }
});

test("platform admin and business roots never use a preview cookie or default storefront", async () => {
  assert.equal(await resolveStoreForHost(db, "admin.shops.test", active, HOST_ENV), null);
  assert.equal(await resolveStoreForHost(db, "admin.shops.test", draft, HOST_ENV), null);
  assert.equal(await resolveStoreForHost(db, "shops.test", active, HOST_ENV), null);
});

// ---------- Catalog contents ----------

test("the catalog of a non-public store is null (defence in depth)", async () => {
  for (const id of [draft, paused, suspended, archived, `missing-${uid()}`]) {
    assert.equal(await getStorefrontContext(db, id), null, id);
    assert.equal(await getStorefrontProductListing(db, id, null, firstPage()), null, id);
    assert.deepEqual(await getFeaturedProducts(db, id, 4), [], id);
    assert.deepEqual(await getSitemapProducts(db, id), [], id);
  }
});

test("only ACTIVE products are listed; draft and archived ones are not", async () => {
  const store = await makeStore("ACTIVE");
  const shown = await makeProduct(store);
  const drafted = await makeProduct(store, { status: "DRAFT" });
  const archivedProduct = await makeProduct(store, { status: "ARCHIVED" });
  const catalog = (await catalogOf(store))!;
  const ids = catalog.products.map((p) => p.id);
  assert.ok(ids.includes(shown.id));
  assert.ok(!ids.includes(drafted.id));
  assert.ok(!ids.includes(archivedProduct.id));
});

test("categories belong to the store and come in position order", async () => {
  const catalog = (await catalogOf(active))!;
  const expected = await db.category.findMany({ where: { storeId: active }, orderBy: { position: "asc" }, select: { id: true } });
  assert.deepEqual(catalog.categories.map((c) => c.id), expected.map((c) => c.id));
  const otherIds = new Set((await catalogOf(otherActive))!.categories.map((c) => c.id));
  for (const c of catalog.categories) assert.ok(!otherIds.has(c.id));
});

// ---------- Single product ----------

test("a single product: ACTIVE found; draft, missing, malformed and another store's are null", async () => {
  const mine = await makeProduct(active);
  const drafted = await makeProduct(active, { status: "DRAFT" });
  const theirs = await makeProduct(otherActive);

  const found = await getStorefrontProduct(db, active, mine.id);
  assert.equal(found?.id, mine.id);
  assert.equal(found?.storeId, active);

  assert.equal(await getStorefrontProduct(db, active, drafted.id), null);
  assert.equal(await getStorefrontProduct(db, active, `missing-${uid()}`), null);
  assert.equal(await getStorefrontProduct(db, active, "not a valid id"), null);
  assert.equal(await getStorefrontProduct(db, active, theirs.id), null, "another store's product must not be visible");
  assert.equal(await getStorefrontProduct(db, draft, mine.id), null, "a non-public store shows nothing");
});

// ---------- Money, freshness, data shape ----------

test("money is exact minor units in each store's currency (AED 2 decimals, KWD 3)", async () => {
  const aed = await makeStore("ACTIVE");
  const aedProduct = await makeProduct(aed, { price: "129.50", compareAtPrice: "150.00" });
  const kwd = await makeStore("ACTIVE", { country: "KW", code: "KWD", tz: "Asia/Kuwait" });
  const kwdProduct = await makeProduct(kwd, { price: "12.345" });

  const aedCatalog = (await catalogOf(aed))!;
  const a = aedCatalog.products.find((p) => p.id === aedProduct.id)!;
  assert.equal(aedCatalog.store.currency, "AED");
  assert.equal(aedCatalog.store.minorUnits, 2);
  assert.equal(a.priceMinor, "12950");
  assert.equal(a.compareAtMinor, "15000");

  const kwdCatalog = (await catalogOf(kwd))!;
  const k = kwdCatalog.products.find((p) => p.id === kwdProduct.id)!;
  assert.equal(kwdCatalog.store.minorUnits, 3);
  assert.equal(k.priceMinor, "12345");
  assert.equal(k.compareAtMinor, null);
  assert.equal(a.deliveryFeeMinor, "0");
  assert.equal(a.freeDelivery, false);
  assert.equal(a.pickupOnly, false);
});

test("an admin price or stock change is what the next catalog read returns", async () => {
  const store = await makeStore("ACTIVE");
  const { id, categoryId } = await makeProduct(store, { price: "100.00", stock: "4" });
  const updated = await updateAdminProduct(db, store, id, {
    name: "Oak table",
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "Solid oak.",
    price: "89.00",
    compareAtPrice: "",
    imageUrl: "",
    stock: "1",
    expectedStock: "4",
    status: "ACTIVE",
    featured: false,
  });
  assert.ok(updated.ok, JSON.stringify(updated));
  const p = (await catalogOf(store))!.products.find((x) => x.id === id)!;
  assert.equal(p.priceMinor, "8900");
  assert.equal(p.stock, 1);
  assert.equal((await getStorefrontProduct(db, store, id))?.priceMinor, "8900");
});

test("only whitelisted, JSON-safe fields reach the browser", async () => {
  const store = await makeStore("ACTIVE");
  const { id } = await makeProduct(store);
  const catalog = (await catalogOf(store))!;
  assert.deepEqual(JSON.parse(JSON.stringify(catalog)), catalog, "must survive JSON (no BigInt, Date or class instances)");
  assert.deepEqual(Object.keys(catalog.store).sort(), [
    "aboutText", "accentColor", "contactAddress", "contactEmail", "contactPhone", "countryCode", "countryName",
    "currency", "direction", "heroText", "heroTitle", "id", "isDemo", "language", "locale", "logoUrl",
    "minorUnits", "name", "paymentMethods", "slug", "tagline", "templateKey", "theme",
  ]);
  assert.deepEqual(Object.keys(catalog.products[0]).sort(), [
    "categoryId", "compareAtMinor", "deliveryFeeMinor", "featured", "freeDelivery", "id", "imageUrl",
    "name", "pickupOnly", "priceMinor", "sku", "slug", "stock", "storeId",
  ]);
  assert.deepEqual(Object.keys(catalog.categories[0]).sort(), ["id", "imageUrl", "name", "productCount", "slug"]);
  const detail = (await getStorefrontProduct(db, store, id))!;
  assert.deepEqual(JSON.parse(JSON.stringify(detail)), detail);
  assert.deepEqual(
    Object.keys(detail).filter((key) => !(key in catalog.products[0])).sort(),
    ["description", "images"],
    "a product page adds only its description and images",
  );
});

// ---------- Branding, delivery, payment ----------

test("branding and content come from the store's default-language record; missing text is empty", async () => {
  const store = await makeStore("ACTIVE");
  await db.storeContentTranslation.upsert({
    where: { storeId_locale: { storeId: store, locale: "en" } },
    create: { storeId: store, locale: "en", tagline: "Calm homes", heroTitle: "Welcome", heroText: null, aboutText: null },
    update: { tagline: "Calm homes", heroTitle: "Welcome", heroText: null, aboutText: null },
  });
  const catalog = (await catalogOf(store))!;
  assert.equal(catalog.store.accentColor, "#123456");
  assert.equal(catalog.store.tagline, "Calm homes");
  assert.equal(catalog.store.heroText, "");
  assert.equal(catalog.store.countryName.length > 0, true);

  await db.storeContentTranslation.deleteMany({ where: { storeId: store } });
  const bare = (await catalogOf(store))!;
  assert.equal(bare.store.tagline, "");
  assert.equal(bare.store.heroTitle, "");
});

test("product delivery choices and enabled payment methods are returned to the storefront", async () => {
  const store = await makeStore("ACTIVE");
  await makeProduct(store, { deliveryFee: "25.00" });
  await makeProduct(store, { freeDelivery: true, deliveryFee: "0" });
  await makeProduct(store, { pickupOnly: true, deliveryFee: "0" });
  // createAdminStore() gives every new store all payment-method rows,
  // with only cash on delivery enabled.
  const none = (await catalogOf(store))!;
  assert.deepEqual(none.store.paymentMethods, ["cash_on_delivery"]);

  // Enable pay-on-pickup and put it first; card on delivery stays disabled.
  // (Bank transfer is only offered once its bank details are configured.)
  const setMethod = (method: string, data: { enabled?: boolean; position?: number }) =>
    db.storePaymentMethod.upsert({
      where: { storeId_method: { storeId: store, method } },
      create: { storeId: store, method, enabled: false, position: 9, ...data },
      update: data,
    });
  await setMethod("cash_on_pickup", { enabled: true, position: 0 });
  await setMethod("cash_on_delivery", { position: 1 });
  await setMethod("card_on_delivery", { enabled: false, position: 2 });
  await setMethod("bank_transfer", { enabled: true, position: 3 });
  const configured = (await catalogOf(store))!;
  assert.deepEqual(configured.store.paymentMethods, ["cash_on_pickup", "cash_on_delivery"], "enabled and usable only, in position order");
  assert.deepEqual(
    configured.products.map(({ deliveryFeeMinor, freeDelivery, pickupOnly }) => ({ deliveryFeeMinor, freeDelivery, pickupOnly })),
    // Newest first.
    [
      { deliveryFeeMinor: "0", freeDelivery: false, pickupOnly: true },
      { deliveryFeeMinor: "0", freeDelivery: true, pickupOnly: false },
      { deliveryFeeMinor: "2500", freeDelivery: false, pickupOnly: false },
    ],
  );
});

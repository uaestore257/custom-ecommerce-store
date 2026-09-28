// Public storefront reads (lib/server/storefront/catalog.ts): which store
// is shown, which products are public, and what reaches the browser.
// Every store here is created fresh, so nothing depends on seeded data.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { createAdminProduct, updateAdminProduct } from "../../lib/server/admin/products";
import { archiveAdminStore, createAdminStore, setAdminStoreStatus } from "../../lib/server/admin/stores";
import {
  getStorefrontCatalog,
  getStorefrontProduct,
  listStorefrontStores,
  resolveStorefrontStoreId,
} from "../../lib/server/storefront/catalog";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

type Status = "ACTIVE" | "DRAFT" | "PAUSED";

async function makeStore(status: Status, currency = { country: "AE", code: "AED", tz: "Asia/Dubai" }) {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Storefront ${status} ${uid()}`,
    slug: `storefront-${status.toLowerCase()}-${uid()}`,
    businessType: "furniture",
    status,
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
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

test("the public store switcher lists only ACTIVE, non-archived stores", async () => {
  const ids = (await listStorefrontStores(db)).map((s) => s.id);
  assert.ok(ids.includes(active) && ids.includes(otherActive));
  for (const hidden of [draft, paused, suspended, archived]) assert.ok(!ids.includes(hidden), hidden);
  for (const option of await listStorefrontStores(db)) assert.deepEqual(Object.keys(option).sort(), ["id", "name"]);
});

// ---------- Catalog contents ----------

test("the catalog of a non-public store is null (defence in depth)", async () => {
  for (const id of [draft, paused, suspended, archived, `missing-${uid()}`]) {
    assert.equal(await getStorefrontCatalog(db, id), null, id);
  }
});

test("only ACTIVE products are listed; draft and archived ones are not", async () => {
  const store = await makeStore("ACTIVE");
  const shown = await makeProduct(store);
  const drafted = await makeProduct(store, { status: "DRAFT" });
  const archivedProduct = await makeProduct(store, { status: "ARCHIVED" });
  const catalog = (await getStorefrontCatalog(db, store))!;
  const ids = catalog.products.map((p) => p.id);
  assert.ok(ids.includes(shown.id));
  assert.ok(!ids.includes(drafted.id));
  assert.ok(!ids.includes(archivedProduct.id));
});

test("categories belong to the store and come in position order", async () => {
  const catalog = (await getStorefrontCatalog(db, active))!;
  const expected = await db.category.findMany({ where: { storeId: active }, orderBy: { position: "asc" }, select: { id: true } });
  assert.deepEqual(catalog.categories.map((c) => c.id), expected.map((c) => c.id));
  const otherIds = new Set((await getStorefrontCatalog(db, otherActive))!.categories.map((c) => c.id));
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

  const aedCatalog = (await getStorefrontCatalog(db, aed))!;
  const a = aedCatalog.products.find((p) => p.id === aedProduct.id)!;
  assert.equal(aedCatalog.store.currency, "AED");
  assert.equal(aedCatalog.store.minorUnits, 2);
  assert.equal(a.priceMinor, "12950");
  assert.equal(a.compareAtMinor, "15000");

  const kwdCatalog = (await getStorefrontCatalog(db, kwd))!;
  const k = kwdCatalog.products.find((p) => p.id === kwdProduct.id)!;
  assert.equal(kwdCatalog.store.minorUnits, 3);
  assert.equal(k.priceMinor, "12345");
  assert.equal(k.compareAtMinor, null);
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
    status: "ACTIVE",
    featured: false,
  });
  assert.ok(updated.ok, JSON.stringify(updated));
  const p = (await getStorefrontCatalog(db, store))!.products.find((x) => x.id === id)!;
  assert.equal(p.priceMinor, "8900");
  assert.equal(p.stock, 1);
  assert.equal((await getStorefrontProduct(db, store, id))?.priceMinor, "8900");
});

test("only whitelisted, JSON-safe fields reach the browser", async () => {
  const store = await makeStore("ACTIVE");
  await makeProduct(store);
  const catalog = (await getStorefrontCatalog(db, store))!;
  assert.deepEqual(JSON.parse(JSON.stringify(catalog)), catalog, "must survive JSON (no BigInt, Date or class instances)");
  assert.deepEqual(Object.keys(catalog.store).sort(), [
    "aboutText", "accentColor", "contactAddress", "contactEmail", "contactPhone", "countryCode", "countryName",
    "currency", "deliveryFeeMinor", "freeDeliveryOverMinor", "heroText", "heroTitle", "id", "locale", "logoUrl",
    "minorUnits", "name", "paymentMethods", "tagline",
  ]);
  assert.deepEqual(Object.keys(catalog.products[0]).sort(), [
    "categoryId", "compareAtMinor", "description", "featured", "id", "imageUrl", "name", "priceMinor", "sku", "stock", "storeId",
  ]);
  assert.deepEqual(Object.keys(catalog.categories[0]).sort(), ["id", "imageUrl", "name"]);
});

// ---------- Branding, delivery, payment ----------

test("branding and content come from the store's default-language record; missing text is empty", async () => {
  const store = await makeStore("ACTIVE");
  await db.storeContentTranslation.upsert({
    where: { storeId_locale: { storeId: store, locale: "en" } },
    create: { storeId: store, locale: "en", tagline: "Calm homes", heroTitle: "Welcome", heroText: null, aboutText: null },
    update: { tagline: "Calm homes", heroTitle: "Welcome", heroText: null, aboutText: null },
  });
  const catalog = (await getStorefrontCatalog(db, store))!;
  assert.equal(catalog.store.accentColor, "#123456");
  assert.equal(catalog.store.tagline, "Calm homes");
  assert.equal(catalog.store.heroText, "");
  assert.equal(catalog.store.countryName.length > 0, true);

  await db.storeContentTranslation.deleteMany({ where: { storeId: store } });
  const bare = (await getStorefrontCatalog(db, store))!;
  assert.equal(bare.store.tagline, "");
  assert.equal(bare.store.heroTitle, "");
});

test("delivery and payment settings: none configured means null, configured values are exact", async () => {
  const store = await makeStore("ACTIVE");
  const none = (await getStorefrontCatalog(db, store))!;
  assert.equal(none.store.deliveryFeeMinor, null, "a new store has no delivery rate yet");
  assert.equal(none.store.freeDeliveryOverMinor, null);
  // createAdminStore() gives every new store all payment-method rows,
  // with only cash on delivery enabled.
  assert.deepEqual(none.store.paymentMethods, ["cash_on_delivery"]);

  const zone = await db.shippingZone.create({ data: { storeId: store, name: "Domestic" } });
  await db.shippingRate.create({
    data: { storeId: store, zoneId: zone.id, name: "Standard", priceMinor: BigInt(2500), freeOverMinor: BigInt(50000), currency: "AED" },
  });
  // Enable bank transfer and put it first; card on delivery stays disabled.
  const setMethod = (method: string, data: { enabled?: boolean; position?: number }) =>
    db.storePaymentMethod.update({ where: { storeId_method: { storeId: store, method } }, data });
  await setMethod("bank_transfer", { enabled: true, position: 0 });
  await setMethod("cash_on_delivery", { position: 1 });
  await setMethod("card_on_delivery", { enabled: false, position: 2 });
  const configured = (await getStorefrontCatalog(db, store))!;
  assert.equal(configured.store.deliveryFeeMinor, "2500");
  assert.equal(configured.store.freeDeliveryOverMinor, "50000");
  assert.deepEqual(configured.store.paymentMethods, ["bank_transfer", "cash_on_delivery"], "enabled only, in position order");
});

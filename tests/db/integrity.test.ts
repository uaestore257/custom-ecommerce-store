// Data integrity rules, the server-side access layer, and international
// (non-UAE) stores.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { formatMinorUnits } from "../../lib/money";
import { archiveStore, listStores, restoreStore, storeScope } from "../../lib/server/store-scope";
import { storeFormatLocale } from "../../lib/standards";
import { rejects, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

/** Creates a store in any country/currency/language — nothing is assumed. */
async function createStore(o: { country: string; currency: string; timezone: string; languages: string[]; default: string }) {
  const id = `st-${uid()}`;
  await db.store.create({
    data: {
      id,
      slug: id,
      name: `Test ${o.country}`,
      countryCode: o.country,
      baseCurrency: o.currency,
      timezone: o.timezone,
      defaultLanguage: o.default,
      languages: { create: o.languages.map((languageCode) => ({ languageCode })) },
    },
  });
  return id;
}

// ---------- Default variants ----------

test("a product without a default variant is rejected at commit", async () => {
  await rejects(() => db.product.create({ data: { storeId: "store-a" } }), /must have a default variant/);
});

test("createProduct() always creates exactly one default variant in the store's currency", async () => {
  const p = await storeScope(db, "store-a").createProduct({
    translations: [{ locale: "en", name: "Oak Stool", slug: `oak-stool-${uid()}` }],
    defaultVariant: { sku: `OAK-${uid()}`, price: "349.50", compareAtPrice: "399", stock: 7 },
  });
  assert.equal(p.variants.length, 1);
  const [v] = p.variants;
  assert.equal(v.isDefault, true);
  assert.equal(v.currency, "AED");
  assert.equal(v.priceMinor, 34950n);
  assert.equal(v.compareAtMinor, 39900n);
});

test("a product can have more variants later, but only ONE default", async () => {
  const p = await storeScope(db, "store-a").createProduct({
    translations: [{ locale: "en", name: "Shirt", slug: `shirt-${uid()}` }],
    defaultVariant: { sku: `SH-${uid()}`, price: "50", stock: 1 },
  });
  // A second, non-default variant (e.g. size "Large") is fine.
  await db.productVariant.create({
    data: { storeId: "store-a", productId: p.id, sku: `SH-L-${uid()}`, title: "Large", position: 1, currency: "AED", priceMinor: 5500n },
  });
  // A second default is not.
  await rejects(
    () => db.productVariant.create({ data: { storeId: "store-a", productId: p.id, sku: `SH-X-${uid()}`, isDefault: true, currency: "AED", priceMinor: 1n } }),
    /one_default_per_product|Unique constraint/,
  );
  // The default variant cannot be deleted while the product exists...
  await rejects(() => db.productVariant.delete({ where: { id: p.variants[0].id } }), /must have a default variant/);
  // ...but deleting the whole product removes its variants too.
  await db.product.delete({ where: { id: p.id } });
  assert.equal(await db.productVariant.count({ where: { productId: p.id } }), 0);
});

// ---------- Store languages ----------

test("a store's default language must be one of its enabled languages", async () => {
  await rejects(
    () => createStore({ country: "FR", currency: "EUR", timezone: "Europe/Paris", languages: ["en"], default: "fr" }),
    /default language must be an enabled store language/,
  );
  const id = await createStore({ country: "FR", currency: "EUR", timezone: "Europe/Paris", languages: ["fr", "en"], default: "fr" });
  await rejects(
    () => db.storeLanguage.update({ where: { storeId_languageCode: { storeId: id, languageCode: "fr" } }, data: { enabled: false } }),
    /default language must be an enabled store language/,
  );
});

// ---------- CHECK constraints ----------

test("negative prices and stock are rejected by the database", async () => {
  const productId = (await db.productVariant.findFirstOrThrow({ where: { storeId: "store-a" } })).productId;
  await rejects(() => db.productVariant.create({ data: { storeId: "store-a", productId, sku: `N-${uid()}`, currency: "AED", priceMinor: -1n } }), /price_nonneg|check/i);
  await rejects(() => db.productVariant.create({ data: { storeId: "store-a", productId, sku: `N-${uid()}`, currency: "AED", priceMinor: 1n, stock: -1 } }), /stock_nonneg|check/i);
});

test("codes and formats are checked by the database", async () => {
  await rejects(() => db.currency.create({ data: { code: "usd", name: "x", minorUnits: 2 } }), /code_iso4217|check/i);
  await rejects(() => db.currency.create({ data: { code: "XXZ", name: "x", minorUnits: 9 } }), /minor_units|check/i);
  await rejects(() => db.country.create({ data: { code: "UAE", name: "x" } }), /code_iso3166|check|too long/i);
  await rejects(() => db.store.update({ where: { id: "store-b" }, data: { contactPhone: "050 000 0000" } }), /phone_e164|check/i);
  await rejects(() => db.store.update({ where: { id: "store-b" }, data: { slug: "Bad Slug" } }), /slug_format|check/i);
});

// ---------- Customers are separate per store ----------

test("the same email is a separate customer in each store", async () => {
  const email = `shared-${uid()}@example.com`;
  await db.customer.create({ data: { storeId: "store-a", email, name: "Shared" } });
  await db.customer.create({ data: { storeId: "store-b", email, name: "Shared" } });
  await rejects(() => db.customer.create({ data: { storeId: "store-a", email, name: "Again" } }), /Unique constraint|unique/i);
  await rejects(() => db.customer.create({ data: { storeId: "store-a", email: "Upper@Example.com", name: "x" } }), /email_lowercase|check/i);
});

// ---------- Per-store order numbers ----------

test("order numbers are a per-store sequence, safe under concurrency", async () => {
  const allocate = (storeId: string) =>
    db.$transaction((tx) => storeScope(tx, storeId).allocateOrderNumber(tx));
  const results = await Promise.all(Array.from({ length: 10 }, () => allocate("store-b")));
  const numbers = results.map((r) => r.number).sort((a, b) => a - b);
  assert.equal(new Set(numbers).size, 10, "no duplicates");
  assert.deepEqual(numbers, Array.from({ length: 10 }, (_, i) => numbers[0] + i), "consecutive");
  assert.match(results[0].display, /^TL-\d+$/);
  // Store C's sequence is independent of store B's.
  const c = await allocate("store-c");
  assert.equal(c.number, 1001);
  assert.equal(c.display, "VE-1001");
});

// ---------- Soft delete ----------

test("archived stores are hidden but fully recoverable", async () => {
  const before = await db.product.count({ where: { storeId: "store-c" } });
  await archiveStore(db, "store-c");
  assert.ok(!(await listStores(db)).some((s) => s.id === "store-c"));
  assert.ok((await listStores(db, { includeArchived: true })).some((s) => s.id === "store-c"));
  assert.equal(await storeScope(db, "store-c").getStore(), null);
  await restoreStore(db, "store-c");
  assert.ok((await listStores(db)).some((s) => s.id === "store-c"));
  assert.equal(await db.product.count({ where: { storeId: "store-c" } }), before, "no data lost");
});

// ---------- Server-side scoping ----------

test("storeScope() never returns another store's records", async () => {
  const a = storeScope(db, "store-a");
  assert.equal(await a.getProduct("fas-001", "en"), null, "store B's product is invisible to store A");
  const products = await a.listProducts({ locale: "en" });
  assert.ok(products.length >= 8);
  assert.ok(products.every((p) => p.storeId === "store-a"));
  assert.ok(products.every((p) => p.variants.every((v) => v.storeId === "store-a")));
});

test("missing translations fall back to the store's default language", async () => {
  // Store A enables Arabic but has no Arabic product text yet.
  const p = await storeScope(db, "store-a").getProduct("fur-001", "ar");
  assert.equal(p?.translation?.locale, "en");
  assert.equal(p?.translation?.name, "Oakline 3-Seater Sofa");
});

// ---------- International stores: no UAE assumptions ----------

test("stores in any country use their own currency, timezone and languages", async () => {
  const kw = await createStore({ country: "KW", currency: "KWD", timezone: "Asia/Kuwait", languages: ["ar", "en"], default: "ar" });
  const us = await createStore({ country: "US", currency: "USD", timezone: "America/New_York", languages: ["en"], default: "en" });
  const jp = await createStore({ country: "JP", currency: "JPY", timezone: "Asia/Tokyo", languages: ["ja", "en"], default: "ja" });

  const kwProduct = await storeScope(db, kw).createProduct({
    translations: [{ locale: "ar", name: "فانوس", slug: `lantern-${uid()}` }],
    defaultVariant: { sku: `KW-${uid()}`, price: "12.345", stock: 3 },
  });
  assert.equal(kwProduct.variants[0].priceMinor, 12345n, "KWD has 3 minor units");
  assert.equal(kwProduct.variants[0].currency, "KWD");

  const jpProduct = await storeScope(db, jp).createProduct({
    translations: [{ locale: "ja", name: "茶碗", slug: `bowl-${uid()}` }],
    defaultVariant: { sku: `JP-${uid()}`, price: "1500", stock: 3 },
  });
  assert.equal(jpProduct.variants[0].priceMinor, 1500n, "JPY has 0 minor units");
  await assert.rejects(
    () => storeScope(db, jp).createProduct({
      translations: [{ locale: "ja", name: "x", slug: `x-${uid()}` }],
      defaultVariant: { sku: `JP-${uid()}`, price: "1500.5", stock: 1 },
    }),
    /decimal place/,
  );

  const usStore = await db.store.findUniqueOrThrow({ where: { id: us }, include: { currency: true } });
  const usProduct = await storeScope(db, us).createProduct({
    translations: [{ locale: "en", name: "Desk lamp", slug: `lamp-${uid()}` }],
    defaultVariant: { sku: `US-${uid()}`, price: "39.99", stock: 3 },
  });
  const locale = storeFormatLocale(usStore);
  assert.equal(locale, "en-US");
  assert.equal(
    formatMinorUnits(usProduct.variants[0].priceMinor, usStore.baseCurrency, usStore.currency.minorUnits, locale),
    "$39.99",
  );
});

test("no column defaults to a UAE country, currency or language", async () => {
  const rows = await db.$queryRaw<{ table_name: string; column_name: string; column_default: string }[]>`
    SELECT table_name, column_name, column_default FROM information_schema.columns
    WHERE table_schema = 'public' AND column_default IS NOT NULL
      AND (column_default ILIKE '%AE%' OR column_default ILIKE '%AED%' OR column_default ILIKE '%''ar''%'
           OR column_default ILIKE '%Dubai%' OR column_default ILIKE '%''en''%')`;
  assert.deepEqual(rows, [], `unexpected defaults: ${JSON.stringify(rows)}`);
  // A store cannot be created without choosing its own country, currency,
  // timezone and language — nothing is filled in for it.
  await rejects(() => db.store.create({ data: { slug: `nodefaults-${uid()}`, name: "x" } as never }), /Argument|missing|required/i);
});

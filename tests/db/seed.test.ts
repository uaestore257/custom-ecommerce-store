// The seed maps the browser demo data (lib/demo-data.ts) correctly.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createSeedState } from "../../lib/demo-data";
import { testDb } from "./helpers";

const db = testDb();
after(() => db.$disconnect());
const demo = createSeedState();

test("demo stores keep their own country, currency, timezone and languages", async () => {
  const stores = await db.store.findMany({
    where: { id: { in: ["store-a", "store-b", "store-c"] } },
    include: { languages: true },
    orderBy: { id: "asc" },
  });
  const summary = stores.map((s) => ({
    id: s.id,
    country: s.countryCode,
    currency: s.baseCurrency,
    timezone: s.timezone,
    defaultLanguage: s.defaultLanguage,
    languages: s.languages.map((l) => l.languageCode).sort(),
  }));
  assert.deepEqual(summary, [
    { id: "store-a", country: "AE", currency: "AED", timezone: "Asia/Dubai", defaultLanguage: "en", languages: ["ar", "en"] },
    { id: "store-b", country: "AE", currency: "AED", timezone: "Asia/Dubai", defaultLanguage: "en", languages: ["en"] },
    { id: "store-c", country: "SA", currency: "SAR", timezone: "Asia/Riyadh", defaultLanguage: "en", languages: ["en"] },
  ]);
});

test("Arabic is enabled for store A but nothing was auto-translated", async () => {
  // (Other tests may add Arabic content later; the seed itself adds none.)
  const seededArabicProducts = await db.productTranslation.count({ where: { storeId: "store-a", locale: "ar", productId: { startsWith: "fur-" } } });
  assert.equal(seededArabicProducts, 0);
});

test("every demo product became a product with exactly one default variant", async () => {
  for (const store of demo.stores) {
    for (const p of demo.storeData[store.id].products) {
      const variants = await db.productVariant.findMany({ where: { productId: p.id } });
      assert.equal(variants.length, 1, `${p.id} has one variant`);
      const [v] = variants;
      assert.equal(v.isDefault, true);
      assert.equal(v.storeId, store.id);
      assert.equal(v.sku, p.sku);
      assert.equal(v.stock, p.stock);
      assert.equal(v.currency, store.settings.currency);
      assert.equal(v.priceMinor, BigInt(Math.round(p.price * 100)), `${p.id} price`);
      const expectedCompare =
        p.compareAtPrice && p.compareAtPrice > p.price ? BigInt(Math.round(p.compareAtPrice * 100)) : null;
      assert.equal(v.compareAtMinor, expectedCompare, `${p.id} compare-at`);
    }
  }
});

test("price mapping examples", async () => {
  const sofa = await db.productVariant.findUniqueOrThrow({ where: { id: "fur-001-default" } });
  assert.deepEqual(
    { price: sofa.priceMinor, compareAt: sofa.compareAtMinor, currency: sofa.currency, stock: sofa.stock },
    { price: 249900n, compareAt: 299900n, currency: "AED", stock: 6 }, // AED 2,499.00 (was 2,999.00)
  );
  const bed = await db.productVariant.findUniqueOrThrow({ where: { id: "fur-003-default" } });
  assert.equal(bed.compareAtMinor, null, "not on sale");
  const draft = await db.product.findUniqueOrThrow({ where: { id: "fas-004" } });
  assert.equal(draft.status, "DRAFT");
});

test("names and categories became English translations", async () => {
  const t = await db.productTranslation.findUniqueOrThrow({ where: { productId_locale: { productId: "fur-001", locale: "en" } } });
  assert.equal(t.name, "Oakline 3-Seater Sofa");
  assert.equal(t.slug, "oakline-3-seater-sofa");
  const c = await db.categoryTranslation.findMany({ where: { storeId: "store-a", locale: "en" }, orderBy: { name: "asc" } });
  assert.deepEqual(c.map((x) => x.name), ["Bedroom", "Living Room", "Office", "Storage"]);
});

test("customers and orders stay in their own store, with per-store numbers", async () => {
  assert.equal(await db.customer.count({ where: { storeId: "store-a", id: { startsWith: "store-a-cus" } } }), 3);
  assert.equal(await db.customer.count({ where: { storeId: "store-b", id: { startsWith: "store-b-cus" } } }), 2);
  const order = await db.order.findUniqueOrThrow({ where: { storeId_number: { storeId: "store-a", number: 1001 } }, include: { items: true } });
  assert.equal(order.id, "store-a-ord-1001");
  assert.equal(order.currency, "AED");
  assert.equal(order.subtotalMinor, 60700n); // 449 + 2 x 79
  assert.equal(order.shippingMinor, 3000n);
  assert.equal(order.totalMinor, 63700n);
  assert.equal(order.items.length, 2);
  assert.ok(order.items.every((i) => i.storeId === "store-a" && i.currency === "AED"));
  const storeA = await db.store.findUniqueOrThrow({ where: { id: "store-a" } });
  assert.equal(storeA.orderNumberPrefix, "NO");
});

test("delivery and payment settings became per-store configuration rows", async () => {
  const rate = await db.shippingRate.findFirstOrThrow({ where: { storeId: "store-a" }, include: { zone: { include: { countries: true } } } });
  assert.equal(rate.priceMinor, 3000n);
  assert.equal(rate.freeOverMinor, 75000n);
  assert.equal(rate.currency, "AED");
  assert.deepEqual(rate.zone.countries.map((c) => c.countryCode), ["AE"]);
  const methods = await db.storePaymentMethod.findMany({ where: { storeId: "store-a" }, orderBy: { position: "asc" } });
  assert.deepEqual(methods.map((m) => [m.method, m.enabled]), [
    ["cash_on_delivery", true],
    ["card_on_delivery", true],
    ["bank_transfer", false],
    ["online_card", false],
  ]);
  assert.equal(await db.paymentProviderAccount.count({ where: { storeId: "store-a" } }), 0, "no provider connected");
});

test("platform settings hold no commercial defaults", async () => {
  const settings = await db.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  assert.deepEqual(Object.keys(settings).sort(), ["contactEmail", "id", "platformName", "updatedAt"]);
});

test("reference data includes 0-, 2- and 3-decimal currencies and RTL languages", async () => {
  const cur = await db.currency.findMany({ where: { code: { in: ["JPY", "USD", "KWD", "BHD", "OMR"] } } });
  assert.deepEqual(Object.fromEntries(cur.map((c) => [c.code, c.minorUnits])), { BHD: 3, JPY: 0, KWD: 3, OMR: 3, USD: 2 });
  const ar = await db.language.findUniqueOrThrow({ where: { code: "ar" } });
  assert.equal(ar.direction, "RTL");
  assert.ok((await db.country.count()) > 50);
});

test("roles: a platform owner, and store owners who only own their store", async () => {
  assert.equal(await db.user.count({ where: { isPlatformOwner: true } }), 1);
  const owners = await db.storeMembership.findMany({ where: { role: "OWNER" }, include: { user: true } });
  assert.equal(owners.length, 3);
  assert.ok(owners.every((m) => !m.user.isPlatformOwner));
});

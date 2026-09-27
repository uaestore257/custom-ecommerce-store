// Admin store workflows backed by PostgreSQL (lib/server/admin/stores.ts).
import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  archiveAdminStore,
  createAdminStore,
  getAdminStore,
  getAdminStoreDetail,
  listAdminStores,
  restoreAdminStore,
  setAdminStoreStatus,
  updateAdminStore,
} from "../../lib/server/admin/stores";
import { testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

const newStore = (overrides: Record<string, unknown> = {}) => ({
  name: "Maple & Co",
  slug: `maple-${uid()}`,
  businessType: "furniture",
  status: "DRAFT",
  ownerName: "Jamie Lee",
  ownerEmail: `jamie-${uid()}@example.com`,
  countryCode: "US",
  baseCurrency: "USD",
  timezone: "America/New_York",
  defaultLanguage: "en",
  languages: ["en"],
  accentColor: "#1d4ed8",
  ...overrides,
});

/** A full settings payload based on the store's current detail. */
async function settingsFor(storeId: string, overrides: Record<string, unknown> = {}) {
  const d = (await getAdminStoreDetail(db, storeId))!;
  return {
    name: d.name, slug: d.slug, businessType: d.businessType, status: d.status,
    ownerName: d.ownerName, ownerEmail: d.ownerEmail, countryCode: d.countryCode,
    baseCurrency: d.baseCurrency, timezone: d.timezone, defaultLanguage: d.defaultLanguage,
    languages: d.languages, accentColor: d.accentColor ?? "#0f766e", logoUrl: d.logoUrl ?? "",
    contactEmail: d.contactEmail, contactPhone: d.contactPhone, contactAddress: d.contactAddress,
    tagline: d.content.tagline, heroTitle: d.content.heroTitle || "Welcome", heroText: d.content.heroText,
    aboutText: d.content.aboutText, deliveryFee: d.delivery.fee || "0", freeDeliveryThreshold: d.delivery.freeOver,
    paymentMethods: Object.fromEntries(d.paymentMethods.map((m) => [m.method, m.enabled])),
    ...overrides,
  };
}

test("store list reads from the database", async () => {
  const stores = await listAdminStores(db);
  const ids = stores.map((s) => s.id);
  for (const id of ["store-a", "store-b", "store-c"]) assert.ok(ids.includes(id), id);
  const a = stores.find((s) => s.id === "store-a")!;
  assert.equal(a.name, "Nest & Oak Home");
  assert.equal(a.baseCurrency, "AED");
  assert.equal(a.letterLabel, "Client Store A");
  assert.ok(a.productCount >= 8);
});

test("store detail returns the requested store", async () => {
  const d = await getAdminStoreDetail(db, "store-c");
  assert.ok(d);
  assert.equal(d.id, "store-c");
  assert.equal(d.countryCode, "SA");
  assert.equal(d.baseCurrency, "SAR");
  assert.equal(d.timezone, "Asia/Riyadh");
  assert.equal(d.ownerEmail, "khalid@voltbox.example");
  assert.equal(d.hasPrices, true);
});

test("a missing store returns null", async () => {
  assert.equal(await getAdminStore(db, "no-such-store"), null);
  assert.equal(await getAdminStoreDetail(db, "no-such-store"), null);
  const result = await updateAdminStore(db, "no-such-store", {});
  assert.equal(result.ok, false);
});

test("creating a store persists valid data (international, no UAE defaults)", async () => {
  const input = newStore();
  const result = await createAdminStore(db, input);
  assert.ok(result.ok, JSON.stringify(result));
  const store = await db.store.findUniqueOrThrow({
    where: { id: result.data.id },
    include: { languages: true, memberships: { include: { user: true } }, categories: { include: { translations: true } } },
  });
  assert.equal(store.name, "Maple & Co");
  assert.equal(store.countryCode, "US");
  assert.equal(store.baseCurrency, "USD");
  assert.equal(store.timezone, "America/New_York");
  assert.equal(store.status, "DRAFT");
  assert.deepEqual(store.languages.map((l) => l.languageCode), ["en"]);
  assert.equal(store.memberships.length, 1);
  assert.equal(store.memberships[0].role, "OWNER");
  assert.equal(store.memberships[0].user.email, input.ownerEmail);
  // Starter categories for the store type, like the demo.
  assert.deepEqual(store.categories.map((c) => c.translations[0].name).sort(), ["Bedroom", "Living Room", "Storage"]);
  assert.equal((await listAdminStores(db)).some((s) => s.id === store.id), true);
});

test("store creation rejects invalid input on the server", async () => {
  const result = await createAdminStore(db, newStore({
    name: "",
    slug: "Bad Slug",
    ownerEmail: "not-an-email",
    countryCode: "ZZ",
    baseCurrency: "XXX",
    timezone: "Mars/Olympus",
    languages: ["en"],
    defaultLanguage: "ar", // not among the store's languages
    accentColor: "teal",
    status: "LIVE",
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  for (const field of ["name", "slug", "ownerEmail", "countryCode", "baseCurrency", "timezone", "defaultLanguage", "accentColor", "status"]) {
    assert.ok(result.fieldErrors?.[field], `expected an error for ${field}`);
  }
});

test("a duplicate slug is rejected", async () => {
  const result = await createAdminStore(db, newStore({ slug: "nest-and-oak" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.fieldErrors?.slug ?? "", /already uses this slug/);
});

test("updating a store persists supported changes", async () => {
  const created = await createAdminStore(db, newStore());
  assert.ok(created.ok);
  const id = created.data.id;
  const result = await updateAdminStore(db, id, await settingsFor(id, {
    name: "Maple & Co Home",
    status: "ACTIVE",
    languages: ["en", "ar"],
    contactPhone: "+1 (415) 555-0123",
    tagline: "Furniture for every room",
    deliveryFee: "12.50",
    freeDeliveryThreshold: "200",
    paymentMethods: { cash_on_delivery: true, bank_transfer: true, online_card: true },
  }));
  assert.ok(result.ok, JSON.stringify(result));
  const d = (await getAdminStoreDetail(db, id))!;
  assert.equal(d.name, "Maple & Co Home");
  assert.equal(d.status, "ACTIVE");
  assert.deepEqual([...d.languages].sort(), ["ar", "en"]);
  assert.equal(d.contactPhone, "+14155550123");
  assert.equal(d.content.tagline, "Furniture for every room");
  assert.equal(d.delivery.fee, "12.50");
  assert.equal(d.delivery.freeOver, "200.00");
  const methods = Object.fromEntries(d.paymentMethods.map((m) => [m.method, m.enabled]));
  assert.equal(methods.bank_transfer, true);
  assert.equal(methods.online_card, false, "online card stays off: no payment provider");
});

test("the currency can't change once prices exist", async () => {
  const result = await updateAdminStore(db, "store-b", await settingsFor("store-b", { baseCurrency: "USD" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.fieldErrors?.baseCurrency ?? "", /can't change/);
  assert.equal((await getAdminStoreDetail(db, "store-b"))!.baseCurrency, "AED");
});

test("status changes, archive and restore", async () => {
  const created = await createAdminStore(db, newStore());
  assert.ok(created.ok);
  const id = created.data.id;
  assert.ok((await setAdminStoreStatus(db, id, "PAUSED")).ok);
  assert.equal((await getAdminStore(db, id))!.status, "PAUSED");
  assert.equal((await setAdminStoreStatus(db, id, "DELETED")).ok, false);

  assert.ok((await archiveAdminStore(db, id)).ok);
  assert.equal(await getAdminStore(db, id), null, "archived stores are hidden");
  assert.ok((await listAdminStores(db, { includeArchived: true })).some((s) => s.id === id));
  assert.ok((await restoreAdminStore(db, id)).ok);
  assert.ok(await getAdminStore(db, id));
});

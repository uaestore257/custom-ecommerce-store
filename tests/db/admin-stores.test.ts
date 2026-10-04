// Admin store workflows backed by PostgreSQL (lib/server/admin/stores.ts).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  archiveAdminStore,
  createAdminStore,
  getAdminStore,
  getAdminStoreDetail,
  listAdminStores,
  restoreAdminStore,
  setAdminStoreStatus,
  updateAdminStore,
  updateStoreOwnerSettings,
} from "../../lib/server/admin/stores";
import type { PlatformOwner } from "../../lib/server/auth/guards";
import { getAuth } from "../../lib/server/auth/auth";
import { AccessDenied, requireStoreAccess } from "../../lib/server/auth/guards";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import { actAs, authRequest, cookieHeader, setTestAuthEnv } from "./auth-helpers";
import { testActor, testDb, uid } from "./helpers";

setTestAuthEnv();
const db = testDb();
let actor: PlatformOwner;
before(async () => {
  actor = await testActor(db);
});
after(async () => {
  setRequestRuntimeForTests(null);
  await db.$disconnect();
});

const newStore = (overrides: Record<string, unknown> = {}) => ({
  name: "Maple & Co",
  slug: `maple-${uid()}`,
  businessType: "furniture",
  status: "DRAFT",
  ownerName: "Jamie Lee",
  ownerEmail: `jamie-${uid()}@example.com`,
  ownerPassword: "a store owner passphrase 2026",
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
    aboutText: d.content.aboutText,
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
  const result = await updateAdminStore(actor, db, "no-such-store", {});
  assert.equal(result.ok, false);
});

test("creating a store persists valid data (international, no UAE defaults)", async () => {
  const input = newStore();
  const result = await createAdminStore(actor, db, input);
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
  const account = await db.account.findUniqueOrThrow({
    where: { providerId_accountId: { providerId: "credential", accountId: store.memberships[0].userId } },
  });
  assert.ok(account.password);
  assert.notEqual(account.password, input.ownerPassword);
  const authContext = await getAuth().$context;
  assert.equal(await authContext.password.verify({ hash: account.password!, password: input.ownerPassword }), true);
  await db.rateLimit.deleteMany();
  const ownerHost = `admin.${input.slug}.test.local`; // the store's dedicated admin host
  const response = await authRequest(
    "/sign-in/email",
    { email: input.ownerEmail, password: input.ownerPassword },
    { host: ownerHost },
  );
  assert.equal(response.status, 200, "new owner can sign in immediately on the new store host");
  actAs(cookieHeader(response), ownerHost);
  assert.equal((await requireStoreAccess(store.id)).access, "write");
  await assert.rejects(
    requireStoreAccess("store-a"),
    (error: unknown) => error instanceof AccessDenied && error.reason === "forbidden",
  );
  setRequestRuntimeForTests(null);
  // Starter categories for the store type, like the demo.
  assert.deepEqual(store.categories.map((c) => c.translations[0].name).sort(), ["Bedroom", "Living Room", "Storage"]);
  assert.equal((await listAdminStores(db)).some((s) => s.id === store.id), true);
});

test("store creation rejects invalid input on the server", async () => {
  const result = await createAdminStore(actor, db, newStore({
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
  const result = await createAdminStore(actor, db, newStore({ slug: "nest-and-oak" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.fieldErrors?.slug ?? "", /already uses this slug/);
});

test("updating a store persists supported changes", async () => {
  const created = await createAdminStore(actor, db, newStore());
  assert.ok(created.ok);
  const id = created.data.id;
  const result = await updateAdminStore(actor, db, id, await settingsFor(id, {
    name: "Maple & Co Home",
    status: "ACTIVE", // ignored: status has its own platform-only action
    ownerEmail: "someone-else@example.com", // ignored: owner has its own action
    languages: ["en", "ar"],
    contactPhone: "+1 (415) 555-0123",
    tagline: "Furniture for every room",
    // Every offline method is an explicit choice; online card is forced off.
    paymentMethods: { cash_on_delivery: true, card_on_delivery: false, bank_transfer: true, online_card: true },
  }));
  assert.ok(result.ok, JSON.stringify(result));
  const d = (await getAdminStoreDetail(db, id))!;
  assert.equal(d.name, "Maple & Co Home");
  assert.equal(d.status, "DRAFT", "saving settings never changes the status");
  assert.notEqual(d.ownerEmail, "someone-else@example.com", "saving settings never changes the owner");
  assert.deepEqual([...d.languages].sort(), ["ar", "en"]);
  assert.equal(d.contactPhone, "+14155550123");
  assert.equal(d.content.tagline, "Furniture for every room");
  const methods = Object.fromEntries(d.paymentMethods.map((m) => [m.method, m.enabled]));
  assert.equal(methods.bank_transfer, true);
  assert.equal(methods.online_card, false, "online card stays off: no payment provider");
});

test("Store Owner settings can change payment methods only", async () => {
  const created = await createAdminStore(actor, db, newStore({ name: "Payment settings test" }));
  assert.ok(created.ok);
  if (!created.ok) return;
  const before = (await getAdminStoreDetail(db, created.data.id))!;
  const result = await updateStoreOwnerSettings(db, created.data.id, actor.userId, {
    paymentMethods: { cash_on_delivery: false, card_on_delivery: true, bank_transfer: true, online_card: true },
    // Bank transfer can only be offered with the bank details shoppers need.
    bankTransfer: { bankName: "Example Bank", accountName: "Payment Settings LLC", accountNumber: "0001234567" },
    name: "Attempted name change",
    slug: "attempted-slug",
    status: "ACTIVE",
    ownerEmail: "attacker@example.com",
    contactAddress: "Attempted profile change",
  });
  assert.ok(result.ok, JSON.stringify(result));
  const after = (await getAdminStoreDetail(db, created.data.id))!;
  assert.equal(after.name, before.name);
  assert.equal(after.slug, before.slug);
  assert.equal(after.status, before.status);
  assert.equal(after.ownerEmail, before.ownerEmail);
  assert.equal(after.contactAddress, before.contactAddress);
  const methods = Object.fromEntries(after.paymentMethods.map(({ method, enabled }) => [method, enabled]));
  assert.equal(methods.cash_on_delivery, false);
  assert.equal(methods.card_on_delivery, true);
  assert.equal(methods.bank_transfer, true);
  assert.equal(methods.online_card, false);
});

test("the currency can't change once prices exist", async () => {
  const result = await updateAdminStore(actor, db, "store-b", await settingsFor("store-b", { baseCurrency: "USD" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.fieldErrors?.baseCurrency ?? "", /can't change/);
  assert.equal((await getAdminStoreDetail(db, "store-b"))!.baseCurrency, "AED");
});

test("status changes, archive and restore", async () => {
  const created = await createAdminStore(actor, db, newStore());
  assert.ok(created.ok);
  const id = created.data.id;
  assert.ok((await setAdminStoreStatus(actor, db, id, "PAUSED")).ok);
  assert.equal((await getAdminStore(db, id))!.status, "PAUSED");
  assert.equal((await setAdminStoreStatus(actor, db, id, "DELETED")).ok, false);

  assert.ok((await archiveAdminStore(actor, db, id)).ok);
  assert.equal(await getAdminStore(db, id), null, "archived stores are hidden");
  assert.ok((await listAdminStores(db, { includeArchived: true })).some((s) => s.id === id));
  assert.ok((await restoreAdminStore(actor, db, id)).ok);
  assert.ok(await getAdminStore(db, id));
});

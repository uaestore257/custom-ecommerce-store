// The template engine against a real database: which template a store
// renders with, that it comes only from that store's own row, that slugs
// and listings stay inside one store, and that changing the design never
// touches commerce data. Every store here is created fresh.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { getAdminStoreDesign, setStoreDemo, updateStoreDesign } from "../../lib/server/admin/design";
import { createAdminProduct } from "../../lib/server/admin/products";
import { createAdminStore } from "../../lib/server/admin/stores";
import {
  getCartProducts,
  getRelatedProducts,
  getStorefrontContext,
  getStorefrontProduct,
  getStorefrontProductBySlug,
  getStorefrontProductListing,
  resolveStoreForHost,
} from "../../lib/server/storefront/catalog";
import type { ListingQuery } from "../../lib/storefront-types";
import { LISTING_PAGE_SIZE } from "../../lib/storefront-urls";
import { FK, rejects, testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

const query = (overrides: Partial<ListingQuery> = {}): ListingQuery => ({ page: 1, sort: "featured", q: "", ...overrides });

async function makeStore() {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Template store ${uid()}`,
    slug: `template-store-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "a template owner passphrase 2026",
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#7a5c3e",
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

async function makeProduct(storeId: string, overrides: Record<string, unknown> = {}) {
  const categoryId = (await listAdminCategories(db, storeId))![0].id;
  const result = await createAdminProduct(db, storeId, {
    name: `Piece ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "Solid oak.",
    price: "100.00",
    compareAtPrice: "",
    imageUrl: "",
    stock: "5",
    deliveryFee: "0",
    freeDelivery: false,
    pickupOnly: false,
    status: "ACTIVE",
    featured: false,
    ...overrides,
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

let storeA = "";
let storeB = "";

before(async () => {
  storeA = await makeStore();
  storeB = await makeStore();
});

// ---------- Template identity ----------

test("a new store uses the default template with default options and is not a demo", async () => {
  const context = (await getStorefrontContext(db, storeA))!;
  assert.equal(context.store.templateKey, "classic");
  assert.deepEqual(context.store.theme, { palette: "light" });
  assert.equal(context.store.isDemo, false);
  assert.equal(context.store.direction, "ltr");
  assert.equal(context.store.language, "en");
});

test("each store renders with ITS OWN template and options — never another store's", async () => {
  const actor = (await testActor(db)).userId;
  assert.ok((await updateStoreDesign(db, storeA, actor, { templateKey: "atelier", theme: { palette: "charcoal", hero: "full-bleed" } })).ok);
  assert.ok((await updateStoreDesign(db, storeB, actor, { templateKey: "classic", theme: { palette: "soft" } })).ok);
  const [a, b] = await Promise.all([getStorefrontContext(db, storeA), getStorefrontContext(db, storeB)]);
  assert.equal(a!.store.templateKey, "atelier");
  assert.deepEqual(a!.store.theme, { palette: "charcoal", hero: "full-bleed" });
  assert.equal(b!.store.templateKey, "classic");
  assert.deepEqual(b!.store.theme, { palette: "soft" });
});

test("the template follows the host: a store's subdomain and its verified custom domain render its template", async () => {
  const env = { ADMIN_HOST: "admin.shops.test", PLATFORM_ROOT_DOMAIN: "shops.test", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;
  const store = await makeStore();
  await updateStoreDesign(db, store, (await testActor(db)).userId, { templateKey: "atelier", theme: {} });
  const slug = (await db.store.findUniqueOrThrow({ where: { id: store }, select: { slug: true } })).slug;
  const hostname = `atelier-${uid()}.example.test`;
  await db.storeDomain.create({ data: { storeId: store, hostname, status: "VERIFIED", verificationToken: uid(), verifiedAt: new Date() } });
  for (const host of [`${slug}.shops.test`, hostname]) {
    const resolved = await resolveStoreForHost(db, host, storeB, env);
    assert.equal(resolved, store, host);
    assert.equal((await getStorefrontContext(db, resolved!))!.store.templateKey, "atelier", host);
  }
});

test("an unknown stored template key or a malformed theme falls back safely instead of failing", async () => {
  const store = await makeStore();
  await db.store.update({
    where: { id: store },
    data: { templateKey: "retired-template", themeConfig: { palette: "neon", script: "<script>alert(1)</script>", hero: { x: 1 } } },
  });
  const context = (await getStorefrontContext(db, store))!;
  assert.equal(context.store.templateKey, "classic");
  assert.deepEqual(context.store.theme, { palette: "light" });
  assert.equal(JSON.stringify(context).includes("<script>"), false, "no stored markup reaches the page data");
});

test("the database itself refuses non-identifier template keys and non-object theme config", async () => {
  for (const templateKey of ["Atelier", "../atelier", "atelier;drop", "", "a".repeat(41)]) {
    await rejects(() => db.store.update({ where: { id: storeB }, data: { templateKey } }), /Store_templateKey_format|check constraint|value too long/i);
  }
  for (const themeConfig of [["palette"], "charcoal", 3]) {
    await rejects(() => db.store.update({ where: { id: storeB }, data: { themeConfig } }), /Store_themeConfig_object|check constraint/i);
  }
});

// ---------- Design changes ----------

test("design input is validated against the registry and only changes presentation", async () => {
  const store = await makeStore();
  const product = await makeProduct(store);
  const actor = (await testActor(db)).userId;
  const before = await db.store.findUniqueOrThrow({ where: { id: store } });
  const productsBefore = await db.product.findMany({ where: { storeId: store }, orderBy: { id: "asc" } });

  for (const input of [
    null,
    "atelier",
    { templateKey: "nope" },
    { templateKey: "Atelier" },
    { templateKey: "atelier", theme: { palette: "neon" } },
    { templateKey: "atelier", theme: { css: "body{display:none}" } },
    { templateKey: "classic", theme: { hero: "split" } },
    { templateKey: "atelier", theme: "charcoal" },
  ]) {
    const result = await updateStoreDesign(db, store, actor, input);
    assert.equal(result.ok, false, JSON.stringify(input));
  }
  const unchanged = await db.store.findUniqueOrThrow({ where: { id: store } });
  assert.equal(unchanged.templateKey, before.templateKey);
  assert.deepEqual(unchanged.themeConfig, before.themeConfig);

  const saved = await updateStoreDesign(db, store, actor, {
    templateKey: "atelier",
    theme: { palette: "stone" },
    // Smuggled fields are ignored:
    name: "Hijacked",
    status: "SUSPENDED",
    storeId: storeB,
  });
  assert.ok(saved.ok, JSON.stringify(saved));
  assert.deepEqual(saved.data, { templateKey: "atelier", theme: { palette: "stone", hero: "split" }, isDemo: false, workServiceSlug: null });
  const after = await db.store.findUniqueOrThrow({ where: { id: store } });
  assert.equal(after.templateKey, "atelier");
  assert.deepEqual(after.themeConfig, { palette: "stone", hero: "split" });
  assert.equal(after.name, before.name);
  assert.equal(after.status, before.status);
  assert.deepEqual(await db.product.findMany({ where: { storeId: store }, orderBy: { id: "asc" } }), productsBefore, "products untouched");
  assert.ok(await getStorefrontProduct(db, store, product), "the catalogue still renders after a template switch");
  assert.ok(await db.auditEvent.findFirst({ where: { action: "store.design_update", storeId: store, actorUserId: actor } }));
  assert.equal((await getAdminStoreDesign(db, storeB))!.templateKey, "classic", "another store is unaffected");
});

test("an archived store's design cannot be changed, and demo flags are boolean-only and audited", async () => {
  const store = await makeStore();
  const actor = await testActor(db);
  await db.store.update({ where: { id: store }, data: { archivedAt: new Date() } });
  assert.equal((await updateStoreDesign(db, store, actor.userId, { templateKey: "atelier", theme: {} })).ok, false);
  assert.equal((await setStoreDemo(actor, db, store, true)).ok, false);

  const live = await makeStore();
  for (const bad of ["true", 1, null, undefined]) assert.equal((await setStoreDemo(actor, db, live, bad)).ok, false, String(bad));
  assert.ok((await setStoreDemo(actor, db, live, true)).ok);
  assert.equal((await getStorefrontContext(db, live))!.store.isDemo, true);
  assert.ok(await db.auditEvent.findFirst({ where: { action: "store.demo_flag", storeId: live } }));
});

// ---------- Product slugs ----------

test("a product slug resolves only inside its own store; the same slug in two stores stays separate", async () => {
  const mine = await makeProduct(storeA, { name: "Walnut Bench" });
  const theirs = await makeProduct(storeB, { name: "Walnut Bench" });
  const onlyTheirs = await makeProduct(storeB, { name: `Elm Stool ${uid()}` });
  const drafted = await makeProduct(storeA, { name: `Draft Lamp ${uid()}`, status: "DRAFT" });

  const a = await getStorefrontProductBySlug(db, storeA, "walnut-bench");
  const b = await getStorefrontProductBySlug(db, storeB, "walnut-bench");
  assert.equal(a?.id, mine);
  assert.equal(a?.storeId, storeA);
  assert.equal(b?.id, theirs);
  assert.equal(b?.storeId, storeB);

  const theirSlug = (await getStorefrontProduct(db, storeB, onlyTheirs))!.slug;
  assert.equal(await getStorefrontProductBySlug(db, storeA, theirSlug), null, "another store's slug never resolves here");
  const draftSlug = (await db.productTranslation.findFirstOrThrow({ where: { productId: drafted } })).slug;
  assert.equal(await getStorefrontProductBySlug(db, storeA, draftSlug), null, "draft products are not public");
  for (const bad of ["", "Walnut-Bench", "walnut bench", "../walnut-bench", "walnut--bench", "-x", "a".repeat(161), null, 7]) {
    assert.equal(await getStorefrontProductBySlug(db, storeA, bad), null, String(bad));
  }
});

// ---------- Listings ----------

test("listings are bounded pages of one store, with stable sorting, search and category filtering", async () => {
  const store = await makeStore();
  const prices = Array.from({ length: LISTING_PAGE_SIZE + 3 }, (_, i) => (10 + i).toFixed(2));
  for (const [i, price] of prices.entries()) {
    await makeProduct(store, { name: i === 5 ? "Rattan Armchair" : `Item ${i} ${uid()}`, price });
  }
  await makeProduct(storeB, { name: "Rattan Armchair Elsewhere" });

  const first = (await getStorefrontProductListing(db, store, null, query()))!;
  assert.equal(first.total, prices.length);
  assert.equal(first.products.length, LISTING_PAGE_SIZE);
  assert.equal(first.pageCount, 2);
  const second = (await getStorefrontProductListing(db, store, null, query({ page: 2 })))!;
  assert.equal(second.products.length, 3);
  assert.equal(new Set([...first.products, ...second.products].map((p) => p.id)).size, prices.length, "pages never overlap");
  assert.ok([...first.products, ...second.products].every((p) => p.storeId === store));
  assert.deepEqual((await getStorefrontProductListing(db, store, null, query({ page: 9 })))!.products, []);

  const cheapest = (await getStorefrontProductListing(db, store, null, query({ sort: "price-asc" })))!.products;
  assert.equal(cheapest[0].priceMinor, "1000");
  assert.ok(cheapest.every((p, i) => i === 0 || BigInt(cheapest[i - 1].priceMinor) <= BigInt(p.priceMinor)));
  const dearest = (await getStorefrontProductListing(db, store, null, query({ sort: "price-desc" })))!.products;
  assert.equal(dearest[0].priceMinor, String(Number(prices.at(-1)) * 100));

  const found = (await getStorefrontProductListing(db, store, null, query({ q: "rattan" })))!;
  assert.deepEqual(found.products.map((p) => p.name), ["Rattan Armchair"], "search is case-insensitive and store-scoped");

  const context = (await getStorefrontContext(db, store))!;
  const category = context.categories.find((c) => c.productCount > 0)!;
  const inCategory = (await getStorefrontProductListing(db, store, category, query()))!;
  assert.equal(inCategory.total, category.productCount);
  const foreign = (await getStorefrontContext(db, storeB))!.categories[0];
  assert.equal((await getStorefrontProductListing(db, store, foreign, query()))!.total, 0, "another store's category lists nothing here");
});

test("related products stay in the store and exclude the product itself", async () => {
  const store = await makeStore();
  const ids = [await makeProduct(store), await makeProduct(store), await makeProduct(store)];
  const product = (await getStorefrontProduct(db, store, ids[0]))!;
  const related = await getRelatedProducts(db, store, product, 4);
  assert.ok(related.length > 0);
  assert.ok(related.every((p) => p.id !== product.id && p.storeId === store));
});

// ---------- Cart products endpoint ----------

test("cart lookups return only this store's ACTIVE products, bounded, ignoring malformed ids", async () => {
  const mine = await makeProduct(storeA);
  const drafted = await makeProduct(storeA, { status: "DRAFT" });
  const theirs = await makeProduct(storeB);
  const result = await getCartProducts(db, storeA, [mine, theirs, drafted, "not a valid id", 42, null, mine]);
  assert.deepEqual(result.map((p) => p.id), [mine]);
  assert.deepEqual(await getCartProducts(db, storeA, []), []);
  const many = Array.from({ length: 500 }, (_, i) => `missing${i}`);
  assert.deepEqual(await getCartProducts(db, storeA, [...many, mine]), [], "only the first 100 ids are considered");
});

// ---------- Integrity of the new columns ----------

test("store design columns have safe defaults and design changes never cascade into commerce tables", async () => {
  const store = await makeStore();
  const row = await db.store.findUniqueOrThrow({ where: { id: store } });
  assert.equal(row.templateKey, "classic");
  assert.deepEqual(row.themeConfig, {});
  assert.equal(row.isDemo, false);
  // A demo flag is just a column: the store still cannot reference another store's data.
  const foreignCategory = (await listAdminCategories(db, storeB))![0].id;
  await rejects(() => db.product.create({ data: { storeId: store, categoryId: foreignCategory } }), FK);
});

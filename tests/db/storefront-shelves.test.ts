// Homepage category shelves (lib/server/storefront/catalog.ts →
// getHomepageShelves) against a real database: store isolation, ACTIVE-only
// products, per-category and overall limits, featured-first ordering and
// safe handling of empty or foreign categories. Every store here is
// created fresh, so nothing depends on seeded data.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { createAdminProduct } from "../../lib/server/admin/products";
import { createAdminStore } from "../../lib/server/admin/stores";
import { getHomepageShelves, getStorefrontContext } from "../../lib/server/storefront/catalog";
import { normalizeShelvesRequest } from "../../lib/storefront-shelves";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

async function makeStore(status: "ACTIVE" | "DRAFT" = "ACTIVE") {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Shelves ${uid()}`,
    slug: `shelves-${uid()}`,
    businessType: "grocery",
    status,
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "a shelves owner passphrase 2026",
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

async function makeProduct(storeId: string, categoryId: string, overrides: Record<string, unknown> = {}) {
  const result = await createAdminProduct(db, storeId, {
    name: `Item ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "",
    price: "10.00",
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

async function shelvesOf(storeId: string, request: unknown) {
  const context = (await getStorefrontContext(db, storeId))!;
  const normalized = normalizeShelvesRequest(request);
  return normalized ? getHomepageShelves(db, storeId, context.categories, normalized) : [];
}

test("shelves hold only the store's own ACTIVE products, featured first, within both limits", async () => {
  const store = await makeStore();
  const other = await makeStore();
  const categories = (await listAdminCategories(db, store))!;
  assert.ok(categories.length >= 2, "new stores start with categories");
  const [first, second] = categories;
  const plain = [];
  for (let i = 0; i < 5; i++) plain.push(await makeProduct(store, first.id));
  const featured = await makeProduct(store, first.id, { featured: true });
  const drafted = await makeProduct(store, first.id, { status: "DRAFT" });
  const inSecond = await makeProduct(store, second.id);
  const foreignCategory = (await listAdminCategories(db, other))![0];
  const foreign = await makeProduct(other, foreignCategory.id, { featured: true });

  const shelves = await shelvesOf(store, { categories: 8, perCategory: 3 });
  const all = shelves.flatMap((shelf) => shelf.products);
  assert.ok(all.every((product) => product.storeId === store), "never another store's products");
  assert.ok(!all.some((product) => product.id === foreign || product.id === drafted));
  const firstShelf = shelves.find((shelf) => shelf.category.id === first.id)!;
  assert.equal(firstShelf.products.length, 3, "cut to perCategory");
  assert.equal(firstShelf.products[0].id, featured, "featured first");
  assert.ok(firstShelf.products.every((product) => product.categoryId === first.id));
  assert.deepEqual(shelves.find((shelf) => shelf.category.id === second.id)!.products.map((p) => p.id), [inSecond]);
  assert.ok(shelves.length <= 8 && all.length <= 8 * 3);
  void plain;
});

test("the category limit is respected, empty categories are skipped, invalid requests load nothing", async () => {
  const store = await makeStore();
  const categories = (await listAdminCategories(db, store))!;
  for (const category of categories.slice(0, 3)) await makeProduct(store, category.id);
  const one = await shelvesOf(store, { categories: 1, perCategory: 4 });
  assert.equal(one.length, 1);
  assert.equal(one[0].category.id, categories[0].id, "store category order");
  const all = await shelvesOf(store, { categories: 8, perCategory: 4 });
  assert.ok(all.every((shelf) => shelf.products.length > 0), "no empty shelves");
  for (const invalid of [undefined, {}, { categories: 0, perCategory: 4 }, { categories: "3", perCategory: 4 }]) {
    assert.deepEqual(await shelvesOf(store, invalid), []);
  }
});

test("a store with no products, or a non-public store, gets no shelves", async () => {
  const empty = await makeStore();
  assert.deepEqual(await shelvesOf(empty, { categories: 4, perCategory: 4 }), []);
  const draft = await makeStore("DRAFT");
  const category = (await listAdminCategories(db, draft))![0];
  await makeProduct(draft, category.id);
  const fakeContextCategories = [{ id: category.id, slug: "x", name: "x", imageUrl: "", productCount: 1 }];
  assert.deepEqual(await getHomepageShelves(db, draft, fakeContextCategories, { categories: 4, perCategory: 4 }), []);
});

test("passing another store's category ids cannot surface that store's products", async () => {
  const mine = await makeStore();
  const theirs = await makeStore();
  const theirCategory = (await listAdminCategories(db, theirs))![0];
  await makeProduct(theirs, theirCategory.id);
  const forged = [{ id: theirCategory.id, slug: "forged", name: "forged", imageUrl: "", productCount: 1 }];
  assert.deepEqual(await getHomepageShelves(db, mine, forged, { categories: 4, perCategory: 4 }), []);
});

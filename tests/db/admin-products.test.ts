// Admin product + category workflows, and cross-store isolation through
// the server-side data-access layer (lib/server/admin/*).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  moveAdminCategory,
  updateAdminCategory,
} from "../../lib/server/admin/categories";
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProduct,
  listAdminProducts,
  updateAdminProduct,
} from "../../lib/server/admin/products";
import { createAdminStore } from "../../lib/server/admin/stores";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

// Two fresh stores with products of their own.
let storeA = "";
let storeB = "";
let categoryA = "";
let categoryB = "";
let productA = "";
let productB = "";

async function makeStore(country: string, currency: string, timezone: string) {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Iso ${country}`,
    slug: `iso-${country.toLowerCase()}-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "a product owner passphrase 2026",
    countryCode: country,
    baseCurrency: currency,
    timezone,
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#0f766e",
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

const productInput = (categoryId: string, overrides: Record<string, unknown> = {}) => ({
  name: "Oak Side Table",
  sku: `SKU-${uid()}`.toUpperCase(),
  categoryId,
  description: "A solid oak side table with one drawer.",
  price: "129.50",
  compareAtPrice: "",
  imageUrl: "",
  stock: "5",
  // The stock an edit form started from (ignored when creating).
  expectedStock: "5",
  status: "ACTIVE",
  featured: false,
  ...overrides,
});

before(async () => {
  storeA = await makeStore("GB", "GBP", "Europe/London");
  storeB = await makeStore("KW", "KWD", "Asia/Kuwait");
  categoryA = (await listAdminCategories(db, storeA))![0].id;
  categoryB = (await listAdminCategories(db, storeB))![0].id;
  const a = await createAdminProduct(db, storeA, productInput(categoryA, { name: "Store A table" }));
  const b = await createAdminProduct(db, storeB, productInput(categoryB, { name: "Store B lamp", price: "12.345" }));
  assert.ok(a.ok && b.ok, JSON.stringify({ a, b }));
  productA = a.data.id;
  productB = b.data.id;
});

// ---------- Products ----------

test("product creation associates the product with the selected store", async () => {
  const row = await db.product.findUniqueOrThrow({ where: { id: productA }, include: { variants: true, translations: true } });
  assert.equal(row.storeId, storeA);
  assert.equal(row.variants.length, 1);
  assert.equal(row.variants[0].isDefault, true);
  assert.equal(row.variants[0].currency, "GBP");
  assert.equal(row.variants[0].priceMinor, 12950n);
  assert.equal(row.translations[0].locale, "en");
  assert.equal(row.translations[0].slug, "store-a-table");
});

test("prices use each store's currency minor units (KWD has 3)", async () => {
  const b = await getAdminProduct(db, storeB, productB);
  assert.equal(b?.price, "12.345");
  assert.match(b?.priceDisplay ?? "", /12\.345/);
  const bad = await createAdminProduct(db, storeA, productInput(categoryA, { price: "10.555" }));
  assert.equal(bad.ok, false, "GBP has 2 decimal places");
});

test("product list is limited to the selected store", async () => {
  const listA = await listAdminProducts(db, storeA);
  const listB = await listAdminProducts(db, storeB);
  assert.deepEqual(listA?.map((p) => p.id), [productA]);
  assert.deepEqual(listB?.map((p) => p.id), [productB]);
});

test("product detail only returns a product of the selected store", async () => {
  assert.equal((await getAdminProduct(db, storeA, productA))?.name, "Store A table");
  assert.equal(await getAdminProduct(db, storeA, productB), null, "store B's product is invisible to store A");
  assert.equal(await getAdminProduct(db, storeA, "no-such-product"), null);
});

test("product update succeeds within its own store", async () => {
  const result = await updateAdminProduct(db, storeA, productA, productInput(categoryA, {
    name: "Store A table (oak)",
    sku: "OAK-TABLE-1",
    price: "140",
    compareAtPrice: "160",
    stock: "9",
    status: "DRAFT",
    featured: true,
    imageUrl: "https://images.example.com/table.jpg",
  }));
  assert.ok(result.ok, JSON.stringify(result));
  const p = (await getAdminProduct(db, storeA, productA))!;
  assert.equal(p.name, "Store A table (oak)");
  assert.equal(p.sku, "OAK-TABLE-1");
  assert.equal(p.price, "140.00");
  assert.equal(p.compareAtPrice, "160.00");
  assert.equal(p.stock, 9);
  assert.equal(p.status, "DRAFT");
  assert.equal(p.featured, true);
  assert.equal(p.imageUrl, "https://images.example.com/table.jpg");
});

test("invalid product input is rejected", async () => {
  const result = await createAdminProduct(db, storeA, {
    name: "",
    sku: "a b",
    categoryId: "",
    description: "short",
    price: "-5",
    compareAtPrice: "1",
    stock: "-1",
    imageUrl: "ftp://x",
    status: "LIVE",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  for (const field of ["name", "sku", "categoryId", "description", "price", "stock", "imageUrl", "status"]) {
    assert.ok(result.fieldErrors?.[field], `expected an error for ${field}`);
  }
  const lowCompare = await createAdminProduct(db, storeA, productInput(categoryA, { price: "50", compareAtPrice: "40" }));
  assert.equal(lowCompare.ok, false);
});

test("SKUs are unique per store, not across stores", async () => {
  const skuA = (await getAdminProduct(db, storeA, productA))!.sku;
  const dup = await createAdminProduct(db, storeA, productInput(categoryA, { sku: skuA }));
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.match(dup.fieldErrors?.sku ?? "", /uses this SKU/);
  const otherStore = await createAdminProduct(db, storeB, productInput(categoryB, { sku: skuA, price: "1.000" }));
  assert.ok(otherStore.ok, "the same SKU may exist in another store");
});

test("missing store or product is handled", async () => {
  assert.equal(await listAdminProducts(db, "no-such-store"), null);
  const create = await createAdminProduct(db, "no-such-store", productInput(categoryA));
  assert.equal(create.ok, false);
  const update = await updateAdminProduct(db, storeA, "no-such-product", productInput(categoryA));
  assert.equal(update.ok, false);
  const del = await deleteAdminProduct(db, storeA, "no-such-product");
  assert.equal(del.ok, false);
});

// ---------- Cross-store isolation ----------

test("store A's context cannot read, update or delete store B's product", async () => {
  const before = await db.product.findUniqueOrThrow({ where: { id: productB }, include: { variants: true, translations: true } });

  assert.equal(await getAdminProduct(db, storeA, productB), null);

  const update = await updateAdminProduct(db, storeA, productB, productInput(categoryA, { name: "Hijacked", price: "1" }));
  assert.equal(update.ok, false);
  if (!update.ok) {
    assert.match(update.error, /not found in this store/);
    assert.doesNotMatch(JSON.stringify(update), /Store B lamp|12\.345/, "no store B data in the error");
  }

  const del = await deleteAdminProduct(db, storeA, productB);
  assert.equal(del.ok, false);

  const afterRow = await db.product.findUniqueOrThrow({ where: { id: productB }, include: { variants: true, translations: true } });
  assert.deepEqual(afterRow, before, "store B's product is completely unchanged");
});

test("a product cannot be moved into another store's category", async () => {
  const result = await updateAdminProduct(db, storeA, productA, productInput(categoryB));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.fieldErrors?.categoryId);
  const create = await createAdminProduct(db, storeA, productInput(categoryB));
  assert.equal(create.ok, false);
});

test("a storeId smuggled into the form data is ignored", async () => {
  const result = await createAdminProduct(db, storeA, { ...productInput(categoryA), storeId: storeB });
  assert.ok(result.ok);
  const row = await db.product.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(row.storeId, storeA);
});

test("store A's context cannot touch store B's categories", async () => {
  const rename = await updateAdminCategory(db, storeA, categoryB, { name: "Hijacked" });
  assert.equal(rename.ok, false);
  const del = await deleteAdminCategory(db, storeA, categoryB);
  assert.equal(del.ok, false);
  const move = await moveAdminCategory(db, storeA, categoryB, 1);
  assert.equal(move.ok, false);
  const catsB = await listAdminCategories(db, storeB);
  assert.ok(catsB?.some((c) => c.id === categoryB && c.name !== "Hijacked"));
  // Moving store A's products into store B's category on delete is refused too.
  const moveAcross = await deleteAdminCategory(db, storeA, categoryA, categoryB);
  assert.equal(moveAcross.ok, false);
});

// ---------- Deleting ----------

test("deleting a product without orders removes it; with orders it is archived", async () => {
  const temp = await createAdminProduct(db, storeA, productInput(categoryA, { name: "Temporary" }));
  assert.ok(temp.ok);
  const removed = await deleteAdminProduct(db, storeA, temp.data.id);
  assert.ok(removed.ok && !removed.data.archived);
  assert.equal(await db.product.count({ where: { id: temp.data.id } }), 0);

  // fur-002 (seed store A) appears in a demo order.
  const archived = await deleteAdminProduct(db, "store-a", "fur-002");
  assert.ok(archived.ok && archived.data.archived, JSON.stringify(archived));
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: "fur-002" } })).status, "ARCHIVED");
});

// ---------- Categories ----------

test("categories: add, rename, reorder and delete with product move", async () => {
  const created = await createAdminCategory(db, storeA, { name: "Garden", imageUrl: "" });
  assert.ok(created.ok);
  const dup = await createAdminCategory(db, storeA, { name: "garden" });
  assert.equal(dup.ok, false, "names are unique per store, ignoring case");

  assert.ok((await updateAdminCategory(db, storeA, created.data.id, { name: "Garden & Patio", imageUrl: "https://images.example.com/g.jpg" })).ok);
  let cats = (await listAdminCategories(db, storeA))!;
  const garden = cats.find((c) => c.id === created.data.id)!;
  assert.equal(garden.name, "Garden & Patio");
  assert.equal(garden.position, cats.length - 1);

  assert.ok((await moveAdminCategory(db, storeA, created.data.id, -1)).ok);
  cats = (await listAdminCategories(db, storeA))!;
  assert.equal(cats[cats.length - 2].id, created.data.id);

  // Put a product in Garden, then delete Garden moving it to categoryA.
  const p = await createAdminProduct(db, storeA, productInput(created.data.id, { name: "Bench" }));
  assert.ok(p.ok);
  const refused = await deleteAdminCategory(db, storeA, created.data.id);
  assert.equal(refused.ok, false, "must say where its products go");
  assert.ok((await deleteAdminCategory(db, storeA, created.data.id, categoryA)).ok);
  assert.equal((await getAdminProduct(db, storeA, p.data.id))?.categoryId, categoryA);
});

// ---------- Stock edits vs. sales ----------

/** A fresh product with stock 5 and its default variant id. */
async function stockProduct() {
  const created = await createAdminProduct(db, storeA, productInput(categoryA, { name: `Stock chair ${uid()}` }));
  assert.ok(created.ok, JSON.stringify(created));
  const variant = await db.productVariant.findFirstOrThrow({ where: { productId: created.data.id, isDefault: true } });
  return { id: created.data.id, variantId: variant.id };
}
const stockOf = async (variantId: string) => (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
/** What checkout does when it sells `quantity` units. */
const sell = (variantId: string, quantity: number) =>
  db.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: quantity } } });

test("an old form can't overwrite stock that a sale reduced after it was opened", async () => {
  const p = await stockProduct();
  await sell(p.variantId, 2); // 5 -> 3 while the admin's form still shows 5
  const result = await updateAdminProduct(db, storeA, p.id, productInput(categoryA, { name: "Renamed", stock: "7", expectedStock: "5" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.fieldErrors?.stock ?? "", /changed to 3/);
  assert.equal(await stockOf(p.variantId), 3, "the sale is kept");
  assert.notEqual((await getAdminProduct(db, storeA, p.id))?.name, "Renamed", "the whole save is rolled back");

  // With the current stock as the starting point, the same change saves.
  const retry = await updateAdminProduct(db, storeA, p.id, productInput(categoryA, { name: "Renamed", stock: "7", expectedStock: "3" }));
  assert.ok(retry.ok, JSON.stringify(retry));
  assert.equal(await stockOf(p.variantId), 7);
});

test("saving other fields with the stock field untouched keeps a sale made meanwhile", async () => {
  const p = await stockProduct();
  await sell(p.variantId, 1); // 5 -> 4
  const result = await updateAdminProduct(db, storeA, p.id, productInput(categoryA, { name: "New name", stock: "5", expectedStock: "5" }));
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(await stockOf(p.variantId), 4, "stock wasn't written back to 5");
  assert.equal((await getAdminProduct(db, storeA, p.id))?.name, "New name");
});

test("an update without a valid starting stock is refused and nothing changes", async () => {
  const p = await stockProduct();
  for (const expectedStock of [undefined, "", "-1", "abc", "2.5", "99999999"]) {
    const result = await updateAdminProduct(db, storeA, p.id, productInput(categoryA, { name: "Hijacked", stock: "0", expectedStock }));
    assert.equal(result.ok, false, String(expectedStock));
  }
  assert.equal(await stockOf(p.variantId), 5);
  assert.notEqual((await getAdminProduct(db, storeA, p.id))?.name, "Hijacked");
});

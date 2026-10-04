import assert from "node:assert/strict";
import { test } from "node:test";
import { getHomepageShelves } from "../../lib/server/storefront/catalog";
import {
  groupShelves,
  MAX_SHELF_CATEGORIES,
  MAX_SHELF_PRODUCTS,
  normalizeShelvesRequest,
  shelfCategories,
} from "../../lib/storefront-shelves";
import type { StorefrontCategory, StorefrontProductSummary } from "../../lib/storefront-types";
import { readFileSync } from "node:fs";
import { TEMPLATE_KEYS } from "../../lib/templates/registry";

const category = (id: string, productCount = 3, slug = id): StorefrontCategory => ({ id, slug, name: id, imageUrl: "", productCount });
const product = (id: string, categoryId: string, storeId = "store-a"): StorefrontProductSummary => ({
  id,
  storeId,
  slug: id,
  name: id,
  sku: id,
  categoryId,
  priceMinor: "100",
  compareAtMinor: null,
  deliveryFeeMinor: "0",
  freeDelivery: false,
  pickupOnly: false,
  imageUrl: "",
  stock: 5,
  featured: false,
});

test("a missing or invalid shelf declaration means no shelves", () => {
  for (const raw of [undefined, null, 3, "8x6", [], {}, { categories: 4 }, { perCategory: 4 }, { categories: 0, perCategory: 4 },
    { categories: 4, perCategory: -1 }, { categories: 2.5, perCategory: 4 }, { categories: Infinity, perCategory: 4 },
    { categories: Number.NaN, perCategory: 4 }, { categories: "4", perCategory: "4" }]) {
    assert.equal(normalizeShelvesRequest(raw), null, JSON.stringify(raw));
  }
});

test("a valid declaration is kept, and oversized values are clamped to hard ceilings", () => {
  assert.deepEqual(normalizeShelvesRequest({ categories: 4, perCategory: 8 }), { categories: 4, perCategory: 8 });
  assert.deepEqual(normalizeShelvesRequest({ categories: 500, perCategory: 10_000 }), {
    categories: MAX_SHELF_CATEGORIES,
    perCategory: MAX_SHELF_PRODUCTS,
  });
  assert.ok(MAX_SHELF_CATEGORIES * MAX_SHELF_PRODUCTS <= 96, "the result is always bounded");
});

test("only categories with a URL and ACTIVE products get a shelf, in store order, up to the limit", () => {
  const categories = [category("a"), category("empty", 0), category("no-slug", 4, ""), category("b"), category("c"), category("d")];
  assert.deepEqual(shelfCategories(categories, { categories: 3, perCategory: 4 }).map((c) => c.id), ["a", "b", "c"]);
  assert.deepEqual(shelfCategories([category("empty", 0)], { categories: 3, perCategory: 4 }), []);
});

test("grouping keeps category order, cuts each shelf, drops empty shelves and ignores other stores' products", () => {
  const categories = [category("a"), category("b"), category("c")];
  const products = [
    product("a1", "a"), product("a2", "a"), product("a3", "a"),
    product("c1", "c"),
    product("x1", "a", "store-b"), // another store: never shown
    product("z1", "not-requested"),
  ];
  const shelves = groupShelves(categories, products, 2, "store-a");
  assert.deepEqual(shelves.map((s) => [s.category.id, s.products.map((p) => p.id)]), [["a", ["a1", "a2"]], ["c", ["c1"]]]);
});

/** A fake Prisma client that records every query the loader makes. */
function fakeClient({ publicStoreId = "store-a", rankedIds = [] as string[], rows = [] as unknown[] } = {}) {
  const calls: { kind: string; args: unknown }[] = [];
  const client = {
    store: {
      findFirst: async (args: { where: { id: string } }) => {
        calls.push({ kind: "store.findFirst", args });
        return args.where.id === publicStoreId ? { id: publicStoreId, defaultLanguage: "en" } : null;
      },
    },
    $queryRaw: async (query: { values: unknown[]; sql: string }) => {
      calls.push({ kind: "$queryRaw", args: query });
      return rankedIds.map((id) => ({ id }));
    },
    product: {
      findMany: async (args: unknown) => {
        calls.push({ kind: "product.findMany", args });
        return rows;
      },
    },
  };
  return { client: client as never, calls };
}

const row = (id: string, categoryId: string, storeId = "store-a") => ({
  id,
  storeId,
  categoryId,
  deliveryFeeMinor: 0n,
  freeDelivery: false,
  pickupOnly: false,
  featured: false,
  translations: [{ locale: "en", slug: id, name: id }],
  variants: [{ sku: id, priceMinor: 100n, compareAtMinor: null, stock: 3 }],
  images: [],
});

test("the loader is two bounded, store-scoped queries whatever the number of categories (no N+1)", async () => {
  const categories = [category("a"), category("b"), category("c"), category("d")];
  const { client, calls } = fakeClient({ rankedIds: ["a1", "b1"], rows: [row("a1", "a"), row("b1", "b")] });
  const shelves = await getHomepageShelves(client, "store-a", categories, { categories: 4, perCategory: 6 });
  assert.deepEqual(calls.map((c) => c.kind), ["store.findFirst", "$queryRaw", "product.findMany"]);

  const raw = calls[1].args as { sql: string; values: unknown[] };
  assert.match(raw.sql, /"storeId" = \?/, "the store id is a placeholder");
  assert.match(raw.sql, /"status" = 'ACTIVE'/);
  assert.match(raw.sql, /ROW_NUMBER\(\) OVER \(\s*PARTITION BY "categoryId"/);
  assert.match(raw.sql, /WHERE "rank" <= \?\s+LIMIT \?\s*$/);
  assert.equal(raw.values[0], "store-a", "the store id is a bound parameter, never interpolated");
  assert.deepEqual(raw.values.slice(1, 5), ["a", "b", "c", "d"], "only the requested categories");
  assert.equal(raw.values.at(-2), 6, "per-category limit");
  assert.equal(raw.values.at(-1), 24, "overall LIMIT = categories × perCategory");

  const read = calls[2].args as { where: { storeId: string; status: string; id: { in: string[] } }; take: number };
  assert.equal(read.where.storeId, "store-a");
  assert.equal(read.where.status, "ACTIVE");
  assert.deepEqual(read.where.id.in, ["a1", "b1"]);
  assert.equal(read.take, 2);
  assert.deepEqual(shelves.map((s) => [s.category.id, s.products.map((p) => p.id)]), [["a", ["a1"]], ["b", ["b1"]]]);
});

test("a product row from another store is never shown, even if the database returned one", async () => {
  const { client } = fakeClient({ rankedIds: ["a1", "evil"], rows: [row("a1", "a"), row("evil", "a", "store-b")] });
  const shelves = await getHomepageShelves(client, "store-a", [category("a")], { categories: 2, perCategory: 4 });
  assert.deepEqual(shelves.map((s) => s.products.map((p) => p.id)), [["a1"]]);
});

test("no query at all when there are no eligible categories; nothing for a non-public store", async () => {
  const none = fakeClient();
  assert.deepEqual(await getHomepageShelves(none.client, "store-a", [category("empty", 0)], { categories: 4, perCategory: 4 }), []);
  assert.equal(none.calls.length, 0);

  const hidden = fakeClient({ publicStoreId: "someone-else", rankedIds: ["a1"], rows: [row("a1", "a")] });
  assert.deepEqual(await getHomepageShelves(hidden.client, "store-a", [category("a")], { categories: 4, perCategory: 4 }), []);
  assert.deepEqual(hidden.calls.map((c) => c.kind), ["store.findFirst"], "stops before reading any product");

  const empty = fakeClient({ rankedIds: [] });
  assert.deepEqual(await getHomepageShelves(empty.client, "store-a", [category("a")], { categories: 4, perCategory: 4 }), []);
  assert.deepEqual(empty.calls.map((c) => c.kind), ["store.findFirst", "$queryRaw"]);
});

test("existing templates (Classic, Atelier, Kinetic, Maison) declare no shelves, so their homepage loads exactly as before", () => {
  // templates/<key>/index.ts is the component half (client components), so
  // it is read as source here rather than imported into this server test.
  const declares = (key: string) => /\bhomepageShelves\s*:/.test(readFileSync(new URL(`../../templates/${key}/index.ts`, import.meta.url), "utf8"));
  for (const key of ["classic", "atelier", "kinetic", "maison"]) assert.equal(declares(key), false, key);
  for (const key of TEMPLATE_KEYS) assert.ok(typeof declares(key) === "boolean", key);
});

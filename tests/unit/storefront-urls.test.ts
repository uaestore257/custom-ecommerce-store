import assert from "node:assert/strict";
import { test } from "node:test";
import { mayAccessStoreSection, mayRunStoreAction } from "../../lib/admin/store-access";
import {
  categoryPath,
  LISTING_MAX_PAGE,
  LISTING_MAX_QUERY_LENGTH,
  listingHref,
  parseListingQuery,
  productPath,
} from "../../lib/storefront-urls";

test("product and category URLs use slugs, fall back safely, and are encoded", () => {
  assert.equal(productPath({ slug: "oak-table", id: "p1" }), "/products/oak-table");
  assert.equal(productPath({ slug: "", id: "p1" }), "/products/p1", "a product without a slug still has a URL");
  assert.equal(productPath({ slug: "a/b?c", id: "p1" }), "/products/a%2Fb%3Fc");
  assert.equal(categoryPath({ slug: "living-room" }), "/shop/living-room");
  assert.equal(categoryPath(null), "/shop");
  assert.equal(categoryPath({ slug: "" }), "/shop");
});

test("listing queries from untrusted search params are bounded and defaulted", () => {
  assert.deepEqual(parseListingQuery({}), { page: 1, sort: "featured", q: "" });
  assert.deepEqual(parseListingQuery({ page: "3", sort: "price-desc", q: "  oak   table " }), { page: 3, sort: "price-desc", q: "oak table" });
  for (const page of ["0", "-1", "1e3", "abc", "1.5", "99999", ""]) {
    const parsed = parseListingQuery({ page });
    assert.ok(parsed.page >= 1 && parsed.page <= LISTING_MAX_PAGE, page);
  }
  assert.equal(parseListingQuery({ page: "9999" }).page, LISTING_MAX_PAGE);
  assert.equal(parseListingQuery({ sort: "price; drop table" }).sort, "featured");
  assert.equal(parseListingQuery({ sort: ["price-asc", "newest"] }).sort, "featured", "repeated params are ignored");
  assert.equal(parseListingQuery({ q: "x".repeat(500) }).q.length, LISTING_MAX_QUERY_LENGTH);
});

test("listing links keep only non-default parameters", () => {
  assert.equal(listingHref("/shop", { page: 1, sort: "featured", q: "" }), "/shop");
  assert.equal(listingHref("/shop/chairs", { page: 2, sort: "newest", q: "oak & ash" }), "/shop/chairs?q=oak+%26+ash&sort=newest&page=2");
});

test("only Owners (and the Platform Owner) may open or change a store's design", () => {
  assert.equal(mayAccessStoreSection("OWNER", "design"), true);
  assert.equal(mayAccessStoreSection("MANAGER", "design"), false);
  assert.equal(mayAccessStoreSection("STAFF", "design"), false);
  assert.equal(mayAccessStoreSection("STAFF", "design", true), true, "platform owner");
  // Saving a design is a "store-settings" action.
  assert.equal(mayRunStoreAction("OWNER", "store-settings"), true);
  assert.equal(mayRunStoreAction("MANAGER", "store-settings"), false);
  assert.equal(mayRunStoreAction("STAFF", "store-settings"), false);
});

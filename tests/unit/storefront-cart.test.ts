import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acceptedSession,
  computeCart,
  formatStoreMoney,
  hasCartChanges,
  isProductOnSale,
  reconcileSession,
  type StoredSession,
} from "../../lib/storefront-cart";
import { isStoreIdCookieValue } from "../../lib/storefront-cookie";
import type { StorefrontCatalog, StorefrontProduct, StorefrontStore } from "../../lib/storefront-types";

const store = (overrides: Partial<StorefrontStore> = {}): StorefrontStore => ({
  id: "store-1",
  name: "Oak & Co",
  logoUrl: "",
  accentColor: "#0f766e",
  countryCode: "AE",
  countryName: "United Arab Emirates",
  currency: "AED",
  minorUnits: 2,
  locale: "en-AE",
  tagline: "",
  heroTitle: "",
  heroText: "",
  aboutText: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  deliveryFeeMinor: "2500",
  freeDeliveryOverMinor: "50000",
  paymentMethods: ["cash_on_delivery"],
  ...overrides,
});

const product = (id: string, overrides: Partial<StorefrontProduct> = {}): StorefrontProduct => ({
  id,
  storeId: "store-1",
  name: `Product ${id}`,
  description: "",
  sku: `SKU-${id}`,
  categoryId: "",
  priceMinor: "10000",
  compareAtMinor: null,
  imageUrl: "",
  stock: 10,
  featured: false,
  ...overrides,
});

const catalog = (products: StorefrontProduct[], s: StorefrontStore = store()): StorefrontCatalog => ({
  store: s,
  categories: [],
  products,
});

const session = (cart: StoredSession["cart"], storeId = "store-1"): StoredSession => ({ storeId, cart });
const item = (productId: string, quantity: number, priceSeenMinor?: string) => ({
  storeId: "store-1",
  productId,
  quantity,
  ...(priceSeenMinor !== undefined && { priceSeenMinor }),
});

test("prices always come from the catalog, not from what the browser stored", () => {
  const cart = computeCart(catalog([product("a", { priceMinor: "12950" })]), session([item("a", 2, "9900")]));
  assert.equal(cart.lines[0].lineTotalMinor, BigInt(25900));
  assert.equal(cart.subtotalMinor, BigInt(25900));
  assert.equal(cart.priceChangedCount, 1);
  assert.equal(cart.lines[0].previousPriceMinor, "9900");
});

test("an unchanged price, or no remembered price, is not reported as changed", () => {
  const cart = computeCart(catalog([product("a"), product("b")]), session([item("a", 1, "10000"), item("b", 1)]));
  assert.equal(cart.priceChangedCount, 0);
  assert.equal(hasCartChanges(cart), false);
});

test("quantity is capped to current stock and reported, never silently", () => {
  const cart = computeCart(catalog([product("a", { stock: 3 })]), session([item("a", 5)]));
  assert.equal(cart.lines[0].quantity, 3);
  assert.equal(cart.lines[0].requestedQuantity, 5);
  assert.equal(cart.quantityReducedCount, 1);
  assert.equal(cart.itemCount, 3);
  assert.equal(hasCartChanges(cart), true);
});

test("unknown, no-longer-listed and out-of-stock products are dropped and counted", () => {
  const cart = computeCart(
    catalog([product("a"), product("sold-out", { stock: 0 })]),
    session([item("a", 1), item("gone", 2), item("sold-out", 1)]),
  );
  assert.deepEqual(cart.lines.map((l) => l.product.id), ["a"]);
  assert.equal(cart.unavailableCount, 2);
});

test("items belonging to another store are never shown, even inside a matching session", () => {
  const cart = computeCart(
    catalog([product("a")]),
    session([item("a", 1), { storeId: "store-2", productId: "a", quantity: 4 }]),
  );
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].quantity, 1);
});

test("a session saved for a different store gives an empty cart (switching store can't keep items)", () => {
  const cart = computeCart(catalog([product("a")]), session([item("a", 2)], "store-2"));
  assert.equal(cart.lines.length, 0);
  assert.equal(cart.itemCount, 0);
  assert.equal(cart.totalMinor, BigInt(0));
});

test("reconcileSession empties a cart from another store and drops stray items", () => {
  assert.deepEqual(reconcileSession(session([item("a", 2)], "store-2"), "store-1"), { storeId: "store-1", cart: [] });
  assert.deepEqual(reconcileSession(null, "store-1"), { storeId: "store-1", cart: [] });
  assert.deepEqual(reconcileSession(undefined, "store-1"), { storeId: "store-1", cart: [] });
  const mixed = session([item("a", 1), { storeId: "store-2", productId: "b", quantity: 1 }, item("c", 0)]);
  assert.deepEqual(reconcileSession(mixed, "store-1").cart, [item("a", 1)]);
});

test("duplicate entries for one product are merged, and non-positive or broken quantities ignored", () => {
  const cart = computeCart(
    catalog([product("a")]),
    session([item("a", 2), item("a", 3), item("b", -1), item("c", Number.NaN)]),
  );
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].quantity, 5);
});

test("delivery: flat fee below the threshold, free at or above it, none for an empty cart", () => {
  const below = computeCart(catalog([product("a", { priceMinor: "10000" })]), session([item("a", 1)]));
  assert.equal(below.deliveryMinor, BigInt(2500));
  assert.equal(below.totalMinor, BigInt(12500));

  const atThreshold = computeCart(catalog([product("a", { priceMinor: "10000" })]), session([item("a", 5)]));
  assert.equal(atThreshold.deliveryMinor, BigInt(0));
  assert.equal(atThreshold.totalMinor, BigInt(50000));

  const empty = computeCart(catalog([product("a")]), session([]));
  assert.equal(empty.deliveryMinor, BigInt(0));
});

test("a store with no delivery rate reports delivery as not configured, never as free", () => {
  const cart = computeCart(
    catalog([product("a")], store({ deliveryFeeMinor: null, freeDeliveryOverMinor: null })),
    session([item("a", 1)]),
  );
  assert.equal(cart.deliveryConfigured, false);
  assert.equal(cart.deliveryMinor, BigInt(0));
  assert.equal(cart.totalMinor, BigInt(10000));
});

test("3-decimal currencies (KWD) stay exact end to end", () => {
  const kwd = store({ currency: "KWD", minorUnits: 3, locale: "en-KW", deliveryFeeMinor: "1500", freeDeliveryOverMinor: null });
  const cart = computeCart(catalog([product("a", { priceMinor: "12345" })], kwd), session([item("a", 3)]));
  assert.equal(cart.subtotalMinor, BigInt(37035));
  assert.equal(cart.totalMinor, BigInt(38535));
  assert.match(formatStoreMoney(kwd, cart.totalMinor), /38\.535/);
});

test("acceptedSession saves the cart as it is now: capped, filtered, current prices marked as seen", () => {
  const cart = computeCart(
    catalog([product("a", { stock: 2, priceMinor: "12000" })]),
    session([item("a", 5, "10000"), item("gone", 1)]),
  );
  const accepted = acceptedSession(cart, "store-1");
  assert.deepEqual(accepted, { storeId: "store-1", cart: [{ storeId: "store-1", productId: "a", quantity: 2, priceSeenMinor: "12000" }] });
  const after = computeCart(catalog([product("a", { stock: 2, priceMinor: "12000" })]), accepted);
  assert.equal(hasCartChanges(after), false);
});

test("sale detection compares exact minor units", () => {
  assert.equal(isProductOnSale({ priceMinor: "999", compareAtMinor: "1000" }), true);
  assert.equal(isProductOnSale({ priceMinor: "1000", compareAtMinor: "1000" }), false);
  assert.equal(isProductOnSale({ priceMinor: "1000", compareAtMinor: null }), false);
});

test("store cookie values: only a plausible store id is ever accepted", () => {
  for (const ok of ["store-a", "cmukl0hkc00000kvrxnhnygxq", "a_b-C9"]) assert.ok(isStoreIdCookieValue(ok), ok);
  for (const bad of ["", "x".repeat(65), "store a", "store/a", "store-a;admin=1", "<script>", undefined, null, 42, {}]) {
    assert.ok(!isStoreIdCookieValue(bad), JSON.stringify(bad));
  }
});

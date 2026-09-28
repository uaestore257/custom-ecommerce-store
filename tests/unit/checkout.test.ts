import assert from "node:assert/strict";
import { test } from "node:test";
import { isIdempotencyKey, toE164Phone, validateCheckout, validateCheckoutFields } from "../../lib/checkout";
import { requestFingerprint } from "../../lib/server/orders";
import { storeIdFromCookieHeader } from "../../lib/storefront-cookie";

const KEY = "3f1c9a2e-7b4d-4e8a-9c1f-2a6b8d0e4f11";

const request = (overrides: Record<string, unknown> = {}) => ({
  storeId: "store-1",
  idempotencyKey: KEY,
  expectedTotalMinor: "12500",
  items: [{ productId: "prod-b", quantity: 1 }, { productId: "prod-a", quantity: 2 }],
  name: "Jane Visitor",
  email: "Jane@Example.com",
  phone: "050 123 4567",
  address: "Villa 12, Example Street",
  city: "Dubai",
  paymentMethod: "cash_on_delivery",
  ...overrides,
});

test("a valid UAE checkout is normalised: E.164 phone, lower-case email, emirate as region, sorted lines", () => {
  const result = validateCheckout(request(), "AE");
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.values.customer.phone, "+971501234567");
  assert.equal(result.values.customer.email, "jane@example.com");
  assert.deepEqual(result.values.address, { line1: "Villa 12, Example Street", city: "Dubai", region: "Dubai" });
  assert.deepEqual(result.values.items, [{ productId: "prod-a", quantity: 2 }, { productId: "prod-b", quantity: 1 }]);
  assert.equal(result.values.expectedTotalMinor, BigInt(12500));
});

test("price, total, stock and other unknown fields sent by the browser are never read", () => {
  const result = validateCheckout(
    request({
      items: [{ productId: "prod-a", quantity: 1, priceMinor: "1", unitPrice: 0.01, stock: 999 }],
      totalMinor: "1",
      subtotalMinor: "1",
      paymentStatus: "PAID",
      status: "DELIVERED",
    }),
    "AE",
  );
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.values.items, [{ productId: "prod-a", quantity: 1 }]);
  assert.deepEqual(Object.keys(result.values).sort(), [
    "address", "customer", "expectedTotalMinor", "idempotencyKey", "items", "paymentMethod", "storeId",
  ]);
});

test("duplicate lines are merged; the merged quantity is still capped", () => {
  const merged = validateCheckout(request({ items: [{ productId: "p", quantity: 2 }, { productId: "p", quantity: 3 }] }), "AE");
  assert.ok(merged.ok && merged.values.items[0].quantity === 5);
  const tooMany = validateCheckout(request({ items: [{ productId: "p", quantity: 600 }, { productId: "p", quantity: 400 }] }), "AE");
  assert.equal(tooMany.ok, false);
});

test("malformed requests are refused as a whole, without field errors", () => {
  const bad = [
    { storeId: "" },
    { storeId: "bad id" },
    { idempotencyKey: "short" },
    { idempotencyKey: undefined },
    { expectedTotalMinor: 12500 },
    { expectedTotalMinor: "-1" },
    { expectedTotalMinor: "12.50" },
    { items: [] },
    { items: "nope" },
    { items: Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}`, quantity: 1 })) },
    { items: [{ productId: "p", quantity: 0 }] },
    { items: [{ productId: "p", quantity: -1 }] },
    { items: [{ productId: "p", quantity: 1.5 }] },
    { items: [{ productId: "p", quantity: 1000 }] },
    { items: [{ productId: "p", quantity: "2" }] },
    { items: [{ productId: "bad id", quantity: 1 }] },
  ];
  for (const overrides of bad) {
    const result = validateCheckout(request(overrides), "AE");
    assert.equal(result.ok, false, JSON.stringify(overrides));
    if (!result.ok) assert.ok(result.requestError, JSON.stringify(overrides));
  }
  for (const input of [null, undefined, "x", 42, []]) assert.equal(validateCheckout(input, "AE").ok, false);
});

test("customer and delivery fields are checked with the store's country rules", () => {
  const errors = validateCheckoutFields(
    request({ name: "J", email: "not-an-email", phone: "12", address: "abc", city: "Paris", paymentMethod: "" }),
    "AE",
  );
  assert.deepEqual(Object.keys(errors).sort(), ["address", "city", "email", "name", "paymentMethod", "phone"]);
  assert.match(errors.city ?? "", /emirate/);

  // Outside the UAE: free-text city, and the phone needs its country code.
  assert.equal(validateCheckoutFields(request({ city: "London", phone: "+44 20 7946 0000" }), "GB").city, undefined);
  assert.equal(validateCheckoutFields(request({ city: "London", phone: "+44 20 7946 0000" }), "GB").phone, undefined);
  assert.ok(validateCheckoutFields(request({ city: "London", phone: "020 7946 0000" }), "GB").phone);
  assert.ok(validateCheckoutFields(request({ city: "" }), "GB").city);
});

test("only cash on delivery and bank transfer can be chosen in this phase", () => {
  for (const method of ["cash_on_delivery", "bank_transfer"]) {
    assert.equal(validateCheckoutFields(request({ paymentMethod: method }), "AE").paymentMethod, undefined, method);
  }
  for (const method of ["card_on_delivery", "online_card", "paypal", ""]) {
    assert.ok(validateCheckoutFields(request({ paymentMethod: method }), "AE").paymentMethod, method);
  }
});

test("phone numbers become E.164", () => {
  assert.equal(toE164Phone("050 123 4567", "AE"), "+971501234567");
  assert.equal(toE164Phone("+971 50 123 4567", "AE"), "+971501234567");
  assert.equal(toE164Phone("00971501234567", "AE"), "+971501234567");
  assert.equal(toE164Phone("04 000 0000", "AE"), "+97140000000");
  assert.equal(toE164Phone("12", "AE"), null);
  assert.equal(toE164Phone("+44 20 7946 0000", "GB"), "+442079460000");
  assert.equal(toE164Phone("0044 20 7946 0000", "GB"), "+442079460000");
  assert.equal(toE164Phone("020 7946 0000", "GB"), null);
});

test("idempotency keys are random ids of a bounded, safe shape", () => {
  assert.ok(isIdempotencyKey(KEY));
  for (const bad of ["", "short", "x".repeat(65), "has space in it here", "a;b=c-1234567890123", null, 42]) {
    assert.ok(!isIdempotencyKey(bad), JSON.stringify(bad));
  }
});

test("the request fingerprint is stable, and changes when what was ordered changes", () => {
  const a = validateCheckout(request(), "AE");
  const reordered = validateCheckout(request({ items: [{ productId: "prod-a", quantity: 2 }, { productId: "prod-b", quantity: 1 }] }), "AE");
  const moreItems = validateCheckout(request({ items: [{ productId: "prod-a", quantity: 3 }, { productId: "prod-b", quantity: 1 }] }), "AE");
  const otherAddress = validateCheckout(request({ address: "Villa 99, Other Street" }), "AE");
  assert.ok(a.ok && reordered.ok && moreItems.ok && otherAddress.ok);
  if (!a.ok || !reordered.ok || !moreItems.ok || !otherAddress.ok) return;
  assert.match(requestFingerprint(a.values), /^[0-9a-f]{64}$/);
  assert.equal(requestFingerprint(a.values), requestFingerprint(reordered.values), "line order doesn't matter");
  assert.notEqual(requestFingerprint(a.values), requestFingerprint(moreItems.values));
  assert.notEqual(requestFingerprint(a.values), requestFingerprint(otherAddress.values));
});

test("the store cookie is read from a Cookie header, and only a plausible id is accepted", () => {
  assert.equal(storeIdFromCookieHeader("a=1; storefront_store=store-b; c=3"), "store-b");
  assert.equal(storeIdFromCookieHeader("storefront_store=store-b"), "store-b");
  assert.equal(storeIdFromCookieHeader("storefront_store=bad%20id"), undefined);
  assert.equal(storeIdFromCookieHeader("storefront_store="), undefined);
  assert.equal(storeIdFromCookieHeader("other=1"), undefined);
  assert.equal(storeIdFromCookieHeader(null), undefined);
});

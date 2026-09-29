import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizePhone,
  parseMoney,
  readExpectedStock,
  validateCategory,
  validateProduct,
  validateStoreBase,
  type StoreReference,
} from "../../lib/admin/validation";

const reference: StoreReference = {
  countries: new Set(["AE", "US", "GB", "SA", "KW"]),
  currencies: new Map([["AED", 2], ["USD", 2], ["GBP", 2], ["KWD", 3], ["JPY", 0]]),
  languages: new Set(["en", "ar"]),
};

const store = {
  name: "Maple & Co",
  slug: "maple-co",
  status: "DRAFT",
  ownerName: "Jamie Lee",
  ownerEmail: "Jamie@Example.com",
  countryCode: "GB",
  baseCurrency: "GBP",
  timezone: "Europe/London",
  defaultLanguage: "en",
  languages: ["en", "ar"],
  accentColor: "#0F766E",
};

test("parseMoney respects each currency's minor units", () => {
  assert.equal(parseMoney("12.50", 2).minor, 1250n);
  assert.equal(parseMoney("12.345", 3).minor, 12345n);
  assert.equal(parseMoney("1500", 0).minor, 1500n);
  assert.match(parseMoney("12.345", 2).error ?? "", /2 decimal places/);
  assert.match(parseMoney("1500.5", 0).error ?? "", /no decimal places/);
  assert.ok(parseMoney("-5", 2).error);
  assert.ok(parseMoney("AED 5", 2).error);
  assert.ok(parseMoney("0", 2, { allowZero: false }).error);
});

test("store input: valid values are normalised", () => {
  const { values, errors } = validateStoreBase(store, reference);
  assert.deepEqual(errors, {});
  assert.equal(values.ownerEmail, "jamie@example.com");
  assert.equal(values.accentColor, "#0f766e");
});

test("store input: every rule is enforced on untrusted data", () => {
  const { errors } = validateStoreBase(
    { ...store, name: "x", slug: "Bad Slug", status: "LIVE", countryCode: "ZZ", baseCurrency: "XXX", timezone: "Nowhere", languages: ["en", "klingon"], defaultLanguage: "fr" },
    reference,
  );
  for (const field of ["name", "slug", "status", "countryCode", "baseCurrency", "timezone", "languages", "defaultLanguage"]) {
    assert.ok(errors[field], field);
  }
  assert.ok(validateStoreBase(null, reference).errors.name, "non-object input is handled");
});

test("product input: store-currency money, limits and statuses", () => {
  const ok = validateProduct(
    { name: "Lamp", sku: "lamp-1", categoryId: "c1", description: "A warm brass lamp.", price: "12.345", stock: "4", status: "ACTIVE" },
    3,
  );
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.values.priceMinor, 12345n);
  assert.equal(ok.values.sku, "LAMP-1");

  const bad = validateProduct({ price: "12.345", compareAtPrice: "10", stock: "1.5", status: "SOLD" }, 2);
  for (const field of ["name", "sku", "categoryId", "description", "price", "stock", "status"]) {
    assert.ok(bad.errors[field], field);
  }
});

test("unknown fields such as storeId are ignored", () => {
  const { values } = validateProduct(
    { name: "Lamp", sku: "L1", categoryId: "c1", description: "A warm brass lamp.", price: "5", stock: "1", status: "DRAFT", storeId: "other-store" },
    2,
  );
  assert.equal("storeId" in values, false);
});

test("category input and phone normalisation", () => {
  assert.ok(validateCategory({ name: "x" }).errors.name);
  assert.ok(validateCategory({ name: "Garden", imageUrl: "javascript:alert(1)" }).errors.imageUrl);
  assert.deepEqual(validateCategory({ name: "Garden" }).errors, {});
  assert.equal(normalizePhone("+44 (20) 7946-0000"), "+442079460000");
});

test("the starting stock of an edit form is read exactly, or refused", () => {
  assert.equal(readExpectedStock({ expectedStock: "5" }), 5);
  assert.equal(readExpectedStock({ expectedStock: " 0 " }), 0);
  assert.equal(readExpectedStock({ expectedStock: 12 }), 12);
  for (const value of [undefined, null, "", "-1", "2.5", "1e3", "abc", "99999999", [5], {}]) {
    assert.equal(readExpectedStock({ expectedStock: value }), null, JSON.stringify(value));
  }
  assert.equal(readExpectedStock(null), null);
  assert.equal(readExpectedStock("5"), null);
});

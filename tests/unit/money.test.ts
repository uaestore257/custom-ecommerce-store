import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatMinorUnits,
  fromMinorUnits,
  legacyNumberToMinorUnits,
  MoneyError,
  toMinorUnits,
} from "../../lib/money";

test("2-decimal currency (USD/AED): decimal string <-> minor units", () => {
  assert.equal(toMinorUnits("2499", 2), 249900n);
  assert.equal(toMinorUnits("24.75", 2), 2475n);
  assert.equal(toMinorUnits("0.5", 2), 50n);
  assert.equal(fromMinorUnits(249900n, 2), "2499.00");
  assert.equal(fromMinorUnits(5n, 2), "0.05");
});

test("0-decimal currency (JPY): no fractions allowed", () => {
  assert.equal(toMinorUnits("1500", 0), 1500n);
  assert.equal(fromMinorUnits(1500n, 0), "1500");
  assert.throws(() => toMinorUnits("1500.5", 0), MoneyError);
});

test("3-decimal currency (KWD/BHD/OMR)", () => {
  assert.equal(toMinorUnits("1.250", 3), 1250n);
  assert.equal(toMinorUnits("12.345", 3), 12345n);
  assert.equal(toMinorUnits("7", 3), 7000n);
  assert.equal(fromMinorUnits(12345n, 3), "12.345");
  assert.equal(fromMinorUnits(5n, 3), "0.005");
  assert.throws(() => toMinorUnits("1.2345", 3), MoneyError);
});

test("never uses floating point: values beyond Number.MAX_SAFE_INTEGER stay exact", () => {
  const huge = "92233720368547758.07"; // near the BigInt column limit
  const minor = toMinorUnits(huge, 2);
  assert.equal(minor, 9223372036854775807n);
  assert.equal(fromMinorUnits(minor, 2), huge);
  assert.equal(formatMinorUnits(minor, "USD", 2, "en-US"), "$92,233,720,368,547,758.07");
});

test("0.1 + 0.2 style float errors cannot happen", () => {
  assert.equal(toMinorUnits("0.1", 2) + toMinorUnits("0.2", 2), toMinorUnits("0.3", 2));
});

test("rejects invalid input", () => {
  for (const bad of ["", "abc", "1,000", "1.2.3", "1e5", " . "]) {
    assert.throws(() => toMinorUnits(bad, 2), MoneyError, bad);
  }
  assert.throws(() => toMinorUnits("1", 5), MoneyError);
});

test("legacy demo numbers convert exactly", () => {
  assert.equal(legacyNumberToMinorUnits(2499, 2), 249900n);
  assert.equal(legacyNumberToMinorUnits(24.75, 2), 2475n);
  assert.equal(legacyNumberToMinorUnits(0.1 + 0.2, 2), 30n);
});

// Intl uses non-breaking spaces between the currency and the number.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

test("formats with ISO 4217 digits in any locale", () => {
  assert.equal(plain(formatMinorUnits(249900n, "AED", 2, "en-AE")), "AED 2,499.00");
  assert.equal(formatMinorUnits(1500n, "JPY", 0, "en-US"), "¥1,500");
  assert.match(formatMinorUnits(1250n, "KWD", 3, "en-KW"), /1\.250/);
  assert.match(formatMinorUnits(1250n, "KWD", 3, "ar-KW"), /١٫٢٥٠/); // Arabic digits
  assert.equal(formatMinorUnits(199900n, "GBP", 2, "en-GB"), "£1,999.00");
  assert.equal(formatMinorUnits(199900n, "USD", 2, "en-US"), "$1,999.00");
});

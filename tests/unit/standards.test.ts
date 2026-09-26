import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCountryCode,
  isCurrencyCode,
  isE164Phone,
  isLanguageTag,
  isTimeZone,
  storeFormatLocale,
} from "../../lib/standards";

test("ISO 3166-1 alpha-2 country codes", () => {
  for (const ok of ["AE", "US", "GB", "SA"]) assert.ok(isCountryCode(ok), ok);
  for (const bad of ["ae", "UAE", "United Arab Emirates", ""]) assert.ok(!isCountryCode(bad), bad);
});

test("ISO 4217 currency codes", () => {
  for (const ok of ["AED", "USD", "GBP", "SAR", "KWD", "JPY"]) assert.ok(isCurrencyCode(ok), ok);
  for (const bad of ["aed", "Dhs", "US$", ""]) assert.ok(!isCurrencyCode(bad), bad);
});

test("BCP 47 language tags (canonical form only)", () => {
  for (const ok of ["en", "ar", "en-GB", "ar-SA", "zh-Hant"]) assert.ok(isLanguageTag(ok), ok);
  for (const bad of ["EN", "english", "en_GB", ""]) assert.ok(!isLanguageTag(bad), bad);
});

test("IANA timezones", () => {
  for (const ok of ["Asia/Dubai", "America/New_York", "Europe/London", "Asia/Riyadh", "UTC"]) {
    assert.ok(isTimeZone(ok), ok);
  }
  for (const bad of ["GST", "Dubai", "Mars/Olympus", ""]) assert.ok(!isTimeZone(bad), bad);
});

test("formatting locale comes from each store, not from a platform default", () => {
  assert.equal(storeFormatLocale({ defaultLanguage: "ar", countryCode: "AE" }), "ar-AE");
  assert.equal(storeFormatLocale({ defaultLanguage: "en", countryCode: "US" }), "en-US");
  assert.equal(storeFormatLocale({ defaultLanguage: "en", countryCode: "GB" }), "en-GB");
  assert.equal(storeFormatLocale({ defaultLanguage: "en", countryCode: "AE", formatLocale: "en-GB" }), "en-GB");
});

test("E.164 phone numbers", () => {
  for (const ok of ["+971500000001", "+14155550123", "+447700900123", "+966110000000"]) {
    assert.ok(isE164Phone(ok), ok);
  }
  for (const bad of ["0501234567", "+0123", "971500000001", "+971 50 000 0001"]) {
    assert.ok(!isE164Phone(bad), bad);
  }
});

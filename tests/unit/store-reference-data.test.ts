import assert from "node:assert/strict";
import { test } from "node:test";
import { filterSearchOptions, moveOptionIndex, toggleSelectedOption } from "../../lib/admin/search-options";
import { validateStoreBase, validateStoreSettings, type StoreReference } from "../../lib/admin/validation";
import { isTimeZone } from "../../lib/standards";
import {
  CURRENCIES,
  countryRows,
  currencyRows,
  languageRows,
  TIME_ZONES,
  upsertReferenceRows,
  type ReferenceDataWriter,
} from "../../prisma/reference-data";

const countries = countryRows();
const currencies = currencyRows();
const languages = languageRows();
const reference: StoreReference = {
  countries: new Set(countries.map(({ code }) => code)),
  currencies: new Map(currencies.map(({ code, minorUnits }) => [code, minorUnits])),
  languages: new Set(languages.map(({ code }) => code)),
};

test("reference datasets include complete ISO choices and Pakistan localization", () => {
  assert.ok(countries.length >= 240, `expected assigned ISO countries, got ${countries.length}`);
  assert.ok(CURRENCIES.length >= 160, `expected active ISO currencies, got ${CURRENCIES.length}`);
  assert.equal(languages.length, 15, "offer only the curated internationally used ISO 639-1 languages");
  assert.ok(TIME_ZONES.length >= 400, `expected IANA time zones, got ${TIME_ZONES.length}`);
  assert.ok(countries.every(({ code }) => /^[A-Z]{2}$/.test(code)));
  assert.ok(CURRENCIES.every(({ code, minorUnits }) => /^[A-Z]{3}$/.test(code) && Number.isInteger(minorUnits)));
  assert.ok(languages.every(({ code }) => /^[a-z]{2}$/.test(code)));

  assert.equal(countries.find(({ code }) => code === "PK")?.name, "Pakistan");
  assert.equal(CURRENCIES.find(({ code }) => code === "PKR")?.minorUnits, 2);
  assert.equal(CURRENCIES.find(({ code }) => code === "KWD")?.minorUnits, 3);
  assert.equal(CURRENCIES.find(({ code }) => code === "JPY")?.minorUnits, 0);
  assert.equal(CURRENCIES.find(({ code }) => code === "CLF")?.minorUnits, 4);
  assert.equal(languages.find(({ code }) => code === "en")?.name, "English");
  assert.equal(languages.find(({ code }) => code === "ur")?.name, "Urdu");
  assert.equal(languages.find(({ code }) => code === "ur")?.direction, "RTL");
  assert.ok(languages.some(({ code }) => code === "ar"));
  assert.ok(languages.every(({ code }) => reference.languages.has(code)));
  assert.ok(TIME_ZONES.includes("Asia/Karachi"));
  assert.ok(isTimeZone("Asia/Karachi"));
  assert.ok(!TIME_ZONES.includes("Not/A_Timezone"));
  assert.ok(!isTimeZone("Not/A_Timezone"));
});

test("create and edit validators accept Pakistan settings and require the default to be enabled", () => {
  const base = {
    name: "Karachi Store",
    slug: "karachi-store",
    status: "DRAFT",
    ownerName: "Store Owner",
    ownerEmail: "owner@example.com",
    ownerPassword: "a safe store passphrase 2026",
    countryCode: "PK",
    baseCurrency: "PKR",
    timezone: "Asia/Karachi",
    defaultLanguage: "en",
    languages: ["en", "ur"],
    accentColor: "#0f766e",
  };
  const created = validateStoreBase(base, reference);
  assert.deepEqual(created.errors, {});
  assert.deepEqual(
    {
      countryCode: created.values.countryCode,
      baseCurrency: created.values.baseCurrency,
      timezone: created.values.timezone,
      defaultLanguage: created.values.defaultLanguage,
      languages: created.values.languages,
    },
    {
      countryCode: "PK",
      baseCurrency: "PKR",
      timezone: "Asia/Karachi",
      defaultLanguage: "en",
      languages: ["en", "ur"],
    },
  );

  const edited = validateStoreSettings(
    {
      ...base,
      heroTitle: "Welcome",
      paymentMethods: { cash_on_delivery: true, card_on_delivery: false, bank_transfer: false },
    },
    reference,
  );
  assert.deepEqual(edited.errors, {});
  for (const key of ["countryCode", "baseCurrency", "timezone", "defaultLanguage", "languages"] as const) {
    assert.deepEqual(edited.values[key], created.values[key]);
  }

  assert.ok(validateStoreBase({ ...base, countryCode: "ZZ" }, reference).errors.countryCode);
  assert.ok(validateStoreBase({ ...base, baseCurrency: "XXX" }, reference).errors.baseCurrency);
  assert.ok(validateStoreBase({ ...base, timezone: "Not/A_Timezone" }, reference).errors.timezone);
  assert.ok(
    validateStoreBase({ ...base, languages: ["en"], defaultLanguage: "ur" }, reference).errors.defaultLanguage,
  );
});

test("reference upserts are repeat-safe, refresh existing metadata and preserve unrelated rows", async () => {
  const countryTable = new Map<string, { code: string; name: string }>([
    ["PK", { code: "PK", name: "Old country name" }],
    ["ZZ", { code: "ZZ", name: "Existing custom row" }],
  ]);
  const currencyTable = new Map<string, { code: string; name: string; minorUnits: number }>([
    ["PKR", { code: "PKR", name: "Old currency name", minorUnits: 0 }],
    ["ZZZ", { code: "ZZZ", name: "Existing custom row", minorUnits: 2 }],
  ]);
  const languageTable = new Map<
    string,
    { code: string; name: string; nativeName: string; direction: "LTR" | "RTL" }
  >([
    ["ur", { code: "ur", name: "Old language name", nativeName: "Old native name", direction: "LTR" }],
    ["qaa", { code: "qaa", name: "Existing custom row", nativeName: "Custom", direction: "LTR" }],
  ]);

  const writer: ReferenceDataWriter = {
    country: {
      async upsert({ where, create, update }) {
        countryTable.set(where.code, { ...(countryTable.get(where.code) ?? create), ...update });
      },
    },
    currency: {
      async upsert({ where, create, update }) {
        currencyTable.set(where.code, { ...(currencyTable.get(where.code) ?? create), ...update });
      },
    },
    language: {
      async upsert({ where, create, update }) {
        languageTable.set(where.code, { ...(languageTable.get(where.code) ?? create), ...update });
      },
    },
  };

  const counts = await upsertReferenceRows(writer);
  assert.deepEqual(counts, {
    countries: countries.length,
    currencies: currencies.length,
    languages: languages.length,
  });
  assert.deepEqual(countryTable.get("PK"), countries.find(({ code }) => code === "PK"));
  assert.deepEqual(currencyTable.get("PKR"), currencies.find(({ code }) => code === "PKR"));
  assert.deepEqual(languageTable.get("ur"), languages.find(({ code }) => code === "ur"));
  assert.deepEqual(countryTable.get("ZZ"), { code: "ZZ", name: "Existing custom row" });
  assert.deepEqual(currencyTable.get("ZZZ"), { code: "ZZZ", name: "Existing custom row", minorUnits: 2 });
  assert.deepEqual(languageTable.get("qaa"), {
    code: "qaa",
    name: "Existing custom row",
    nativeName: "Custom",
    direction: "LTR",
  });
  assert.deepEqual(Object.keys(writer).sort(), ["country", "currency", "language"]);

  const snapshot = {
    countries: new Map(countryTable),
    currencies: new Map(currencyTable),
    languages: new Map(languageTable),
  };
  await upsertReferenceRows(writer);
  assert.deepEqual(countryTable, snapshot.countries);
  assert.deepEqual(currencyTable, snapshot.currencies);
  assert.deepEqual(languageTable, snapshot.languages);
});

test("search filtering and language checkbox selection preserve selected values", () => {
  const timezoneOptions = TIME_ZONES.map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }));
  assert.deepEqual(filterSearchOptions(timezoneOptions, "karachi"), [
    { value: "Asia/Karachi", label: "Asia/Karachi" },
  ]);
  assert.deepEqual(
    filterSearchOptions(
      countries.map(({ code, name }) => ({ value: code, label: `${name} (${code})` })),
      "Pakistan",
    ),
    [{ value: "PK", label: "Pakistan (PK)" }],
  );
  assert.deepEqual(
    filterSearchOptions(
      currencies.map(({ code, name }) => ({ value: code, label: `${code} — ${name}` })),
      "PKR",
    ).map(({ value }) => value),
    ["PKR"],
  );
  assert.deepEqual(toggleSelectedOption(["en"], "ur", true), ["en", "ur"]);
  assert.deepEqual(toggleSelectedOption(["en", "ur"], "ur", false), ["en"]);
  assert.deepEqual(toggleSelectedOption(["en", "ur"], "ur", true), ["en", "ur"]);
  assert.equal(moveOptionIndex(0, 3, -1), 2);
  assert.equal(moveOptionIndex(2, 3, 1), 0);
  assert.equal(moveOptionIndex(0, 0, 1), 0);
});

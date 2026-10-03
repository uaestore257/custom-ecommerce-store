import { countries, languages } from "countries-list";
import { currencies } from "countries-list/currencies";
import { TIME_ZONES } from "../lib/time-zones";

export { TIME_ZONES };

const assignedCountries = Object.entries(countries)
  .filter(([, country]) => !country.userAssigned)
  .sort(([a], [b]) => a.localeCompare(b));

const isoLanguages = Object.entries(languages)
  .filter(([code]) => ["ar", "bn", "de", "en", "es", "fr", "hi", "id", "ja", "ko", "pt", "ru", "tr", "ur", "zh"].includes(code))
  .sort(([a], [b]) => a.localeCompare(b));

export const COUNTRY_CODES = assignedCountries.map(([code]) => code);

export const CURRENCIES = Object.entries(currencies)
  .filter(([code, currency]) => !currency.withdrawn && code !== "XXX" && code !== "XTS")
  .map(([code, currency]) => ({ code, name: currency.name, minorUnits: currency.decimals }))
  .sort((a, b) => a.code.localeCompare(b.code));

export const LANGUAGE_CODES = isoLanguages.map(([code]) => code);

export const RTL_LANGUAGES = new Set(
  isoLanguages
    .filter(([, language]) => language.rtl)
    .map(([code]) => code),
);

export function countryRows() {
  return assignedCountries.map(([code, country]) => ({ code, name: country.name }));
}

export function currencyRows() {
  return CURRENCIES.map((currency) => ({ ...currency }));
}

export function languageRows() {
  return isoLanguages.map(([code, language]) => ({
    code,
    name: language.name,
    nativeName: language.native,
    direction: RTL_LANGUAGES.has(code) ? ("RTL" as const) : ("LTR" as const),
  }));
}

export interface ReferenceDataWriter {
  country: {
    upsert(args: {
      where: { code: string };
      create: { code: string; name: string };
      update: { name: string };
    }): PromiseLike<unknown>;
  };
  currency: {
    upsert(args: {
      where: { code: string };
      create: { code: string; name: string; minorUnits: number };
      update: { name: string; minorUnits: number };
    }): PromiseLike<unknown>;
  };
  language: {
    upsert(args: {
      where: { code: string };
      create: { code: string; name: string; nativeName: string; direction: "LTR" | "RTL" };
      update: { name: string; nativeName: string; direction: "LTR" | "RTL" };
    }): PromiseLike<unknown>;
  };
}

async function upsertInBatches<Row extends { code: string }>(
  rows: readonly Row[],
  upsert: (row: Row) => PromiseLike<unknown>,
) {
  const batchSize = 50;
  for (let start = 0; start < rows.length; start += batchSize) {
    await Promise.all(rows.slice(start, start + batchSize).map((row) => upsert(row)));
  }
}

/** Upsert reference rows without deleting records or touching any other tables. */
export async function upsertReferenceRows(writer: ReferenceDataWriter) {
  const countryData = countryRows();
  const currencyData = currencyRows();
  const languageData = languageRows();

  await upsertInBatches(countryData, (row) =>
    writer.country.upsert({ where: { code: row.code }, create: row, update: { name: row.name } }),
  );
  await upsertInBatches(currencyData, (row) =>
    writer.currency.upsert({
      where: { code: row.code },
      create: row,
      update: { name: row.name, minorUnits: row.minorUnits },
    }),
  );
  await upsertInBatches(languageData, (row) =>
    writer.language.upsert({
      where: { code: row.code },
      create: row,
      update: { name: row.name, nativeName: row.nativeName, direction: row.direction },
    }),
  );

  return {
    countries: countryData.length,
    currencies: currencyData.length,
    languages: languageData.length,
  };
}

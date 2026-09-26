// ---------------------------------------------------------------
// INTERNATIONAL STANDARD CODES
// Validators for the codes the database stores. The database also
// checks the basic format (see the migration), and codes must exist in
// the Country / Currency / Language reference tables.
// ---------------------------------------------------------------

/** ISO 3166-1 alpha-2 country code, e.g. "AE", "US", "GB", "SA". */
export function isCountryCode(value: string) {
  return /^[A-Z]{2}$/.test(value);
}

/** ISO 4217 currency code, e.g. "AED", "USD", "KWD". */
export function isCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

/**
 * BCP 47 language tag, e.g. "en", "ar", "en-GB", "zh-Hant". The tag must
 * already be in canonical form, so the database never holds "EN" and "en"
 * as two different languages.
 */
export function isLanguageTag(value: string) {
  // Same shape as the database CHECK: a 2–3 letter language, then subtags.
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value)) return false;
  try {
    return Intl.getCanonicalLocales(value)[0] === value;
  } catch {
    return false;
  }
}

let timeZones: Set<string> | null = null;

/** IANA timezone, e.g. "Asia/Dubai", "America/New_York", "Europe/London". */
export function isTimeZone(value: string) {
  if (value === "UTC") return true;
  timeZones ??= new Set(Intl.supportedValuesOf("timeZone"));
  if (timeZones.has(value)) return true;
  // Also accept valid aliases (e.g. "Asia/Calcutta") that the runtime understands.
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value.includes("/");
  } catch {
    return false;
  }
}

/**
 * The locale used to format numbers and dates for a store: an explicit
 * override, otherwise language + country (e.g. "ar" + "AE" -> "ar-AE").
 */
export function storeFormatLocale(store: {
  formatLocale?: string | null;
  defaultLanguage: string;
  countryCode: string;
}) {
  if (store.formatLocale) return store.formatLocale;
  const base = store.defaultLanguage.split("-")[0];
  return `${base}-${store.countryCode}`;
}

/** E.164 phone number, e.g. "+971500000000". */
export function isE164Phone(value: string) {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

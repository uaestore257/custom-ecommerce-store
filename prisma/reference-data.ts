// ---------------------------------------------------------------
// PLATFORM REFERENCE DATA (seeded into Country / Currency / Language)
// A starting set covering the markets we expect first. Add rows here
// (or directly in the tables) to support more; no code change needed.
// Display names come from Intl so they are spelled consistently.
// ---------------------------------------------------------------

/** ISO 3166-1 alpha-2 codes. */
export const COUNTRY_CODES = [
  // Gulf and Middle East / North Africa
  "AE", "SA", "QA", "KW", "BH", "OM", "JO", "EG", "LB", "IQ", "MA", "TN", "DZ", "LY", "TR",
  // Americas
  "US", "CA", "MX", "BR", "AR", "CL", "CO", "PE",
  // Europe
  "GB", "IE", "FR", "DE", "NL", "BE", "LU", "ES", "PT", "IT", "CH", "AT", "SE", "NO", "DK",
  "FI", "PL", "CZ", "GR", "RO", "HU",
  // Asia-Pacific
  "IN", "PK", "BD", "LK", "NP", "CN", "JP", "KR", "SG", "MY", "ID", "TH", "PH", "VN", "HK",
  "TW", "AU", "NZ",
  // Sub-Saharan Africa
  "ZA", "NG", "KE", "GH", "ET",
] as const;

/**
 * ISO 4217 codes with their official minor units (decimal places).
 * Includes 0-decimal (JPY, KRW, CLP, VND, ISK, UGX) and 3-decimal
 * (KWD, BHD, OMR, JOD, TND, LYD, IQD) currencies on purpose.
 */
export const CURRENCIES: { code: string; minorUnits: number }[] = [
  { code: "AED", minorUnits: 2 }, { code: "SAR", minorUnits: 2 }, { code: "QAR", minorUnits: 2 },
  { code: "KWD", minorUnits: 3 }, { code: "BHD", minorUnits: 3 }, { code: "OMR", minorUnits: 3 },
  { code: "JOD", minorUnits: 3 }, { code: "EGP", minorUnits: 2 }, { code: "IQD", minorUnits: 3 },
  { code: "MAD", minorUnits: 2 }, { code: "TND", minorUnits: 3 }, { code: "LYD", minorUnits: 3 },
  { code: "TRY", minorUnits: 2 },
  { code: "USD", minorUnits: 2 }, { code: "CAD", minorUnits: 2 }, { code: "MXN", minorUnits: 2 },
  { code: "BRL", minorUnits: 2 }, { code: "CLP", minorUnits: 0 },
  { code: "EUR", minorUnits: 2 }, { code: "GBP", minorUnits: 2 }, { code: "CHF", minorUnits: 2 },
  { code: "SEK", minorUnits: 2 }, { code: "NOK", minorUnits: 2 }, { code: "DKK", minorUnits: 2 },
  { code: "PLN", minorUnits: 2 }, { code: "ISK", minorUnits: 0 },
  { code: "INR", minorUnits: 2 }, { code: "PKR", minorUnits: 2 }, { code: "BDT", minorUnits: 2 },
  { code: "LKR", minorUnits: 2 }, { code: "CNY", minorUnits: 2 }, { code: "JPY", minorUnits: 0 },
  { code: "KRW", minorUnits: 0 }, { code: "SGD", minorUnits: 2 }, { code: "MYR", minorUnits: 2 },
  { code: "IDR", minorUnits: 2 }, { code: "THB", minorUnits: 2 }, { code: "PHP", minorUnits: 2 },
  { code: "VND", minorUnits: 0 }, { code: "HKD", minorUnits: 2 }, { code: "AUD", minorUnits: 2 },
  { code: "NZD", minorUnits: 2 },
  { code: "ZAR", minorUnits: 2 }, { code: "NGN", minorUnits: 2 }, { code: "KES", minorUnits: 2 },
  { code: "UGX", minorUnits: 0 },
];

/** BCP 47 language tags. RTL languages are listed explicitly. */
export const LANGUAGE_CODES = [
  "en", "ar", "fr", "es", "de", "it", "pt", "nl", "tr", "ru",
  "ur", "hi", "bn", "fa", "he", "zh", "ja", "ko", "id", "ms",
] as const;

export const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export function countryRows() {
  return COUNTRY_CODES.map((code) => ({ code, name: regionNames.of(code) ?? code }));
}

export function currencyRows() {
  return CURRENCIES.map((c) => ({ ...c, name: currencyNames.of(c.code) ?? c.code }));
}

export function languageRows() {
  return LANGUAGE_CODES.map((code) => ({
    code,
    name: languageNames.of(code) ?? code,
    nativeName: new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code,
    direction: RTL_LANGUAGES.has(code) ? ("RTL" as const) : ("LTR" as const),
  }));
}

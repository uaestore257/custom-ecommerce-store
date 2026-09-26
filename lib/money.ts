// ---------------------------------------------------------------
// MONEY HELPERS
// Amounts are stored as whole numbers in the currency's smallest unit
// ("minor units"), as BigInt, next to an ISO 4217 currency code.
//   USD 12.34  -> 1234n   (2 minor units)
//   JPY 1500   -> 1500n   (0 minor units)
//   KWD 1.250  -> 1250n   (3 minor units)
// Conversions use exact string/BigInt arithmetic — never floating point.
// The number of minor units comes from the Currency table (ISO 4217),
// not from the browser, so every currency is handled the same way.
// ---------------------------------------------------------------

export class MoneyError extends Error {}

function assertMinorUnits(minorUnits: number) {
  if (!Number.isInteger(minorUnits) || minorUnits < 0 || minorUnits > 4) {
    throw new MoneyError(`Unsupported minor units: ${minorUnits}`);
  }
}

/**
 * Parses a decimal string such as "2499", "2499.5" or "1.250" into minor
 * units. Refuses more decimal places than the currency allows instead of
 * silently rounding.
 */
export function toMinorUnits(amount: string, minorUnits: number): bigint {
  assertMinorUnits(minorUnits);
  const value = amount.trim();
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new MoneyError(`Invalid amount: "${amount}"`);
  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > minorUnits) {
    throw new MoneyError(
      `"${amount}" has more than ${minorUnits} decimal place${minorUnits === 1 ? "" : "s"}`,
    );
  }
  const minor = BigInt(whole + fraction.padEnd(minorUnits, "0"));
  return sign ? -minor : minor;
}

/** Minor units back to an exact decimal string: 1250n, 3 -> "1.250". */
export function fromMinorUnits(minor: bigint, minorUnits: number): string {
  assertMinorUnits(minorUnits);
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(minorUnits + 1, "0");
  const whole = minorUnits === 0 ? digits : digits.slice(0, -minorUnits);
  const fraction = minorUnits === 0 ? "" : `.${digits.slice(-minorUnits)}`;
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

/**
 * Converts a JavaScript number from the old browser demo (e.g. 2499 or
 * 24.75) into minor units. Only for importing existing demo data: new
 * code should always pass decimal strings to toMinorUnits().
 */
export function legacyNumberToMinorUnits(amount: number, minorUnits: number): bigint {
  assertMinorUnits(minorUnits);
  if (!Number.isFinite(amount)) throw new MoneyError(`Invalid amount: ${amount}`);
  return toMinorUnits(amount.toFixed(minorUnits), minorUnits);
}

/**
 * Formats minor units for display in any locale, e.g.
 *   formatMinorUnits(249900n, "AED", 2, "en-AE") -> "AED 2,499.00"
 *   formatMinorUnits(1250n,   "KWD", 3, "ar-KW") -> "١٫٢٥٠ د.ك.‏"
 * The digits shown always follow ISO 4217 (minorUnits), not the
 * browser's own rules. Exact for any size: the value is passed to Intl
 * as a decimal string, so it never becomes a floating-point number.
 */
export function formatMinorUnits(
  minor: bigint,
  currency: string,
  minorUnits: number,
  locale: string,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  });
  // Intl accepts exact decimal strings (ES2023). The cast is needed until
  // TypeScript's lib types include the string overload.
  return formatter.format(fromMinorUnits(minor, minorUnits) as unknown as number);
}

import type { CurrencyCode } from "./types";

export function formatMoney(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** Avoids floating point noise such as 0.1 + 0.2 = 0.30000000000000004. */
export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

/** "Client Store A", "Client Store B", ... based on list position. */
export function storeLetterLabel(index: number) {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Client Store ${label}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

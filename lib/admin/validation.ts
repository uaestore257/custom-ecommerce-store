// ---------------------------------------------------------------
// ADMIN INPUT VALIDATION (shared by client forms and the server)
// The server ALWAYS re-validates: these functions take untrusted input
// (anything a browser could POST), pick only the fields they know, and
// return either clean values or field errors. Unknown fields — such as
// a `storeId` smuggled into a form — are ignored.
// ---------------------------------------------------------------
import { MoneyError, toMinorUnits } from "@/lib/money";
import { isCountryCode, isCurrencyCode, isE164Phone, isLanguageTag, isTimeZone } from "@/lib/standards";
import { isEmail, isHexColor, isHttpUrl, isSlug } from "@/lib/validation";
import { passwordProblem } from "@/lib/auth/password-policy";
import type { DbProductStatus, DbStoreStatus } from "./types";

export type Errors = Record<string, string>;

/** Statuses a new store can start with. */
export const STORE_STATUS_VALUES: DbStoreStatus[] = ["DRAFT", "ACTIVE", "PAUSED"];
/** Statuses the platform owner can set later (suspension is platform-only). */
export const PLATFORM_STORE_STATUS_VALUES: DbStoreStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "SUSPENDED"];
export const PRODUCT_STATUS_VALUES: DbProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
export const PAYMENT_METHOD_IDS = ["cash_on_delivery", "card_on_delivery", "bank_transfer", "online_card"] as const;

export const LIMITS = {
  storeName: 80,
  personName: 80,
  email: 254,
  slug: 60,
  url: 500,
  tagline: 120,
  heroTitle: 120,
  heroText: 300,
  aboutText: 4000,
  address: 300,
  productName: 120,
  description: 5000,
  categoryName: 40,
  maxStock: 1_000_000,
} as const;

// ---------- helpers for untrusted input ----------

function record(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function str(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function bool(input: Record<string, unknown>, key: string) {
  return input[key] === true || input[key] === "true" || input[key] === "on";
}

function tooLong(value: string, max: number) {
  return value.length > max ? `Keep this under ${max} characters.` : undefined;
}

/** Removes spaces, dashes and brackets: "+971 4 000 0000" -> "+97140000000". */
export function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}

/** Parses a money string for a currency, returning minor units or an error message. */
export function parseMoney(value: string, minorUnits: number, { allowZero = true } = {}) {
  if (!value) return { error: "Enter an amount." };
  if (!/^\d+(\.\d+)?$/.test(value)) return { error: "Enter a number such as 25 or 25.50 (no currency symbol)." };
  try {
    const minor = toMinorUnits(value, minorUnits);
    if (!allowZero && minor <= BigInt(0)) return { error: "Enter an amount greater than 0." };
    return { minor };
  } catch (error) {
    if (error instanceof MoneyError) {
      return {
        error:
          minorUnits === 0
            ? "This currency has no decimal places."
            : `Use at most ${minorUnits} decimal place${minorUnits === 1 ? "" : "s"} for this currency.`,
      };
    }
    throw error;
  }
}

// ---------- stores ----------

export interface StoreReference {
  countries: Set<string>;
  currencies: Map<string, number>; // code -> minor units
  languages: Set<string>;
}

/** Store fields edited in store settings. No status and no owner: those have their own platform-only actions. */
export interface CleanStoreProfile {
  name: string;
  slug: string;
  businessType: string | null;
  countryCode: string;
  baseCurrency: string;
  timezone: string;
  defaultLanguage: string;
  languages: string[];
  accentColor: string;
}

export interface CleanStoreOwner {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

/** Everything needed to create a store. */
export interface CleanStoreBase extends CleanStoreProfile, CleanStoreOwner {
  status: DbStoreStatus;
}

/** Delivery and payment settings: the part of store settings a store's owner may change. */
export interface CleanCommerceSettings {
  deliveryFeeMinor: bigint;
  freeDeliveryOverMinor: bigint | null;
  paymentMethods: Record<(typeof PAYMENT_METHOD_IDS)[number], boolean>;
}

export interface CleanStoreSettings extends CleanStoreProfile, CleanCommerceSettings {
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  content: { tagline: string; heroTitle: string; heroText: string; aboutText: string };
}

/**
 * Delivery fee, free-delivery threshold and payment methods, in the
 * store's currency. Online card payment is always off (no provider).
 */
export function validateCommerceSettings(input: unknown, minorUnits: number) {
  const raw = record(input);
  const errors: Errors = {};
  const fee = parseMoney(str(raw, "deliveryFee"), minorUnits);
  if (fee.error) errors.deliveryFee = fee.error;
  const freeOverRaw = str(raw, "freeDeliveryThreshold");
  const freeOver = freeOverRaw && freeOverRaw !== "0" ? parseMoney(freeOverRaw, minorUnits) : { minor: null };
  if ("error" in freeOver && freeOver.error) errors.freeDeliveryThreshold = freeOver.error;

  const methodsRaw = record(raw.paymentMethods);
  const paymentMethods = Object.fromEntries(
    // Online card payment needs a payment provider, which is not connected.
    PAYMENT_METHOD_IDS.map((id) => [id, id === "online_card" ? false : bool(methodsRaw, id)]),
  ) as CleanCommerceSettings["paymentMethods"];

  const values: CleanCommerceSettings = {
    deliveryFeeMinor: fee.minor ?? BigInt(0),
    freeDeliveryOverMinor: "minor" in freeOver && freeOver.minor ? freeOver.minor : null,
    paymentMethods,
  };
  return { values, errors: clean(errors) };
}

export function validateStoreOwner(input: unknown, options: { requirePassword?: boolean } = {}) {
  const raw = record(input);
  const errors: Errors = {};
  const v: CleanStoreOwner = {
    ownerName: str(raw, "ownerName"),
    ownerEmail: str(raw, "ownerEmail").toLowerCase(),
    ownerPassword: typeof raw.ownerPassword === "string" ? raw.ownerPassword : "",
  };
  if (v.ownerName.length < 2) errors.ownerName = "Enter the owner or contact name.";
  else errors.ownerName = tooLong(v.ownerName, LIMITS.personName) as string;
  if (!isEmail(v.ownerEmail) || v.ownerEmail.length > LIMITS.email) errors.ownerEmail = "Enter a valid email address.";
  if (options.requirePassword || v.ownerPassword) {
    const problem = passwordProblem(v.ownerPassword, v.ownerEmail);
    if (problem) errors.ownerPassword = problem;
  }
  return { values: v, errors: clean(errors) };
}

/** For creating a store: profile + starting status + owner. */
export function validateStoreBase(input: unknown, ref: StoreReference) {
  const raw = record(input);
  const profile = validateStoreProfile(input, ref);
  const owner = validateStoreOwner(input, { requirePassword: true });
  const status = str(raw, "status") as DbStoreStatus;
  const errors: Errors = { ...profile.errors, ...owner.errors };
  if (!STORE_STATUS_VALUES.includes(status)) errors.status = "Choose a valid status.";
  const values: CleanStoreBase = { ...profile.values, ...owner.values, status };
  return { values, errors: clean(errors) };
}

export function validateStoreProfile(input: unknown, ref: StoreReference) {
  const raw = record(input);
  const errors: Errors = {};
  const v = {
    name: str(raw, "name"),
    slug: str(raw, "slug").toLowerCase(),
    businessType: str(raw, "businessType") || null,
    countryCode: str(raw, "countryCode"),
    baseCurrency: str(raw, "baseCurrency"),
    timezone: str(raw, "timezone"),
    defaultLanguage: str(raw, "defaultLanguage"),
    languages: Array.isArray(raw.languages)
      ? [...new Set(raw.languages.filter((l): l is string => typeof l === "string"))]
      : [],
    accentColor: str(raw, "accentColor").toLowerCase(),
  };

  if (v.name.length < 2) errors.name = "Enter the store name.";
  else errors.name = tooLong(v.name, LIMITS.storeName) as string;
  if (!isSlug(v.slug)) errors.slug = "Use lowercase letters, numbers and single hyphens, e.g. my-store.";
  else errors.slug = tooLong(v.slug, LIMITS.slug) as string;
  if (v.businessType) errors.businessType = tooLong(v.businessType, 40) as string;
  if (!isCountryCode(v.countryCode) || !ref.countries.has(v.countryCode)) errors.countryCode = "Choose a country.";
  if (!isCurrencyCode(v.baseCurrency) || !ref.currencies.has(v.baseCurrency)) errors.baseCurrency = "Choose a currency.";
  if (!isTimeZone(v.timezone)) errors.timezone = "Choose a timezone.";
  const unknownLanguage = v.languages.find((l) => !isLanguageTag(l) || !ref.languages.has(l));
  if (v.languages.length === 0) errors.languages = "Choose at least one language.";
  else if (unknownLanguage) errors.languages = `Unsupported language: ${unknownLanguage}`;
  if (!v.defaultLanguage || !ref.languages.has(v.defaultLanguage)) errors.defaultLanguage = "Choose the default language.";
  else if (!v.languages.includes(v.defaultLanguage)) errors.defaultLanguage = "The default language must be one of the store's languages.";
  if (!isHexColor(v.accentColor)) errors.accentColor = "Use a hex colour such as #0f766e.";

  return { values: v as CleanStoreProfile, errors: clean(errors) };
}

/** Store settings. Status and owner fields are ignored even if sent. */
export function validateStoreSettings(input: unknown, ref: StoreReference) {
  const raw = record(input);
  const base = validateStoreProfile(input, ref);
  const errors: Errors = { ...base.errors };
  const minorUnits = ref.currencies.get(base.values.baseCurrency) ?? 2;

  const logoUrl = str(raw, "logoUrl");
  const contactEmail = str(raw, "contactEmail").toLowerCase();
  const contactPhone = normalizePhone(str(raw, "contactPhone"));
  const contactAddress = str(raw, "contactAddress");
  const content = {
    tagline: str(raw, "tagline"),
    heroTitle: str(raw, "heroTitle"),
    heroText: str(raw, "heroText"),
    aboutText: str(raw, "aboutText"),
  };

  if (logoUrl && (!isHttpUrl(logoUrl) || logoUrl.length > LIMITS.url)) errors.logoUrl = "Enter a full URL starting with https://";
  if (contactEmail && !isEmail(contactEmail)) errors.contactEmail = "Enter a valid email address.";
  if (contactPhone && !isE164Phone(contactPhone)) {
    errors.contactPhone = "Use international format with country code, e.g. +971 4 000 0000.";
  }
  if (contactAddress) errors.contactAddress = tooLong(contactAddress, LIMITS.address) as string;
  if (!content.heroTitle) errors.heroTitle = "Enter a homepage headline.";
  else errors.heroTitle = tooLong(content.heroTitle, LIMITS.heroTitle) as string;
  errors.tagline = tooLong(content.tagline, LIMITS.tagline) as string;
  errors.heroText = tooLong(content.heroText, LIMITS.heroText) as string;
  errors.aboutText = tooLong(content.aboutText, LIMITS.aboutText) as string;

  const commerce = validateCommerceSettings(input, minorUnits);
  Object.assign(errors, commerce.errors);

  const values: CleanStoreSettings = {
    ...base.values,
    logoUrl: logoUrl || null,
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
    contactAddress: contactAddress || null,
    content,
    ...commerce.values,
  };
  return { values, errors: clean(errors) };
}

// ---------- products ----------

export interface CleanProduct {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  priceMinor: bigint;
  compareAtMinor: bigint | null;
  imageUrl: string | null;
  stock: number;
  status: DbProductStatus;
  featured: boolean;
}

/**
 * The stock an edit form started from (`expectedStock`), or null if it is
 * missing or malformed. The server only changes stock if it still equals
 * this, so an old form can't overwrite a sale made since it was opened.
 */
export function readExpectedStock(input: unknown): number | null {
  const raw = record(input).expectedStock;
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!/^\d+$/.test(text) || Number(text) > LIMITS.maxStock) return null;
  return Number(text);
}

export function validateProduct(input: unknown, minorUnits: number) {
  const raw = record(input);
  const errors: Errors = {};
  const name = str(raw, "name");
  const sku = str(raw, "sku").toUpperCase();
  const categoryId = str(raw, "categoryId");
  const description = str(raw, "description");
  const imageUrl = str(raw, "imageUrl");
  const stockRaw = str(raw, "stock");
  const status = str(raw, "status") as DbProductStatus;

  if (name.length < 2) errors.name = "Enter a product name.";
  else errors.name = tooLong(name, LIMITS.productName) as string;
  if (!/^[A-Z0-9_-]{2,30}$/.test(sku)) errors.sku = "Use 2–30 letters, numbers, hyphens or underscores.";
  if (!categoryId) errors.categoryId = "Choose a category.";
  if (description.length < 10) errors.description = "Write at least 10 characters.";
  else errors.description = tooLong(description, LIMITS.description) as string;

  const price = parseMoney(str(raw, "price"), minorUnits, { allowZero: false });
  if (price.error) errors.price = price.error;
  const compareRaw = str(raw, "compareAtPrice");
  let compareAtMinor: bigint | null = null;
  if (compareRaw) {
    const compare = parseMoney(compareRaw, minorUnits);
    if (compare.error) errors.compareAtPrice = compare.error;
    else if (price.minor !== undefined && compare.minor! <= price.minor) {
      errors.compareAtPrice = "Must be higher than the price, or leave empty.";
    } else compareAtMinor = compare.minor!;
  }

  if (!/^\d+$/.test(stockRaw) || Number(stockRaw) > LIMITS.maxStock) {
    errors.stock = "Enter a whole number (0 or more).";
  }
  if (imageUrl && (!isHttpUrl(imageUrl) || imageUrl.length > LIMITS.url)) {
    errors.imageUrl = "Enter a full URL starting with https://";
  }
  if (!PRODUCT_STATUS_VALUES.includes(status)) errors.status = "Choose a valid status.";

  const values: CleanProduct = {
    name,
    sku,
    categoryId,
    description,
    priceMinor: price.minor ?? BigInt(0),
    compareAtMinor,
    imageUrl: imageUrl || null,
    stock: Number(stockRaw) || 0,
    status,
    featured: bool(raw, "featured"),
  };
  return { values, errors: clean(errors) };
}

// ---------- categories ----------

export function validateCategory(input: unknown) {
  const raw = record(input);
  const errors: Errors = {};
  const name = str(raw, "name");
  const imageUrl = str(raw, "imageUrl");
  if (name.length < 2) errors.name = "Enter a category name (at least 2 characters).";
  else errors.name = tooLong(name, LIMITS.categoryName) as string;
  if (imageUrl && (!isHttpUrl(imageUrl) || imageUrl.length > LIMITS.url)) {
    errors.imageUrl = "Enter a full image URL starting with https://";
  }
  return { values: { name, imageUrl: imageUrl || null }, errors: clean(errors) };
}

/** Drops empty entries so `Object.keys(errors).length` means "has errors". */
function clean(errors: Errors): Errors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));
}

export function hasErrors(errors: Errors) {
  return Object.keys(errors).length > 0;
}

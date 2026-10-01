// ---------------------------------------------------------------
// CHECKOUT INPUT VALIDATION (shared by the checkout form and the server)
//
// The server ALWAYS re-validates: this takes untrusted input and returns
// clean values or field errors. It only reads the fields listed below —
// any price, total, stock or other field a browser sends is ignored. The
// store is never taken from here: the server resolves it itself and only
// compares it with `storeId` (the store the cart was built for).
// `expectedTotalMinor` is the total the shopper was shown; the server
// only compares it with its own total (and refuses on a difference) —
// it is never used to calculate anything.
// ---------------------------------------------------------------
import { UAE_EMIRATES } from "./config";
import { isE164Phone } from "./standards";
import { isStoreIdCookieValue } from "./storefront-cookie";
import { isEmail, isUaePhone } from "./validation";

/** Methods supported by the checkout core; unavailable providers are filtered server-side. */
export const CHECKOUT_PAYMENT_METHODS = [
  "cash_on_delivery",
  "bank_transfer",
  "cash_on_pickup",
  "stripe_checkout",
  "jazzcash",
  "easypaisa",
] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];
export type CheckoutFulfillmentMethod = "DELIVERY" | "PICKUP";

export function calculateDeliveryMinor(
  products: readonly { deliveryFeeMinor: bigint; freeDelivery: boolean; pickupOnly: boolean; quantity: number }[],
  fulfillmentMethod: CheckoutFulfillmentMethod,
): { ok: true; deliveryMinor: bigint } | { ok: false; reason: "pickup-required" | "invalid-product" } {
  if (products.some((product) => product.freeDelivery && product.pickupOnly)) {
    return { ok: false, reason: "invalid-product" };
  }
  if (fulfillmentMethod === "PICKUP") return { ok: true, deliveryMinor: BigInt(0) };
  if (products.some((product) => product.pickupOnly)) return { ok: false, reason: "pickup-required" };
  return {
    ok: true,
    deliveryMinor: products.reduce(
      (sum, product) =>
        sum +
        (product.freeDelivery
          ? BigInt(0)
          : product.deliveryFeeMinor * BigInt(product.quantity)),
      BigInt(0),
    ),
  };
}

export const CHECKOUT_LIMITS = {
  name: 80,
  email: 254,
  address: 300,
  city: 80,
  maxLines: 50,
  maxQuantity: 999,
} as const;

export type CheckoutField = "name" | "email" | "phone" | "address" | "city" | "fulfillmentMethod" | "paymentMethod";
export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

export interface CleanCheckout {
  storeId: string;
  idempotencyKey: string;
  expectedTotalMinor: bigint;
  fulfillmentMethod: CheckoutFulfillmentMethod;
  /** One line per product, sorted by product id. */
  items: { productId: string; quantity: number }[];
  customer: { name: string; email: string; phone: string };
  address: { line1: string; city: string; region: string | null } | null;
  paymentMethod: CheckoutPaymentMethod;
}

export type CheckoutValidation =
  | { ok: true; values: CleanCheckout }
  | { ok: false; errors: CheckoutFieldErrors; requestError?: string };

const BAD_REQUEST = "This checkout couldn't be read. Please refresh the page and try again.";

function record(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function str(raw: Record<string, unknown>, key: string) {
  const value = raw[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * International format: "+971501234567". UAE stores also accept local
 * forms (050 123 4567, 00971 50 …); other stores need the "+" form.
 */
export function toE164Phone(value: string, countryCode: string): string | null {
  const compact = value.replace(/[\s().-]/g, "");
  if (countryCode === "AE") {
    if (!isUaePhone(compact)) return null;
    const national = compact.replace(/^(\+971|00971|0)/, "");
    return `+971${national}`;
  }
  const plus = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  return isE164Phone(plus) ? plus : null;
}

/** An idempotency key: a random id the browser generates per checkout attempt. */
export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9-]{16,64}$/.test(value);
}

function cleanItems(value: unknown): CleanCheckout["items"] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > CHECKOUT_LIMITS.maxLines) return null;
  const merged = new Map<string, number>();
  for (const entry of value) {
    const item = record(entry);
    const productId = item.productId;
    const quantity = item.quantity;
    if (!isStoreIdCookieValue(productId)) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) return null;
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  const items = [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  if (items.some((i) => i.quantity > CHECKOUT_LIMITS.maxQuantity)) return null;
  return items.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
}

/** Field checks only (for the form, before it is sent). */
export function validateCheckoutFields(input: unknown, countryCode: string): CheckoutFieldErrors {
  const raw = record(input);
  const errors: CheckoutFieldErrors = {};
  const name = str(raw, "name");
  const email = str(raw, "email");
  const address = str(raw, "address");
  const city = str(raw, "city");
  const isUae = countryCode === "AE";
  const fulfillmentMethod = str(raw, "fulfillmentMethod");
  const pickup = fulfillmentMethod === "PICKUP";

  if (name.length < 2) errors.name = "Please enter your full name.";
  else if (name.length > CHECKOUT_LIMITS.name) errors.name = `Keep this under ${CHECKOUT_LIMITS.name} characters.`;
  if (!isEmail(email)) errors.email = "Please enter a valid email address.";
  else if (email.length > CHECKOUT_LIMITS.email) errors.email = `Keep this under ${CHECKOUT_LIMITS.email} characters.`;
  if (!toE164Phone(str(raw, "phone"), countryCode)) {
    errors.phone = isUae
      ? "Please enter a UAE phone number, e.g. 050 123 4567."
      : "Please enter your phone number with the country code, e.g. +44 20 7946 0000.";
  }
  if (fulfillmentMethod !== "DELIVERY" && fulfillmentMethod !== "PICKUP") {
    errors.fulfillmentMethod = "Choose delivery or pickup.";
  }
  if (!pickup && address.length < 5) errors.address = "Please enter your delivery address.";
  else if (!pickup && address.length > CHECKOUT_LIMITS.address) errors.address = `Keep this under ${CHECKOUT_LIMITS.address} characters.`;
  if (!pickup && isUae) {
    if (!(UAE_EMIRATES as readonly string[]).includes(city)) errors.city = "Please choose your emirate.";
  } else if (!pickup && !city) errors.city = "Please enter your city.";
  else if (!pickup && city.length > CHECKOUT_LIMITS.city) errors.city = `Keep this under ${CHECKOUT_LIMITS.city} characters.`;
  if (!(CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(str(raw, "paymentMethod"))) {
    errors.paymentMethod = "Please choose a payment method.";
  } else if (fulfillmentMethod === "PICKUP" && str(raw, "paymentMethod") === "cash_on_delivery") {
    errors.paymentMethod = "Choose Pay on pickup for pickup orders.";
  } else if (fulfillmentMethod === "DELIVERY" && str(raw, "paymentMethod") === "cash_on_pickup") {
    errors.paymentMethod = "Pay on pickup is only available for pickup orders.";
  }
  return errors;
}

/**
 * Full validation of what the browser sent.
 * @param countryCode the SERVER-resolved store's country (decides phone and address rules)
 */
export function validateCheckout(input: unknown, countryCode: string): CheckoutValidation {
  const raw = record(input);
  const expected = raw.expectedTotalMinor;
  const items = cleanItems(raw.items);
  if (
    !isStoreIdCookieValue(raw.storeId) ||
    !isIdempotencyKey(raw.idempotencyKey) ||
    typeof expected !== "string" ||
    !/^\d{1,18}$/.test(expected) ||
    !items
  ) {
    return { ok: false, errors: {}, requestError: BAD_REQUEST };
  }

  const errors = validateCheckoutFields(raw, countryCode);
  if (Object.values(errors).some(Boolean)) return { ok: false, errors };

  const city = str(raw, "city");
  return {
    ok: true,
    values: {
      storeId: raw.storeId,
      idempotencyKey: raw.idempotencyKey,
      expectedTotalMinor: BigInt(expected),
      fulfillmentMethod: str(raw, "fulfillmentMethod") as CheckoutFulfillmentMethod,
      items,
      customer: {
        name: str(raw, "name"),
        email: str(raw, "email").toLowerCase(),
        phone: toE164Phone(str(raw, "phone"), countryCode)!,
      },
      address:
        str(raw, "fulfillmentMethod") === "PICKUP"
          ? null
          : { line1: str(raw, "address"), city, region: countryCode === "AE" ? city : null },
      paymentMethod: str(raw, "paymentMethod") as CheckoutPaymentMethod,
    },
  };
}

// ---------- What a successful order returns to the browser ----------

/** A placed order, as the confirmation screen shows it. Money as minor-unit strings. */
export interface PlacedOrder {
  orderNumber: string;
  paymentTransactionId?: string;
  status: "PENDING";
  paymentStatus: "UNPAID";
  paymentMethod: CheckoutPaymentMethod;
  fulfillmentMethod: CheckoutFulfillmentMethod;
  currency: string;
  lines: { name: string; quantity: number; lineTotalMinor: string }[];
  subtotalMinor: string;
  shippingMinor: string;
  totalMinor: string;
  deliveryTo: string;
  paymentInfo?: { label: string; value: string }[];
}

export type ProviderCheckoutRedirect =
  | { kind: "redirect"; url: string }
  | { kind: "post"; action: string; fields: Record<string, string> };

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder; duplicate: boolean; checkout?: ProviderCheckoutRedirect }
  | {
      ok: false;
      error: string;
      fieldErrors?: CheckoutFieldErrors;
      /**
       * true = it is safe to retry with the SAME idempotency key (an
       * unexpected or temporary failure). false = the request was refused;
       * the next attempt must use a new key.
       */
      retrySameKey: boolean;
    };

"use server";

// ---------------------------------------------------------------
// PUBLIC STOREFRONT SERVER ACTIONS
// Unlike app/admin/actions.ts, these need no signed-in session — anyone
// on the public storefront can call them. The store is ALWAYS resolved
// here on the server from the request's Host (resolveStoreForHost, rules
// in lib/store-host.ts); a store id sent by the browser is only compared
// with it, never used instead of it.
// ---------------------------------------------------------------
import type { ActionResult } from "@/lib/admin/types";
import type { PlaceOrderResult } from "@/lib/checkout";
import { localizeInquiryResult, localizeOrderResult } from "@/lib/storefront-action-messages";
import { trustedClientIp } from "@/lib/server/client-ip";
import { getDb } from "@/lib/server/db";
import { submitInquiry } from "@/lib/server/inquiries";
import { sendOrderEmails } from "@/lib/server/order-emails";
import { ORDER_MESSAGES, placeOrder } from "@/lib/server/orders";
import { requestRuntime } from "@/lib/server/request-runtime";
import { resolveStoreForHost } from "@/lib/server/storefront/catalog";
import { storeIdFromCookieHeader } from "@/lib/storefront-cookie";
import { DEFAULT_UI_LOCALE, resolveUiLocale, type UiLocale } from "@/lib/storefront-i18n";
import { getTemplateDefinition, resolveTemplateKey } from "@/lib/templates/registry";

const GENERIC_ERROR = "Something went wrong while sending your message. Please try again.";
const INQUIRY_STORE_UNAVAILABLE = "This store isn't accepting messages right now.";
const STALE_PAGE = "This page is out of date. Please reload it and try again.";
const ORDER_GENERIC_ERROR = "Something went wrong while placing your order. Please try again.";

/** Mirrors app/admin/actions.ts's isId(): a plausible id, not yet a real store. */
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

/** The public store this Host serves (a preview cookie only counts on the explicit temporary preview host). */
function storeForRequest(db: ReturnType<typeof getDb>, headers: Headers) {
  return resolveStoreForHost(db, headers.get("host") ?? "", storeIdFromCookieHeader(headers.get("cookie")));
}

/**
 * The interface language of the store's pages (lib/storefront-i18n.ts),
 * for translating a refusal. Read only after a failure; any problem
 * reading it keeps English, never the failure itself.
 */
async function storeUiLocale(db: ReturnType<typeof getDb>, storeId: string | null): Promise<{ locale: UiLocale; countryCode: string }> {
  try {
    const store = storeId
      ? await db.store.findUnique({ where: { id: storeId }, select: { defaultLanguage: true, templateKey: true, countryCode: true } })
      : null;
    if (!store) return { locale: DEFAULT_UI_LOCALE, countryCode: "" };
    const declared = getTemplateDefinition(resolveTemplateKey(store.templateKey)).manifest.capabilities.uiLocales;
    return { locale: resolveUiLocale(store.defaultLanguage, declared), countryCode: store.countryCode };
  } catch {
    return { locale: DEFAULT_UI_LOCALE, countryCode: "" };
  }
}

/** storeId: the store the contact page shows; it must be the one the host serves. */
export async function submitInquiryAction(storeId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!isId(storeId)) return { ok: false, error: "Invalid request." };
  const { result, hostStore } = await submitInquiryForHost(storeId, input);
  if (result.ok) return result;
  // The language of the store this host serves; else of the page's store.
  const { locale } = await storeUiLocale(getDb(), hostStore ?? storeId);
  return localizeInquiryResult(result, input, locale);
}

async function submitInquiryForHost(
  storeId: string,
  input: unknown,
): Promise<{ result: ActionResult<{ id: string }>; hostStore: string | null }> {
  let hostStore: string | null = null;
  try {
    // requestRuntime() (not next/headers directly) so database tests can
    // inject headers the same way tests/db/auth-actions.test.ts does for
    // admin actions — see setRequestRuntimeForTests() and
    // tests/db/inquiry-actions.test.ts.
    const headers = await requestRuntime().headers();
    const db = getDb();
    hostStore = await storeForRequest(db, headers);
    if (!hostStore) return { result: { ok: false, error: INQUIRY_STORE_UNAVAILABLE }, hostStore };
    if (hostStore !== storeId) return { result: { ok: false, error: STALE_PAGE }, hostStore };
    return { result: await submitInquiry(db, hostStore, input, { ipAddress: trustedClientIp(headers) }), hostStore };
  } catch (error) {
    console.error("[storefront action] submitInquiry failed", error);
    return { result: { ok: false, error: GENERIC_ERROR }, hostStore };
  }
}

/**
 * Places a real order using a method enabled for the store
 * the request's Host serves; the storeId inside `input` is only compared
 * with it (placeOrder refuses a cart from another store).
 */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const { result, storeId } = await placeOrderForHost(input);
  if (result.ok) return result;
  // The host's store; if the host serves none, the store the cart was built
  // for (only to choose the language of the refusal).
  const cartStoreId = input && typeof input === "object" ? (input as Record<string, unknown>).storeId : undefined;
  const { locale, countryCode } = await storeUiLocale(getDb(), storeId ?? (isId(cartStoreId) ? cartStoreId : null));
  return localizeOrderResult(result, input, countryCode, locale);
}

async function placeOrderForHost(input: unknown): Promise<{ result: PlaceOrderResult; storeId: string | null }> {
  let storeId: string | null = null;
  try {
    const headers = await requestRuntime().headers();
    const db = getDb();
    storeId = await storeForRequest(db, headers);
    if (!storeId) return { result: { ok: false, error: ORDER_MESSAGES.storeUnavailable, retrySameKey: false }, storeId };
    const result = await placeOrder(db, storeId, input, { ipAddress: trustedClientIp(headers) });
    // Emails only for a NEW order, and only after the response: the order
    // is already committed, so an email problem can't affect it.
    if (result.ok && !result.duplicate) {
      const orderNumber = result.order.orderNumber;
      const orderStoreId = storeId;
      requestRuntime().afterResponse?.(() => sendOrderEmails(db, orderStoreId, orderNumber));
    }
    return { result, storeId };
  } catch (error) {
    // Logged for the developer; the browser only gets a generic message.
    // Nothing was saved, so retrying with the same idempotency key is safe.
    console.error("[storefront action] placeOrder failed", error);
    return { result: { ok: false, error: ORDER_GENERIC_ERROR, retrySameKey: true }, storeId };
  }
}

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
import { trustedClientIp } from "@/lib/server/client-ip";
import { getDb } from "@/lib/server/db";
import { submitInquiry } from "@/lib/server/inquiries";
import { sendOrderEmails } from "@/lib/server/order-emails";
import { ORDER_MESSAGES, placeOrder } from "@/lib/server/orders";
import { requestRuntime } from "@/lib/server/request-runtime";
import { resolveStoreForHost } from "@/lib/server/storefront/catalog";
import { storeIdFromCookieHeader } from "@/lib/storefront-cookie";

const GENERIC_ERROR = "Something went wrong while sending your message. Please try again.";
const INQUIRY_STORE_UNAVAILABLE = "This store isn't accepting messages right now.";
const STALE_PAGE = "This page is out of date. Please reload it and try again.";
const ORDER_GENERIC_ERROR = "Something went wrong while placing your order. Please try again.";

/** Mirrors app/admin/actions.ts's isId(): a plausible id, not yet a real store. */
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

/** The public store this request's Host serves (the preview cookie only counts on the platform host). */
function storeForRequest(db: ReturnType<typeof getDb>, headers: Headers) {
  return resolveStoreForHost(db, headers.get("host") ?? "", storeIdFromCookieHeader(headers.get("cookie")));
}

/** storeId: the store the contact page shows; it must be the one the host serves. */
export async function submitInquiryAction(storeId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!isId(storeId)) return { ok: false, error: "Invalid request." };
  try {
    // requestRuntime() (not next/headers directly) so database tests can
    // inject headers the same way tests/db/auth-actions.test.ts does for
    // admin actions — see setRequestRuntimeForTests() and
    // tests/db/inquiry-actions.test.ts.
    const headers = await requestRuntime().headers();
    const db = getDb();
    const hostStore = await storeForRequest(db, headers);
    if (!hostStore) return { ok: false, error: INQUIRY_STORE_UNAVAILABLE };
    if (hostStore !== storeId) return { ok: false, error: STALE_PAGE };
    return await submitInquiry(db, hostStore, input, { ipAddress: trustedClientIp(headers) });
  } catch (error) {
    console.error("[storefront action] submitInquiry failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Places a real order (cash on delivery or bank transfer) in the store
 * the request's Host serves; the storeId inside `input` is only compared
 * with it (placeOrder refuses a cart from another store).
 */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  try {
    const headers = await requestRuntime().headers();
    const db = getDb();
    const storeId = await storeForRequest(db, headers);
    if (!storeId) return { ok: false, error: ORDER_MESSAGES.storeUnavailable, retrySameKey: false };
    const result = await placeOrder(db, storeId, input, { ipAddress: trustedClientIp(headers) });
    // Emails only for a NEW order, and only after the response: the order
    // is already committed, so an email problem can't affect it.
    if (result.ok && !result.duplicate) {
      const orderNumber = result.order.orderNumber;
      requestRuntime().afterResponse?.(() => sendOrderEmails(db, storeId, orderNumber));
    }
    return result;
  } catch (error) {
    // Logged for the developer; the browser only gets a generic message.
    // Nothing was saved, so retrying with the same idempotency key is safe.
    console.error("[storefront action] placeOrder failed", error);
    return { ok: false, error: ORDER_GENERIC_ERROR, retrySameKey: true };
  }
}

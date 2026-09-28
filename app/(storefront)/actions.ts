"use server";

// ---------------------------------------------------------------
// PUBLIC STOREFRONT SERVER ACTIONS
// Unlike app/admin/actions.ts, these need no signed-in session — anyone
// on the public storefront can call them. storeId is the store the
// visitor is actually looking at (from useStorefront(), which today can
// be any of the demo stores via the store switcher — see lib/storefront.ts).
// It is never trusted blindly: submitInquiry() re-checks that store
// exists, is not archived, and is ACTIVE before writing anything, the
// same as every store-scoped write in this codebase.
// ---------------------------------------------------------------
import type { ActionResult } from "@/lib/admin/types";
import type { PlaceOrderResult } from "@/lib/checkout";
import { DEFAULT_STOREFRONT_STORE_ID } from "@/lib/config";
import { trustedClientIp } from "@/lib/server/client-ip";
import { getDb } from "@/lib/server/db";
import { submitInquiry } from "@/lib/server/inquiries";
import { ORDER_MESSAGES, placeOrder } from "@/lib/server/orders";
import { requestRuntime } from "@/lib/server/request-runtime";
import { resolveStorefrontStoreId } from "@/lib/server/storefront/catalog";
import { storeIdFromCookieHeader } from "@/lib/storefront-cookie";

const GENERIC_ERROR = "Something went wrong while sending your message. Please try again.";
const ORDER_GENERIC_ERROR = "Something went wrong while placing your order. Please try again.";

/** Mirrors app/admin/actions.ts's isId(): a plausible id, not yet a real store. */
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

export async function submitInquiryAction(storeId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!isId(storeId)) return { ok: false, error: "Invalid request." };
  try {
    // requestRuntime() (not next/headers directly) so database tests can
    // inject headers the same way tests/db/auth-actions.test.ts does for
    // admin actions — see setRequestRuntimeForTests() and
    // tests/db/inquiry-actions.test.ts.
    const ipAddress = trustedClientIp(await requestRuntime().headers());
    return await submitInquiry(getDb(), storeId, input, { ipAddress });
  } catch (error) {
    console.error("[storefront action] submitInquiry failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Places a real order (cash on delivery or bank transfer). Unlike the
 * inquiry action, the store is resolved HERE on the server — the store
 * cookie (only honoured for an ACTIVE store) or the configured default —
 * and the storeId inside `input` is only compared with it.
 */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  try {
    const headers = await requestRuntime().headers();
    const db = getDb();
    const storeId = await resolveStorefrontStoreId(
      db,
      storeIdFromCookieHeader(headers.get("cookie")),
      DEFAULT_STOREFRONT_STORE_ID,
    );
    if (!storeId) return { ok: false, error: ORDER_MESSAGES.storeUnavailable, retrySameKey: false };
    return await placeOrder(db, storeId, input, { ipAddress: trustedClientIp(headers) });
  } catch (error) {
    // Logged for the developer; the browser only gets a generic message.
    // Nothing was saved, so retrying with the same idempotency key is safe.
    console.error("[storefront action] placeOrder failed", error);
    return { ok: false, error: ORDER_GENERIC_ERROR, retrySameKey: true };
  }
}

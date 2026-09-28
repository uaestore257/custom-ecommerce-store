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
import { trustedClientIp } from "@/lib/server/client-ip";
import { getDb } from "@/lib/server/db";
import { submitInquiry } from "@/lib/server/inquiries";
import { requestRuntime } from "@/lib/server/request-runtime";

const GENERIC_ERROR = "Something went wrong while sending your message. Please try again.";

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

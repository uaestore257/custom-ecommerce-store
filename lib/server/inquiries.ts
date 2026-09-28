import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/types";
import { validateInquiry } from "@/lib/inquiry";
import { hasErrors } from "@/lib/validation";
import { fail, ok } from "./admin/common";
import { withinRateLimit } from "./rate-limit";

// ---------------------------------------------------------------
// STORE CONTACT INQUIRIES (public — no sign-in required). This is the
// Data Access Layer for inquiries (see node_modules/next/dist/docs/01-app
// /02-guides/data-security.md, "Data Access Layer"): the "use server"
// wrapper (app/(storefront)/actions.ts) stays thin and this function is
// the actual trust boundary.
//
// Anyone can submit this, so:
//   1. storeId is the store the visitor CLAIMS to be looking at — it is
//      a caller-supplied Server Action argument (see
//      app/(storefront)/actions.ts), NOT server-derived, and must never
//      be treated as trusted on its own. It is always re-checked here:
//      the store must exist, not be archived, and be ACTIVE, so a
//      draft/suspended store's contact form does not silently succeed.
//      Given that check, a visitor CAN direct a message to any active
//      store on the platform, not only the one they appear to be
//      viewing. That is accepted today because (a) every demo store's
//      id is already visible in the storefront's own HTML (the
//      store-switcher's <option value>), so nothing confidential is
//      exposed by accepting it, and (b) this is a write-only action with
//      no cross-store data read. This is NOT secure, domain-based tenant
//      resolution, and must not be copied as the pattern for a future
//      public action: once real host/domain-based store resolution
//      exists, storeId for a new public action must be derived from the
//      resolved domain SERVER-SIDE, not accepted as a caller argument —
//      otherwise it becomes a genuine tenant-isolation gap (see
//      tests/db/inquiries.test.ts, "a visitor can direct a message...").
//   2. input is re-validated on the server (validateInquiry),
//   3. a per-store rate limit curbs spam: per-IP when a trusted IP is
//      available, otherwise a coarser shared-per-store bucket so
//      limiting is never fully OFF (mirrors Better Auth's own fallback
//      in lib/server/auth/auth.ts, which uses one shared bucket rather
//      than skipping its rate limit when it can't resolve an IP). This
//      is not a security boundary (see lib/server/rate-limit.ts).
// ---------------------------------------------------------------

// 5 messages / 10 min / store / IP — the normal case, once a trusted IP
// header is configured.
const IP_RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
// 20 messages / 10 min / store, shared by every visitor with no known IP
// (TRUSTED_IP_HEADER unset, or a request the header didn't cover). Looser
// on purpose: many real visitors can share this bucket, so it must not
// mistake ordinary traffic for abuse, while still bounding the worst case.
const SHARED_RATE_LIMIT = { max: 20, windowMs: 10 * 60 * 1000 };
const STORE_UNAVAILABLE = "This store isn't accepting messages right now.";
const TOO_MANY = "Too many messages sent recently. Please try again later.";

export async function submitInquiry(
  client: PrismaClient,
  storeId: string,
  input: unknown,
  context: { ipAddress: string | null },
): Promise<ActionResult<{ id: string }>> {
  const store = await client.store.findFirst({
    where: { id: storeId, archivedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (!store) return fail(STORE_UNAVAILABLE);

  const { values, errors } = validateInquiry(input);
  if (hasErrors(errors)) return fail("Please fix the highlighted fields.", errors);

  const [key, limit] = context.ipAddress
    ? [`inquiry:${store.id}:${context.ipAddress}`, IP_RATE_LIMIT]
    : [`inquiry:${store.id}:shared`, SHARED_RATE_LIMIT];
  const allowed = await withinRateLimit(client, key, limit);
  if (!allowed) return fail(TOO_MANY);

  const inquiry = await client.inquiry.create({
    data: {
      storeId: store.id,
      name: values.name,
      email: values.email,
      subject: values.subject || null,
      message: values.message,
      ipAddress: context.ipAddress,
    },
    select: { id: true },
  });
  return ok({ id: inquiry.id }, "Message sent.");
}

import "server-only";
import { isValidIpHeaderName } from "@/lib/auth/constants";

// ---------------------------------------------------------------
// Same trust policy as lib/server/auth/auth.ts's trustedClientIp: only
// the ONE header named in TRUSTED_IP_HEADER is read, because any other
// header (e.g. X-Forwarded-For) can be forged by the client.
//
// This is a deliberate, minimal duplication rather than a direct import
// of the auth module's version: that version takes an AuthEnv, which
// readAuthEnv() only produces after validating the ENTIRE admin auth
// config (BETTER_AUTH_SECRET, BETTER_AUTH_URL, ADMIN_HOST — all
// required, all can throw). Importing it here would make the public
// Contact form fail whenever the admin side isn't configured yet, even
// though the two are meant to be independently deployable. The one
// piece of logic that must never drift between the two copies — what
// counts as a valid header NAME — is shared via isValidIpHeaderName()
// (lib/auth/constants.ts) so both stay in agreement even though this
// copy fails closed (treats a malformed name as "no header") rather than
// throwing: a config typo elsewhere must not crash a public form.
// ---------------------------------------------------------------

/** Client IP from the one header the hosting proxy is trusted to set, or null. */
export function trustedClientIp(headers: Headers): string | null {
  const header = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (!header || !isValidIpHeaderName(header)) return null;
  const value = headers.get(header)?.split(",")[0]?.trim();
  return value ? value.slice(0, 64) : null;
}

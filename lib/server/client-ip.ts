import "server-only";
import { clientIpFromHeader, resolveTrustedIpHeader } from "@/lib/auth/trusted-ip";

// ---------------------------------------------------------------
// Client IP for the public storefront's rate limits (contact form,
// checkout). Same trust policy as the admin auth config
// (lib/auth/trusted-ip.ts): only the ONE trusted header is read, because
// any other header (e.g. X-Forwarded-For) can be forged by the client.
//
// Unlike readAuthEnv() this never throws: a config typo must not crash a
// public form, so a malformed TRUSTED_IP_HEADER means "no trusted header"
// (fail closed: callers then use their shared, per-store fallback limit).
// ---------------------------------------------------------------

/** Client IP from the one header the hosting proxy is trusted to set, or null. */
export function trustedClientIp(headers: Headers, env: NodeJS.ProcessEnv = process.env): string | null {
  return clientIpFromHeader(headers, resolveTrustedIpHeader(env).header);
}

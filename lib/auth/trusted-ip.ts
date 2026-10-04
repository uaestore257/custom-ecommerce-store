import { isValidIpHeaderName } from "./constants";

// ---------------------------------------------------------------
// WHICH REQUEST HEADER CARRIES THE REAL CLIENT IP (pure; shared by the
// admin auth config and the public storefront rate limits).
//
// Rate limits are keyed by client IP. If no IP can be resolved, every
// visitor falls into ONE shared bucket (Better Auth logs exactly that),
// so a single client could lock everyone out of sign-in. Resolution:
//
//   1. TRUSTED_IP_HEADER set to a valid header name -> that header.
//   2. TRUSTED_IP_HEADER set but malformed          -> "invalid" (callers
//      fail closed: auth refuses to start, public forms trust no header).
//   3. Unset, running on Vercel (VERCEL=1)          -> "x-real-ip", which
//      Vercel's edge sets to the connecting client and overwrites if a
//      client sends its own copy.
//   4. Otherwise                                    -> "unset".
//
// Headers such as X-Forwarded-For are never trusted implicitly: a client
// can forge them unless the hosting proxy is known to overwrite them.
// ---------------------------------------------------------------

export const VERCEL_CLIENT_IP_HEADER = "x-real-ip";

export type TrustedIpHeader =
  | { header: string; source: "configured" | "vercel" }
  | { header: null; reason: "unset" | "invalid" };

export function resolveTrustedIpHeader(env: NodeJS.ProcessEnv = process.env): TrustedIpHeader {
  const raw = env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (raw) {
    return isValidIpHeaderName(raw) ? { header: raw, source: "configured" } : { header: null, reason: "invalid" };
  }
  if (env.VERCEL === "1") return { header: VERCEL_CLIENT_IP_HEADER, source: "vercel" };
  return { header: null, reason: "unset" };
}

/** First address in the trusted header, bounded; null when it is missing. */
export function clientIpFromHeader(headers: Headers | undefined, header: string | null): string | null {
  if (!headers || !header) return null;
  const value = headers.get(header)?.split(",")[0]?.trim();
  return value ? value.slice(0, 64) : null;
}

// Small shared values used by both the proxy and the server auth code.
// No server-only imports here: proxy.ts must stay lightweight.

/** Better Auth cookie prefix: cookies are named `codex-admin.session_token` etc. */
export const AUTH_COOKIE_PREFIX = "codex-admin";

/** Lower-case, trimmed host without a trailing dot, e.g. "admin.codexstore.com:443". */
export function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

/** Whether an incoming Host header matches the configured admin host. */
export function isConfiguredAdminHost(requestHost: string, adminHost: string) {
  const configuredHost = normalizeHost(adminHost);
  return configuredHost !== "" && normalizeHost(requestHost) === configuredHost;
}

/** Paths that belong to the admin and are only served on ADMIN_HOST. */
export function isAdminPath(pathname: string) {
  return /^\/(admin|login|api\/auth)(\/|$)/.test(pathname);
}

// ---------------------------------------------------------------
// Public Server Actions (proxy.ts)
//
// A Server Action's POST goes to the URL of the page that called it, but
// Next.js resolves the actual function from the request's `next-action`
// header, independent of that URL (see node_modules/next/dist/docs/01-app
// /02-guides/data-security.md, "Built-in Server Actions Security
// features"). So a request's pathname does not prove which action it
// will invoke — it only tells us which page a normal browser call came
// from. That means this must be an ALLOWLIST (deny by default, permit an
// exact known public page) rather than a denylist keyed off isAdminPath:
// a denylist would let a crafted request reach ANY action's dispatcher
// off ADMIN_HOST by posting to some other, unlisted pathname while
// carrying an admin action's id (ids for admin pages are present in their
// compiled JS chunks, which are served from every host — see proxy.ts's
// matcher, which excludes _next/static from these checks entirely).
// ---------------------------------------------------------------

/**
 * Pages whose Server Actions are intentionally public (no session needed):
 * the contact form and checkout (app/(storefront)/actions.ts).
 */
const PUBLIC_ACTION_PATHS = ["/contact", "/checkout"];

/** Whether pathname may carry a Server Action off ADMIN_HOST. */
export function isPublicActionPath(pathname: string) {
  return PUBLIC_ACTION_PATHS.includes(pathname);
}

/** A single, lower-case header name such as "x-real-ip" — never a list. */
export function isValidIpHeaderName(value: string) {
  return /^[a-z0-9-]+$/.test(value);
}

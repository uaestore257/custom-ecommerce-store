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

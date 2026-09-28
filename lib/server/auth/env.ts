import "server-only";
import { isValidIpHeaderName, normalizeHost } from "@/lib/auth/constants";

// ---------------------------------------------------------------
// Authentication settings from the environment (see .env.example).
// Read lazily, on first use, so `next build` works without them.
// Misconfiguration fails loudly instead of falling back to something
// insecure.
// ---------------------------------------------------------------

export interface AuthEnv {
  /** Signs session cookies. At least 32 random characters. */
  secret: string;
  /** Public URL of the admin, e.g. https://admin.codexstore.com */
  baseURL: string;
  /** Host (and port, if any) of the admin, e.g. admin.codexstore.com */
  adminHost: string;
  /** Header the hosting proxy sets to the real client IP, if known. */
  trustedIpHeader: string | null;
  production: boolean;
}

export class AuthConfigError extends Error {}

export function readAuthEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  const production = env.NODE_ENV === "production";
  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (secret.length < 32) {
    throw new AuthConfigError("BETTER_AUTH_SECRET must be set to at least 32 random characters (see .env.example).");
  }

  let url: URL;
  try {
    url = new URL(env.BETTER_AUTH_URL ?? "");
  } catch {
    throw new AuthConfigError("BETTER_AUTH_URL must be the admin's full URL, e.g. https://admin.codexstore.com.");
  }
  // Browsers treat localhost and *.localhost as secure, so a local
  // production build (`npm run build && npm start`) may use http there.
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost");
  if (production && url.protocol !== "https:" && !local) {
    throw new AuthConfigError("BETTER_AUTH_URL must use https:// in production.");
  }

  const adminHost = normalizeHost(env.ADMIN_HOST ?? "");
  if (!adminHost) throw new AuthConfigError("ADMIN_HOST must be set, e.g. admin.codexstore.com.");
  if (adminHost !== url.host) {
    throw new AuthConfigError(`ADMIN_HOST (${adminHost}) must match the host of BETTER_AUTH_URL (${url.host}).`);
  }

  const header = env.TRUSTED_IP_HEADER?.trim().toLowerCase() || null;
  if (header && !isValidIpHeaderName(header)) throw new AuthConfigError("TRUSTED_IP_HEADER must be a single header name.");

  return { secret, baseURL: url.origin, adminHost, trustedIpHeader: header, production };
}

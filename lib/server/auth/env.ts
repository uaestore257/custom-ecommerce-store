import "server-only";
import { normalizeHost } from "@/lib/auth/constants";
import { resolveTrustedIpHeader } from "@/lib/auth/trusted-ip";

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
  /**
   * Header the hosting proxy sets to the real client IP (lib/auth/trusted-ip.ts).
   * Null only outside production or for a local *.localhost production build.
   */
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

  const ip = resolveTrustedIpHeader(env);
  if (ip.header === null && ip.reason === "invalid") {
    throw new AuthConfigError("TRUSTED_IP_HEADER must be a single header name.");
  }
  // Without a client IP every visitor shares ONE sign-in rate-limit bucket,
  // so one client could lock everyone out. Refuse that in production
  // (Vercel is detected automatically; see lib/auth/trusted-ip.ts).
  if (ip.header === null && production && !local) {
    throw new AuthConfigError(
      "TRUSTED_IP_HEADER must name the header your hosting proxy sets to the client IP (e.g. x-real-ip) in production.",
    );
  }

  return { secret, baseURL: url.origin, adminHost, trustedIpHeader: ip.header, production };
}

import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { adminHostOf } from "@/lib/admin/store-access";
import { AUTH_COOKIE_PREFIX, normalizeHost } from "@/lib/auth/constants";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { recordAudit } from "@/lib/server/audit";
import { getDb } from "@/lib/server/db";
import { storeHostConfig } from "@/lib/store-host";
import { readAuthEnv, type AuthEnv } from "./env";
import { sessionAllowed } from "./store-access";

// ---------------------------------------------------------------
// BETTER AUTH (better-auth 1.7.6, pinned) — authentication only.
// Better Auth proves WHO is signed in. WHAT they may do (platform owner,
// store memberships) is decided by our own guards in ./guards.ts, which
// re-read the user from the database on every request.
//
//  * Email + password only. Public sign-up is disabled; the platform
//    owner uses the CLI and Store Owner credentials are provisioned by the
//    platform owner through the store workflows.
//  * Only the endpoints in ENABLED_PATHS are reachable over HTTP
//    (authHandler allow-list, plus Better Auth's own disabledPaths).
//  * Sessions live in the database (revocable) and last 8 hours.
//  * Cookies are httpOnly, SameSite=Lax, Secure in production, and
//    host-only (never shared with other subdomains of the root domain).
//  * Rate limits are stored in the database, so they survive restarts.
// ---------------------------------------------------------------

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** The only Better Auth endpoints served over HTTP (/api/auth/...). */
export const ENABLED_PATHS = ["/sign-in/email", "/sign-out", "/get-session", "/ok", "/error"] as const;

/**
 * Every other endpoint of better-auth 1.7.6 is switched off. A test fails
 * if an upgrade adds an endpoint that is in neither list.
 */
export const DISABLED_PATHS = [
  "/account-info",
  "/callback/:id",
  "/change-email",
  "/change-password",
  "/delete-user",
  "/delete-user/callback",
  "/get-access-token",
  "/link-social",
  "/list-accounts",
  "/list-sessions",
  "/refresh-token",
  "/request-password-reset",
  "/reset-password",
  "/reset-password/:token",
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/send-verification-email",
  "/sign-in/social",
  "/sign-up/email",
  "/unlink-account",
  "/update-session",
  "/update-user",
  "/verify-email",
  "/verify-password",
];

/** Client IP from the one header the hosting proxy is trusted to set. */
export function trustedClientIp(headers: Headers | undefined, env: AuthEnv) {
  if (!headers || !env.trustedIpHeader) return null;
  const value = headers.get(env.trustedIpHeader)?.split(",")[0]?.trim();
  return value ? value.slice(0, 64) : null;
}

export function createAuth(db: PrismaClient, env: AuthEnv = readAuthEnv()) {
  return betterAuth({
    appName: "Codex Store Admin",
    secret: env.secret,
    baseURL: env.baseURL,
    // The admin URL, the exact business root for the central Store Admin
    // portal, and recognized nested Store Admin origins. Storefront and
    // custom-domain hosts cannot sign in to admin.
    trustedOrigins: (request) => {
      const host = normalizeHost(request?.headers.get("host") ?? "");
      const kind = adminHostOf(host, storeHostConfig()).kind;
      if (kind !== "store" && kind !== "store-portal") return [env.baseURL];
      return [env.baseURL, `${new URL(env.baseURL).protocol}//${host}`];
    },
    database: prismaAdapter(db, { provider: "postgresql" }),
    telemetry: { enabled: false },
    disabledPaths: DISABLED_PATHS,

    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },

    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      updateAge: 60 * 60,
      freshAge: 15 * 60,
    },

    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },

    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },

    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: env.production,
      // Host-only cookies: never set a Domain attribute.
      crossSubDomainCookies: { enabled: false },
      // Only trust the header named in TRUSTED_IP_HEADER. With none set,
      // no client-supplied header (such as X-Forwarded-For) is believed and
      // sign-in attempts share one rate-limit bucket.
      ipAddress: { ipAddressHeaders: env.trustedIpHeader ? [env.trustedIpHeader] : [] },
    },

    databaseHooks: {
      session: {
        create: {
          // Refuse sessions unless the user may use the admin on this host:
          // the platform owner on ADMIN_HOST, or an eligible store member
          // on a recognized Store Admin host or the business-root portal.
          // Disabled users never. No request context -> fail closed.
          before: async (session, context) => {
            const headers = context?.headers ?? context?.request?.headers;
            const host = headers?.get("host") ?? "";
            if (!(await sessionAllowed(db, session.userId, host))) return false;
          },
        },
      },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-out") {
          const current = await getSessionFromCtx(ctx);
          if (current) {
            await recordAudit(db, {
              action: "auth.sign_out",
              actorUserId: current.user.id,
              ipAddress: trustedClientIp(ctx.headers, env),
            });
          }
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const ipAddress = trustedClientIp(ctx.headers, env);
        if (ctx.path === "/sign-in/email") {
          const session = ctx.context.newSession;
          if (session) {
            await recordAudit(db, { action: "auth.sign_in", actorUserId: session.user.id, ipAddress });
          } else if (isAPIError(ctx.context.returned)) {
            // No email or password is stored for failed attempts.
            await recordAudit(db, { action: "auth.sign_in_failed", ipAddress });
          }
        }
      }),
    },

    // Must stay last: lets Server Actions set auth cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { betterAuth?: Auth };

/** The app's Better Auth instance, created on first use. */
export function getAuth(): Auth {
  globalForAuth.betterAuth ??= createAuth(getDb());
  return globalForAuth.betterAuth;
}

const AUTH_BASE_PATH = "/api/auth";

/**
 * HTTP entry point for /api/auth/*. Serves ONLY the paths in ENABLED_PATHS
 * (exact match) and answers 404 for everything else. This is stricter
 * than `disabledPaths`, which Better Auth matches literally and so does
 * not cover paths with parameters such as /callback/:id.
 */
export async function authHandler(request: Request, auth?: Auth): Promise<Response> {
  const { pathname } = new URL(request.url);
  const path = pathname.startsWith(AUTH_BASE_PATH) ? pathname.slice(AUTH_BASE_PATH.length) : "";
  if (!(ENABLED_PATHS as readonly string[]).includes(path)) {
    return new Response("Not Found", { status: 404 });
  }
  return (auth ?? getAuth()).handler(request);
}

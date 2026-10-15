import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { adminHostOf } from "@/lib/admin/store-access";
import { AUTH_COOKIE_PREFIX, normalizeHost } from "@/lib/auth/constants";
import { clientIpFromHeader } from "@/lib/auth/trusted-ip";
import { passwordProblem, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { recordAudit } from "@/lib/server/audit";
import { getDb } from "@/lib/server/db";
import { getMailer } from "@/lib/server/mailer";
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
export const ENABLED_PATHS = [
  "/sign-in/email",
  "/sign-out",
  "/get-session",
  "/ok",
  "/error",
  "/request-password-reset",
  "/reset-password",
  "/reset-password/:token",
  "/send-verification-email",
  "/verify-email",
] as const;

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
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/sign-in/social",
  "/sign-up/email",
  "/unlink-account",
  "/update-session",
  "/update-user",
  "/verify-password",
];

async function sendAuthEmail(kind: "verification" | "password reset", to: string, url: string) {
  const mailer = getMailer();
  if (!mailer) {
    console.error(`[email] The ${kind} email could not be sent because email delivery is not configured.`);
    throw new Error("Email delivery is not configured.");
  }
  try {
    await mailer.send({
      to,
      subject: kind === "verification" ? "Verify your Codex Store account" : "Reset your Codex Store password",
      text: [
        kind === "verification" ? "Verify your email address using the link below:" : "Reset your password using the link below:",
        "",
        url,
        "",
        kind === "verification"
          ? "This link expires in one hour. If you did not request it, you can ignore this email."
          : "This link expires in one hour. If you did not request a password reset, you can ignore this email.",
      ].join("\n"),
    });
  } catch (error) {
    console.error(`[email] Sending the ${kind} email failed (${error instanceof Error ? error.name : "error"}).`);
    throw error;
  }
}

/** Client IP from the one header the hosting proxy is trusted to set. */
export function trustedClientIp(headers: Headers | undefined, env: AuthEnv) {
  return clientIpFromHeader(headers, env.trustedIpHeader);
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
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendAuthEmail("password reset", user.email, url),
      onPasswordReset: async ({ user }) => {
        await recordAudit(db, { action: "auth.password_reset", actorUserId: user.id });
      },
    },

    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => sendAuthEmail("verification", user.email, url),
      afterEmailVerification: async (user, request) => {
        await recordAudit(db, {
          action: "auth.email_verified",
          actorUserId: user.id,
          ipAddress: trustedClientIp(request?.headers, env),
        });
      },
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
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
      },
    },

    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: env.production,
      // Host-only cookies: never set a Domain attribute.
      crossSubDomainCookies: { enabled: false },
      // Only trust the resolved client-IP header (lib/auth/trusted-ip.ts).
      // readAuthEnv() refuses production without one, so attempts never
      // collapse into one shared rate-limit bucket there.
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
  const allowed = ENABLED_PATHS.some((candidate) =>
    candidate === "/reset-password/:token"
      ? /^\/reset-password\/[^/]+$/.test(path)
      : candidate === path,
  );
  if (!allowed) {
    return new Response("Not Found", { status: 404 });
  }
  if (path === "/reset-password" && request.method === "POST") {
    try {
      const body = await request.clone().json() as { newPassword?: unknown };
      if (typeof body.newPassword === "string") {
        const problem = passwordProblem(body.newPassword);
        if (problem) {
          return Response.json({ code: "INVALID_PASSWORD", message: problem }, { status: 400 });
        }
      }
    } catch {
      // Let Better Auth return its normal validation error for malformed JSON.
    }
  }
  const response = await (auth ?? getAuth()).handler(request);
  if (
    path === "/sign-in/email" &&
    (response.status === 401 || response.status === 403 || response.status >= 500)
  ) {
    if (response.status >= 500) {
      console.error("[auth] A sign-in request failed at the server; account details are withheld.");
    }
    return Response.json(
      { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  if (path === "/request-password-reset" || path === "/send-verification-email") {
    if (response.status >= 500) {
      console.error("[email] An authentication email request failed; address-specific details are withheld.");
    }
    if (response.status >= 200 && response.status < 300 || response.status >= 500) {
      return Response.json(
        { status: true, message: "If the address is eligible, an email may arrive. Contact support if it does not." },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }
  }
  return response;
}

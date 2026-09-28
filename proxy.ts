import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PREFIX, isAdminPath, isPublicActionPath, normalizeHost } from "@/lib/auth/constants";

// ---------------------------------------------------------------
// PROXY (Next.js 16's replacement for middleware). Runs before routing.
//
// 1. The admin (/admin, /login, /api/auth) is served ONLY on ADMIN_HOST,
//    e.g. admin.codexstore.com. On any other host it is a 404. If
//    ADMIN_HOST is not set, the admin is unavailable everywhere (fails
//    closed rather than open).
// 2. Off ADMIN_HOST, a Server Action ("next-action" header) is refused
//    UNLESS its pathname is in the small, explicit PUBLIC_ACTION_PATHS
//    allowlist (lib/auth/constants.ts). This is deny-by-default on
//    purpose: Next.js resolves an action by its id, not by the URL it
//    was posted to (see isPublicActionPath's comment), so a denylist
//    keyed only on isAdminPath(pathname) could be bypassed by posting to
//    some other pathname with a leaked admin action id. Each admin
//    action also re-checks the real session itself
//    (requirePlatformOwner(), lib/server/auth/guards.ts) as a second,
//    independent layer — this proxy check does not by itself depend on
//    the caller's host or cookies.
// 3. Signed-out visitors to /admin are redirected to /login. This only
//    checks that a session cookie EXISTS (fast, no database); the real
//    check happens in every page and action (lib/server/auth/guards.ts).
//
// The Host header is used as sent by the client or hosting proxy.
// X-Forwarded-Host is deliberately ignored.
// ---------------------------------------------------------------

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

/**
 * Absolute /login URL on the admin host. Uses BETTER_AUTH_URL (the public
 * admin URL, correct scheme even behind a TLS-terminating proxy); the
 * request URL may carry the server's internal address instead.
 */
function loginUrl(request: NextRequest, adminHost: string) {
  try {
    return new URL("/login", process.env.BETTER_AUTH_URL);
  } catch {
    const url = new URL("/login", request.url);
    url.host = adminHost;
    return url;
  }
}

export function proxy(request: NextRequest) {
  const adminHost = normalizeHost(process.env.ADMIN_HOST ?? "");
  const host = normalizeHost(request.headers.get("host") ?? "");
  const onAdminHost = adminHost !== "" && host === adminHost;
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname) && !onAdminHost) return notFound();
  if (request.headers.has("next-action") && !onAdminHost && !isPublicActionPath(pathname)) return notFound();

  if (onAdminHost && /^\/admin(\/|$)/.test(pathname)) {
    if (!getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX })) {
      return NextResponse.redirect(loginUrl(request, adminHost));
    }
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js build assets and files with an extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};

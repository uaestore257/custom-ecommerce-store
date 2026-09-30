import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PREFIX, isAdminPath, isPublicActionPath, normalizeHost } from "@/lib/auth/constants";
import { adminHostOf } from "@/lib/admin/store-access";
import { isPlatformBusinessHost, storeHostConfig } from "@/lib/store-host";

// ---------------------------------------------------------------
// PROXY (Next.js 16's replacement for middleware). Runs before routing.
//
// 1. The platform admin (/admin, /login, /api/auth) is served on the exact
//    ADMIN_HOST. Store admin routes are also served on recognized store
//    hosts; their actual store and OWNER membership are verified server-side.
// 2. Off the admin and recognized store hosts, a Server Action ("next-action" header) is refused
//    UNLESS its pathname is in the small, explicit PUBLIC_ACTION_PATHS
//    allowlist (lib/auth/constants.ts). This is deny-by-default on
//    purpose: Next.js resolves an action by its id, not by the URL it
//    was posted to (see isPublicActionPath's comment), so a denylist
//    keyed only on isAdminPath(pathname) could be bypassed by posting to
//    some other pathname with a leaked admin action id. Each admin
//    action also re-checks the real session and host itself
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
function loginUrl(request: NextRequest, adminHost: string, storeHost: string | null) {
  if (storeHost) {
    try {
      const url = new URL("/login", process.env.BETTER_AUTH_URL);
      url.host = storeHost;
      return url;
    } catch {
      const url = new URL("/login", request.url);
      url.host = storeHost;
      return url;
    }
  }
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
  const storeHost = adminHostOf(host, storeHostConfig()).kind === "store" ? host : null;
  const allowedAdminHost = onAdminHost || storeHost !== null;
  const { pathname } = request.nextUrl;

  if (onAdminHost && pathname === "/") return NextResponse.redirect(new URL("/admin", request.url));
  if (isAdminPath(pathname) && !allowedAdminHost) return notFound();
  if (
    isPlatformBusinessHost(host) &&
    !["/", "/about", "/services", "/portfolio", "/contact"].includes(pathname) &&
    !(request.headers.has("next-action") && isPublicActionPath(pathname))
  ) {
    return notFound();
  }
  if (request.headers.has("next-action") && !allowedAdminHost && !isPublicActionPath(pathname)) return notFound();

  if (allowedAdminHost && /^\/admin(\/|$)/.test(pathname)) {
    if (!getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX })) {
      return NextResponse.redirect(loginUrl(request, adminHost, storeHost));
    }
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js build assets and the favicon. Paths with a
  // dot are NOT skipped: dynamic routes accept them (/products/x.js is the
  // product page, /admin/stores/a.b an admin page), so skipping them would
  // skip the checks above. Files in public/ also pass through here; the
  // proxy just lets them through. Tested in tests/unit/proxy-matcher.test.ts.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

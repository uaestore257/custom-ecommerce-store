import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PREFIX, isAdminPath, isPublicActionPath, normalizeHost } from "@/lib/auth/constants";
import { adminHostOf } from "@/lib/admin/store-access";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, storeHostConfig } from "@/lib/store-host";

// ---------------------------------------------------------------
// PROXY (Next.js 16's replacement for middleware). Runs before routing.
//
// 1. Platform administration is served only on exact ADMIN_HOST. Store
//    login/admin routes are served on the exact business root or the
//    optional reserved admin.<slug>.<root> host; membership is verified
//    server-side.
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

/**
 * Everything the bare platform root serves publicly: the business site's
 * pages plus its robots.txt and sitemap.xml (app/robots.ts, app/sitemap.ts
 * already answer for this host; without these two entries crawlers got 404).
 */
const BUSINESS_SITE_PATHS = new Set([
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/platform",
  "/contact",
  "/robots.txt",
  "/sitemap.xml",
]);

/**
 * Static files in public/ that the business site may serve: the agency's
 * brand assets (logo, mark, profile and social images referenced from
 * Agency settings as site paths) and the demo-store screenshots.
 */
const BUSINESS_SITE_ASSET_PREFIXES = ["/brand/", "/showcase/"];

function isBusinessSiteAsset(pathname: string) {
  return BUSINESS_SITE_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !pathname.includes("..");
}

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

function withReturnTo(url: URL, request: NextRequest) {
  if (/^\/admin(\/|$)/.test(request.nextUrl.pathname)) {
    url.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  return url;
}

/**
 * Absolute /login URL for the request's authorized admin context. Uses
 * BETTER_AUTH_URL for the public scheme behind a TLS-terminating proxy.
 */
function loginUrl(request: NextRequest, adminHost: string, storeHost: string | null, portalHost: boolean) {
  if (storeHost) {
    try {
      const url = new URL("/login", process.env.BETTER_AUTH_URL);
      url.host = storeHost;
      return withReturnTo(url, request);
    } catch {
      const url = new URL("/login", request.url);
      url.host = storeHost;
      return withReturnTo(url, request);
    }
  }
  if (portalHost) {
    try {
      const url = new URL("/login", process.env.BETTER_AUTH_URL);
      url.hostname = storeHostConfig().rootDomain;
      return withReturnTo(url, request);
    } catch {
      const url = new URL("/login", request.url);
      url.hostname = storeHostConfig().rootDomain;
      return withReturnTo(url, request);
    }
  }
  try {
    return withReturnTo(new URL("/login", process.env.BETTER_AUTH_URL), request);
  } catch {
    const url = new URL("/login", request.url);
    url.host = adminHost;
    return withReturnTo(url, request);
  }
}

export function proxy(request: NextRequest) {
  const adminHost = normalizeHost(process.env.ADMIN_HOST ?? "");
  const host = normalizeHost(request.headers.get("host") ?? "");
  const onAdminHost = adminHost !== "" && host === adminHost;
  const adminHostKind = adminHostOf(host, storeHostConfig()).kind;
  const storeHost = adminHostKind === "store" ? host : null;
  const portalHost = adminHostKind === "store-portal";
  const allowedAdminHost = onAdminHost || storeHost !== null || portalHost;
  const { pathname } = request.nextUrl;
  const pathPreviewHost = isStorefrontPathPreviewHost(host);

  if ((onAdminHost || storeHost) && pathname === "/" && !pathPreviewHost) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  if (isAdminPath(pathname) && !allowedAdminHost) return notFound();
  if (
    isPlatformBusinessHost(host) &&
    !pathPreviewHost &&
    !BUSINESS_SITE_PATHS.has(pathname) &&
    !(isBusinessSiteAsset(pathname) && !request.headers.has("next-action")) &&
    !(portalHost && (isAdminPath(pathname) || pathname === "/accept-invitation")) &&
    !(request.headers.has("next-action") && isPublicActionPath(pathname))
  ) {
    return notFound();
  }
  if (request.headers.has("next-action") && !allowedAdminHost && !isPublicActionPath(pathname)) return notFound();

  if (allowedAdminHost && /^\/admin(\/|$)/.test(pathname)) {
    if (!getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX })) {
      return NextResponse.redirect(loginUrl(request, adminHost, storeHost, portalHost));
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

import type { NextConfig } from "next";

// ---------------------------------------------------------------
// SECURITY HEADERS on every response (storefront, admin and API).
// No script/style Content-Security-Policy yet: Next.js needs inline
// scripts, so a strict one requires per-request nonces (see
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// The CSP below only restricts framing, <base>, form targets (same site
// only) and plugins, none of which this app relies on.
// HSTS is sent in production only, without includeSubDomains or preload:
// a client's own domain may have other subdomains this app doesn't serve.
// ---------------------------------------------------------------
const securityHeaders = (production: boolean) => [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "production") }];
  },
};

export default nextConfig;

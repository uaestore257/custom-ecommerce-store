// Security headers from next.config.ts, read from the real config.
import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig from "../../next.config";

async function headersFor(nodeEnv: string) {
  const saved = process.env.NODE_ENV;
  (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  try {
    const rules = await nextConfig.headers!();
    assert.equal(rules.length, 1);
    assert.equal(rules[0].source, "/:path*", "applies to every path");
    return new Map(rules[0].headers.map((h) => [h.key, h.value]));
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = saved;
  }
}

test("every response forbids framing, MIME sniffing and full-URL referrers", async () => {
  const headers = await headersFor("development");
  assert.match(headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.match(headers.get("Content-Security-Policy") ?? "", /object-src 'none'/);
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("Permissions-Policy") ?? "", /camera=\(\)/);
  assert.equal(nextConfig.poweredByHeader, false, "no X-Powered-By header");
});

test("HSTS is sent in production only", async () => {
  assert.equal((await headersFor("development")).has("Strict-Transport-Security"), false);
  assert.equal((await headersFor("production")).get("Strict-Transport-Security"), "max-age=31536000");
});

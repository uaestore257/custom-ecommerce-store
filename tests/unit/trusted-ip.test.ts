import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIpFromHeader, resolveTrustedIpHeader, VERCEL_CLIENT_IP_HEADER } from "../../lib/auth/trusted-ip";
import { trustedClientIp } from "../../lib/server/client-ip";

const env = (values: Record<string, string | undefined>) => values as unknown as NodeJS.ProcessEnv;

test("the trusted client-IP header resolves explicitly, from Vercel, or not at all", () => {
  assert.deepEqual(resolveTrustedIpHeader(env({ TRUSTED_IP_HEADER: "X-Real-IP" })), { header: "x-real-ip", source: "configured" });
  assert.deepEqual(resolveTrustedIpHeader(env({ VERCEL: "1" })), { header: VERCEL_CLIENT_IP_HEADER, source: "vercel" });
  assert.deepEqual(resolveTrustedIpHeader(env({ VERCEL: "1", TRUSTED_IP_HEADER: "cf-connecting-ip" })), {
    header: "cf-connecting-ip",
    source: "configured",
  });
  assert.deepEqual(resolveTrustedIpHeader(env({})), { header: null, reason: "unset" });
  assert.deepEqual(resolveTrustedIpHeader(env({ VERCEL: "0" })), { header: null, reason: "unset" });
  for (const invalid of ["x-real-ip, x-forwarded-for", "x real ip", "x-real-ip:1", "X_REAL_IP"]) {
    assert.deepEqual(resolveTrustedIpHeader(env({ TRUSTED_IP_HEADER: invalid, VERCEL: "1" })), { header: null, reason: "invalid" }, invalid);
  }
});

test("only the trusted header is read; spoofable headers never count", () => {
  const headers = new Headers({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "203.0.113.7, 10.0.0.1" });
  assert.equal(clientIpFromHeader(headers, "x-real-ip"), "203.0.113.7");
  assert.equal(clientIpFromHeader(headers, null), null);
  assert.equal(clientIpFromHeader(undefined, "x-real-ip"), null);
  assert.equal(clientIpFromHeader(new Headers({ "x-real-ip": "a".repeat(200) }), "x-real-ip")?.length, 64);

  // Public storefront rate limits: same policy, and a malformed setting fails closed (no header trusted).
  assert.equal(trustedClientIp(headers, env({})), null, "nothing configured: no spoofable header is believed");
  assert.equal(trustedClientIp(headers, env({ VERCEL: "1" })), "203.0.113.7");
  assert.equal(trustedClientIp(headers, env({ TRUSTED_IP_HEADER: "x-forwarded-for, x-real-ip" })), null);
});

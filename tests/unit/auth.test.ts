// Authentication pieces that need no database: password policy, auth
// settings, the seed guard, the proxy, and page-guard coverage.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { passwordProblem } from "../../lib/auth/password-policy";
import { isAdminPath, isConfiguredAdminHost, normalizeHost } from "../../lib/auth/constants";
import { AuthConfigError, readAuthEnv } from "../../lib/server/auth/env";
import { assertSafeToSeed, SeedRefused } from "../../prisma/seed-guard";
import { proxy } from "../../proxy";

test("password policy", () => {
  assert.equal(passwordProblem("correct horse battery staple 42", "owner@example.com"), null);
  assert.match(passwordProblem("short", "a@b.co") ?? "", /at least 12/);
  assert.match(passwordProblem("x".repeat(129)) ?? "", /at most 128/);
  assert.match(passwordProblem("aaaaaaaaaaaaaa") ?? "", /varied/);
  assert.match(passwordProblem("MyPassword2026!") ?? "", /easy to guess/);
  assert.match(passwordProblem("jamie.lee-is-great-99", "jamie.lee@example.com") ?? "", /email/);
  assert.match(passwordProblem(" leading space pass 1") ?? "", /space/);
});

const goodEnv = {
  BETTER_AUTH_SECRET: "s".repeat(40),
  BETTER_AUTH_URL: "https://admin.codexstore.com",
  ADMIN_HOST: "admin.codexstore.com",
  NODE_ENV: "production",
} as unknown as NodeJS.ProcessEnv;

test("auth settings are validated and fail closed", () => {
  const env = readAuthEnv(goodEnv);
  assert.equal(env.baseURL, "https://admin.codexstore.com");
  assert.equal(env.adminHost, "admin.codexstore.com");
  assert.equal(env.trustedIpHeader, null);
  assert.equal(env.production, true);

  const bad = [
    { ...goodEnv, BETTER_AUTH_SECRET: "too-short" },
    { ...goodEnv, BETTER_AUTH_URL: "not a url" },
    { ...goodEnv, BETTER_AUTH_URL: "http://admin.codexstore.com" }, // http in production
    { ...goodEnv, ADMIN_HOST: "" },
    { ...goodEnv, ADMIN_HOST: "codexstore.com" }, // doesn't match the URL
    { ...goodEnv, TRUSTED_IP_HEADER: "x-real-ip, x-forwarded-for" },
  ];
  for (const env of bad) assert.throws(() => readAuthEnv(env as unknown as NodeJS.ProcessEnv), AuthConfigError);
  const local = { ...goodEnv, BETTER_AUTH_URL: "http://admin.localhost:3000", ADMIN_HOST: "admin.localhost:3000" };
  assert.equal(readAuthEnv(local as unknown as NodeJS.ProcessEnv).adminHost, "admin.localhost:3000", "local production build");
  assert.throws(() => readAuthEnv({ ...local, BETTER_AUTH_URL: "http://admin.localhost.evil.com", ADMIN_HOST: "admin.localhost.evil.com" } as unknown as NodeJS.ProcessEnv), AuthConfigError);
  assert.equal(readAuthEnv({ ...goodEnv, TRUSTED_IP_HEADER: "X-Real-IP" } as unknown as NodeJS.ProcessEnv).trustedIpHeader, "x-real-ip");
});

test("the seed refuses production and non-dev databases", () => {
  assert.doesNotThrow(() => assertSafeToSeed({ DATABASE_URL: "postgresql://u:p@localhost:5433/shop_dev" } as unknown as NodeJS.ProcessEnv));
  assert.doesNotThrow(() => assertSafeToSeed({ DATABASE_URL: "postgresql://u:p@localhost:5433/shop_test" } as unknown as NodeJS.ProcessEnv));
  for (const env of [
    { NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@localhost/shop_dev" },
    { DATABASE_URL: "postgresql://u:p@db.example.com/shop" },
    { DATABASE_URL: "postgresql://u:p@db.example.com/shop_production" },
    { DATABASE_URL: "postgresql://u:p@db.example.com/latest" }, // "test" inside a word doesn't count
    {},
  ]) {
    assert.throws(() => assertSafeToSeed(env as unknown as NodeJS.ProcessEnv), SeedRefused, JSON.stringify(env));
  }
});

test("host helpers", () => {
  assert.equal(normalizeHost(" Admin.CodexStore.com. "), "admin.codexstore.com");
  assert.equal(isConfiguredAdminHost("Admin.Localhost:3000", "admin.localhost:3000"), true);
  assert.equal(isConfiguredAdminHost("localhost:3000", "admin.localhost:3000"), false);
  assert.equal(isConfiguredAdminHost("admin.localhost.evil.com", "admin.localhost:3000"), false);
  assert.equal(isConfiguredAdminHost("admin.localhost:3000", ""), false);
  for (const p of ["/admin", "/admin/stores/x", "/login", "/api/auth/sign-in/email"]) assert.ok(isAdminPath(p), p);
  for (const p of ["/", "/shop", "/administrator", "/loginx", "/api/other"]) assert.ok(!isAdminPath(p), p);
});

function request(url: string, host: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers: { host, ...headers } });
}

test("proxy: the admin is only served on ADMIN_HOST", () => {
  process.env.ADMIN_HOST = "admin.codexstore.com";
  const cookie = { cookie: "codex-admin.session_token=abc.def" };

  // Wrong host: 404 for admin paths, Server Actions and auth endpoints.
  for (const [url, host] of [
    ["https://saadabazar.codexstore.com/admin", "saadabazar.codexstore.com"],
    ["https://sadabazaar.com/admin/stores", "sadabazaar.com"],
    ["https://codexstore.com/login", "codexstore.com"],
    ["https://evil.example/api/auth/sign-in/email", "evil.example"],
  ]) {
    assert.equal(proxy(request(url, host, cookie)).status, 404, url);
  }
  // X-Forwarded-Host can't be used to pretend to be the admin host.
  assert.equal(proxy(request("https://shop.example/admin", "shop.example", { "x-forwarded-host": "admin.codexstore.com", ...cookie })).status, 404);
  // Server Actions are refused off the admin host, whatever the path.
  assert.equal(proxy(request("https://shop.example/", "shop.example", { "next-action": "abc123" })).status, 404);

  // Admin host: signed out -> /login, with a cookie -> through (pages check it properly).
  process.env.BETTER_AUTH_URL = "https://admin.codexstore.com";
  // The server may see its internal address in request.url; the redirect must still use the admin URL.
  const out = proxy(request("http://10.0.0.5:3000/admin", "admin.codexstore.com"));
  assert.equal(out.status, 307);
  assert.equal(out.headers.get("location"), "https://admin.codexstore.com/login");
  assert.equal(proxy(request("https://admin.codexstore.com/admin", "Admin.CodexStore.com", cookie)).headers.get("x-middleware-next"), "1");
  assert.equal(proxy(request("https://admin.codexstore.com/login", "admin.codexstore.com")).headers.get("x-middleware-next"), "1");

  // Storefront paths are not affected in this phase.
  assert.equal(proxy(request("https://shop.example/shop", "shop.example")).headers.get("x-middleware-next"), "1");
});

test("proxy: with ADMIN_HOST unset the admin is unavailable everywhere", () => {
  delete process.env.ADMIN_HOST;
  assert.equal(proxy(request("http://localhost:3000/admin", "localhost:3000")).status, 404);
  assert.equal(proxy(request("http://localhost:3000/login", "localhost:3000")).status, 404);
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("every admin page and layout checks the session itself", () => {
  const entries = files("app/admin").filter((f) => /(^|[\\/])(page|layout)\.tsx$/.test(f));
  assert.ok(entries.length >= 16);
  for (const file of entries) {
    assert.match(readFileSync(file, "utf8"), /await requireAdminPage\(\)/, `${file} must call requireAdminPage()`);
  }
});

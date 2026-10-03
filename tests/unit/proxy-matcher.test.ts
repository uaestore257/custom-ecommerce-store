// Which paths the proxy (proxy.ts) runs on, using Next.js's own matcher
// logic. The proxy must run on every path that can reach a page, route
// handler or Server Action — including paths that contain a dot, because
// dynamic routes accept them (/products/x.js is the product page, and
// /admin/stores/a.b is an admin page). Only Next.js build assets and the
// favicon are skipped.
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { before, test } from "node:test";
import { NextRequest } from "next/server";

// Next's testing helper expects the AsyncLocalStorage global its own
// runtime provides, so load it (and the proxy) only after setting it.
(globalThis as Record<string, unknown>).AsyncLocalStorage ??= AsyncLocalStorage;
let runsOn: (url: string, headers?: Record<string, string>) => boolean;
let proxyModule: typeof import("../../proxy");
before(async () => {
  const { unstable_doesMiddlewareMatch } = await import("next/experimental/testing/server");
  proxyModule = await import("../../proxy");
  runsOn = (url, headers) => unstable_doesMiddlewareMatch({ config: proxyModule.config, url, headers });
});

test("the proxy runs on admin, auth and storefront paths, with or without a dot", () => {
  for (const url of [
    "/",
    "/admin",
    "/admin/stores/abc",
    "/admin/stores/abc.def",
    "/admin/stores/abc/orders/x.json",
    "/login",
    "/login.json",
    "/api/auth/sign-in/email",
    "/api/auth/get-session.json",
    "/products/abc",
    "/products/x.js",
    "/contact",
    "/checkout",
    "/vercel.svg",
  ]) {
    assert.equal(runsOn(url), true, url);
  }
  assert.equal(runsOn("/products/x.js", { "next-action": "abc123" }), true, "a Server Action posted to a dotted path");
});

test("only Next.js build assets and the favicon skip the proxy", () => {
  for (const url of ["/_next/static/chunks/main.js", "/_next/image?url=%2Fa.png&w=64&q=75", "/favicon.ico"]) {
    assert.equal(runsOn(url), false, url);
  }
});

test("dotted paths get the same answers as any other: admin off ADMIN_HOST and stray actions are 404", () => {
  process.env.ADMIN_HOST = "admin.codexstore.com";
  process.env.PLATFORM_ROOT_DOMAIN = "shops.test";
  const request = (url: string, headers: Record<string, string> = {}) =>
    new NextRequest(url, { headers: { host: "shop.example", ...headers } });
  assert.equal(proxyModule.proxy(request("https://shop.example/admin/stores/abc.def")).status, 404);
  assert.equal(proxyModule.proxy(request("https://shop.example/api/auth/get-session.json")).status, 404);
  assert.equal(proxyModule.proxy(request("https://shop.example/products/x.js", { "next-action": "abc123" })).status, 404);
  // A plain dotted storefront path is simply passed through.
  assert.equal(proxyModule.proxy(request("https://shop.example/products/x.js")).headers.get("x-middleware-next"), "1");
});

test("store admin and sign-in routes are served only on recognized store hosts", () => {
  process.env.ADMIN_HOST = "admin.localhost:3000";
  process.env.PLATFORM_ROOT_DOMAIN = "localhost";
  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  const storeRequest = (path: string, headers: Record<string, string> = {}) =>
    new NextRequest(`http://nest-and-oak.localhost:3000${path}`, {
      headers: { host: "nest-and-oak.localhost:3000", ...headers },
    });

  const admin = proxyModule.proxy(storeRequest("/admin"));
  assert.equal(admin.status, 307);
  assert.equal(new URL(admin.headers.get("location")!).host, "nest-and-oak.localhost:3000");
  assert.equal(new URL(admin.headers.get("location")!).pathname, "/login");
  assert.equal(proxyModule.proxy(storeRequest("/login")).headers.get("x-middleware-next"), "1");
  assert.equal(proxyModule.proxy(storeRequest("/api/auth/sign-in/email")).headers.get("x-middleware-next"), "1");
  assert.equal(
    proxyModule.proxy(storeRequest("/products", { "next-action": "store-action-id" })).headers.get("x-middleware-next"),
    "1",
    "store actions proceed to their independent server-side guards",
  );

  const unknown = new NextRequest("http://shop.example/admin", {
    headers: { host: "shop.example" },
  });
  assert.equal(proxyModule.proxy(unknown).status, 404);
});

test("canonical root host serves business pages and admin root goes to the platform panel", () => {
  process.env.ADMIN_HOST = "admin.localhost:3000";
  process.env.PLATFORM_ROOT_DOMAIN = "localhost";
  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  const rootRequest = (path: string) =>
    new NextRequest(`http://localhost:3000${path}`, { headers: { host: "localhost:3000" } });
  for (const path of ["/", "/about", "/services", "/portfolio", "/contact"]) {
    assert.equal(proxyModule.proxy(rootRequest(path)).headers.get("x-middleware-next"), "1", path);
  }
  assert.equal(proxyModule.proxy(rootRequest("/shop")).status, 404);

  const adminRoot = new NextRequest("http://admin.localhost:3000/", {
    headers: { host: "admin.localhost:3000" },
  });
  assert.equal(new URL(proxyModule.proxy(adminRoot).headers.get("location")!).pathname, "/admin");
});

test("temporary path-preview root renders the landing host and keeps admin protected", () => {
  process.env.ADMIN_HOST = "preview.example.test";
  process.env.PLATFORM_ROOT_DOMAIN = "preview.example.test";
  process.env.STOREFRONT_PREVIEW_MODE = "path";
  process.env.BETTER_AUTH_URL = "https://preview.example.test";
  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  const request = (path: string) =>
    new NextRequest(`https://preview.example.test${path}`, { headers: { host: "preview.example.test" } });

  for (const path of ["/", "/portfolio", "/preview/store-a", "/shop", "/products/item-a"]) {
    assert.equal(proxyModule.proxy(request(path)).headers.get("x-middleware-next"), "1", path);
  }
  const admin = proxyModule.proxy(request("/admin"));
  assert.equal(admin.status, 307);
  assert.equal(new URL(admin.headers.get("location")!).pathname, "/login");
  assert.equal(new URL(admin.headers.get("location")!).host, "preview.example.test");
});

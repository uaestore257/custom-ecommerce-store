// Which store a hostname serves (lib/store-host.ts). No database: the
// slug-to-store lookup is covered in tests/db/storefront-catalog.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { matchStoreHost, parseStoreDomains, storeHostConfig } from "../../lib/store-host";

const config = (extra: Record<string, string> = {}) =>
  storeHostConfig({ ADMIN_HOST: "admin.shops.test", PLATFORM_ROOT_DOMAIN: "shops.test", NODE_ENV: "production", ...extra } as unknown as NodeJS.ProcessEnv);

test("a store's subdomain of the platform root domain names that store", () => {
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test", config()), { kind: "store", slug: "nest-and-oak" });
  assert.deepEqual(matchStoreHost("Nest-And-Oak.Shops.Test.", config()), { kind: "store", slug: "nest-and-oak" }, "case and trailing dot");
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test:3000", config()), { kind: "store", slug: "nest-and-oak" }, "port ignored");
});

test("a mapped custom domain names its store, and wins over everything but the admin host", () => {
  const withDomains = config({ STORE_DOMAINS: "shop.client.test=client-a, www.shop.client.test=client-a" });
  assert.deepEqual(matchStoreHost("shop.client.test", withDomains), { kind: "store", slug: "client-a" });
  assert.deepEqual(matchStoreHost("WWW.shop.client.test:443", withDomains), { kind: "store", slug: "client-a" });
  assert.deepEqual(matchStoreHost("other.client.test", withDomains), { kind: "unknown" });
});

test("the admin host is the platform host (preview), compared with its port like the proxy does", () => {
  assert.deepEqual(matchStoreHost("admin.shops.test", config()), { kind: "platform" });
  assert.deepEqual(matchStoreHost("ADMIN.shops.test", config()), { kind: "platform" });
  const local = config({ ADMIN_HOST: "admin.localhost:3000", PLATFORM_ROOT_DOMAIN: "localhost", NODE_ENV: "development" });
  assert.deepEqual(matchStoreHost("admin.localhost:3000", local), { kind: "platform" });
  assert.deepEqual(matchStoreHost("admin.localhost:4000", local), { kind: "unknown" }, "admin is reserved, never a store slug");
});

test("the bare root domain is the platform host in development only", () => {
  assert.deepEqual(matchStoreHost("shops.test", config()), { kind: "unknown" });
  assert.deepEqual(matchStoreHost("shops.test", config({ NODE_ENV: "development" })), { kind: "platform" });
  const local = config({ PLATFORM_ROOT_DOMAIN: "localhost", NODE_ENV: "development" });
  assert.deepEqual(matchStoreHost("localhost:3000", local), { kind: "platform" });
  assert.deepEqual(matchStoreHost("nest-and-oak.localhost:3000", local), { kind: "store", slug: "nest-and-oak" });
});

test("unknown, nested, reserved, malformed or look-alike hosts name no store", () => {
  for (const host of [
    "",
    "elsewhere.example",
    "shops.test.evil.com",
    "nest-and-oak.shops.test.evil.com",
    "evilshops.test",
    "a.b.shops.test",
    "www.shops.test",
    "api.shops.test",
    "-bad.shops.test",
    "bad-.shops.test",
    "under_score.shops.test",
    "[::1]:3000",
  ]) {
    assert.deepEqual(matchStoreHost(host, config()), { kind: "unknown" }, host);
  }
});

test("without a root domain or custom domains, no host names a store", () => {
  const none = storeHostConfig({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv);
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test", none), { kind: "unknown" });
  assert.deepEqual(matchStoreHost("localhost:3000", none), { kind: "unknown" });
});

test("STORE_DOMAINS: valid host=slug pairs are kept, malformed ones ignored", () => {
  const map = parseStoreDomains(" Shop.Client.test = client-a ,bad,=x,y=,a=b=c,host.test=Not A Slug,two.test=client-b");
  assert.deepEqual([...map], [["shop.client.test", "client-a"], ["two.test", "client-b"]]);
  assert.equal(parseStoreDomains(undefined).size, 0);
});

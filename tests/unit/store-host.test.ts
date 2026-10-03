// Which store a hostname serves (lib/store-host.ts). No database: the
// slug-to-store lookup is covered in tests/db/storefront-catalog.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPlatformBusinessHost,
  isStorefrontPathPreviewHost,
  matchStoreHost,
  parseStoreDomains,
  storefrontPathPreviewUrl,
  storefrontUrlForSlug,
  storeHostConfig,
} from "../../lib/store-host";

const config = (extra: Record<string, string> = {}) =>
  storeHostConfig({ ADMIN_HOST: "admin.shops.test", PLATFORM_ROOT_DOMAIN: "shops.test", NODE_ENV: "production", ...extra } as unknown as NodeJS.ProcessEnv);

test("a store's subdomain of the platform root domain names that store", () => {
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test", config()), { kind: "store", slug: "nest-and-oak" });
  assert.deepEqual(matchStoreHost("Nest-And-Oak.Shops.Test.", config()), { kind: "store", slug: "nest-and-oak" }, "case and trailing dot");
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test:3000", config()), { kind: "store", slug: "nest-and-oak" }, "port ignored");
});

test("storefront preview URLs use the selected store's resolved host and preserve app origin", () => {
  const localConfig = config({
    ADMIN_HOST: "admin.localhost:3000",
    PLATFORM_ROOT_DOMAIN: "localhost",
    NODE_ENV: "development",
  });
  const preview = storefrontUrlForSlug("store-a", "http://admin.localhost:3001/admin", localConfig);
  assert.equal(preview, "http://store-a.localhost:3001/");
  assert.deepEqual(matchStoreHost(new URL(preview!).host, localConfig), { kind: "store", slug: "store-a" });

  const mappedConfig = config({ STORE_DOMAINS: "shop.client.test=store-a" });
  assert.equal(
    storefrontUrlForSlug("store-a", "https://admin.shops.test/admin", mappedConfig),
    "https://shop.client.test/",
  );
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

test("the bare development root is the business site, distinct from store and admin hosts", () => {
  const localEnv = {
    ADMIN_HOST: "admin.localhost:3000",
    PLATFORM_ROOT_DOMAIN: "localhost",
    NODE_ENV: "development",
  } as unknown as NodeJS.ProcessEnv;
  assert.equal(isPlatformBusinessHost("localhost:3000", localEnv), true);
  assert.equal(isPlatformBusinessHost("admin.localhost:3000", localEnv), false);
  assert.equal(isPlatformBusinessHost("nest-and-oak.localhost:3000", localEnv), false);
  assert.equal(isPlatformBusinessHost("localhost", { ...localEnv, NODE_ENV: "production" }), false);
});

test("path preview mode is limited to the configured temporary root host", () => {
  const previewEnv = {
    ADMIN_HOST: "preview.shops.test",
    PLATFORM_ROOT_DOMAIN: "preview.shops.test",
    STOREFRONT_PREVIEW_MODE: "path",
    NODE_ENV: "production",
  } as unknown as NodeJS.ProcessEnv;
  assert.equal(isStorefrontPathPreviewHost("preview.shops.test", previewEnv), true);
  assert.equal(isPlatformBusinessHost("preview.shops.test", previewEnv), true);
  assert.equal(isStorefrontPathPreviewHost("shops.test", previewEnv), false);
  assert.equal(isStorefrontPathPreviewHost("other.preview.shops.test", previewEnv), false);
  assert.equal(isStorefrontPathPreviewHost("preview.shops.test", { ...previewEnv, ADMIN_HOST: "admin.shops.test" }), false);
  assert.equal(isStorefrontPathPreviewHost("preview.shops.test", { ...previewEnv, STOREFRONT_PREVIEW_MODE: "" }), false);
});

test("path preview URLs stay on the configured origin even when a verified domain is mapped", () => {
  const previewConfig = config({
    ADMIN_HOST: "preview.shops.test",
    PLATFORM_ROOT_DOMAIN: "preview.shops.test",
    STOREFRONT_PREVIEW_MODE: "path",
    STORE_DOMAINS: "shop.client.test=store-a",
  });
  assert.equal(
    storefrontPathPreviewUrl("store-a", "https://preview.shops.test/admin", previewConfig),
    "https://preview.shops.test/preview/store-a",
  );
  assert.equal(storefrontPathPreviewUrl("bad_slug", "https://preview.shops.test", previewConfig), null);
  assert.equal(storefrontPathPreviewUrl("store-a", "https://elsewhere.test", previewConfig), null);
  assert.equal(
    storefrontPathPreviewUrl("store-a", "https://preview.shops.test", config({ ADMIN_HOST: "preview.shops.test" })),
    null,
  );
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

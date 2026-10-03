// Which store a hostname serves (lib/store-host.ts). No database: the
// slug-to-store lookup is covered in tests/db/storefront-catalog.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPlatformBusinessHost,
  isStorefrontPathPreviewHost,
  matchStoreHost,
  parseStoreDomains,
  platformRootUrl,
  storefrontPathPreviewUrl,
  storefrontPreviewUrlForSlug,
  storefrontUrlForSlug,
  storeAdminUrlForSlug,
  storeHostConfig,
} from "../../lib/store-host";

const config = (extra: Record<string, string> = {}) =>
  storeHostConfig({ ADMIN_HOST: "admin.shops.test", PLATFORM_ROOT_DOMAIN: "shops.test", NODE_ENV: "production", ...extra } as unknown as NodeJS.ProcessEnv);

test("a store's subdomain of the platform root domain names that store", () => {
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test", config()), { kind: "store", slug: "nest-and-oak" });
  assert.deepEqual(matchStoreHost("admin.nest-and-oak.shops.test", config()), { kind: "store-admin", slug: "nest-and-oak" });
  assert.deepEqual(matchStoreHost("Nest-And-Oak.Shops.Test.", config()), { kind: "store", slug: "nest-and-oak" }, "case and trailing dot");
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test:3000", config()), { kind: "store", slug: "nest-and-oak" }, "port ignored");
});

test("storefront and store-admin URLs use distinct real hosts and preserve the configured origin", () => {
  const localConfig = config({
    ADMIN_HOST: "admin.localhost:3000",
    PLATFORM_ROOT_DOMAIN: "localhost",
    NODE_ENV: "development",
  });
  const preview = storefrontUrlForSlug("store-a", "http://admin.localhost:3001/admin", localConfig);
  assert.equal(preview, "http://store-a.localhost:3001/");
  assert.deepEqual(matchStoreHost(new URL(preview!).host, localConfig), { kind: "store", slug: "store-a" });
  const storeAdmin = storeAdminUrlForSlug("store-a", "http://admin.localhost:3001/admin", localConfig);
  assert.equal(storeAdmin, "http://admin.store-a.localhost:3001/");
  assert.deepEqual(matchStoreHost(new URL(storeAdmin!).host, localConfig), { kind: "store-admin", slug: "store-a" });
  assert.equal(platformRootUrl("/portfolio", "https://admin.shops.test/login", config()), "https://shops.test/portfolio");

  const mappedConfig = config({ STORE_DOMAINS: "shop.client.test=store-a" });
  assert.equal(
    storefrontUrlForSlug("store-a", "https://admin.shops.test/admin", mappedConfig),
    "https://shop.client.test/",
  );
});

test("a mapped custom domain names its store and takes precedence over a generated slug host", () => {
  const withDomains = config({
    STORE_DOMAINS: "shop.client.test=client-a, www.shop.client.test=client-a, nest-and-oak.shops.test=client-a, admin.nest-and-oak.shops.test=client-a",
  });
  assert.deepEqual(matchStoreHost("shop.client.test", withDomains), { kind: "store", slug: "client-a" });
  assert.deepEqual(matchStoreHost("WWW.shop.client.test:443", withDomains), { kind: "store", slug: "client-a" });
  assert.deepEqual(matchStoreHost("nest-and-oak.shops.test", withDomains), { kind: "store", slug: "client-a" });
  assert.deepEqual(matchStoreHost("admin.nest-and-oak.shops.test", withDomains), { kind: "store-admin", slug: "nest-and-oak" });
  assert.deepEqual(matchStoreHost("other.client.test", withDomains), { kind: "unknown" });
});

test("the desired Vercel host patterns resolve to distinct platform, storefront and store-admin roles", () => {
  const vercel = config({
    ADMIN_HOST: "admin.custom-ecommerce-store.vercel.app",
    PLATFORM_ROOT_DOMAIN: "custom-ecommerce-store.vercel.app",
  });
  assert.deepEqual(matchStoreHost("custom-ecommerce-store.vercel.app", vercel), { kind: "platform" });
  assert.deepEqual(matchStoreHost("admin.custom-ecommerce-store.vercel.app", vercel), { kind: "platform" });
  assert.deepEqual(matchStoreHost("nest-and-oak.custom-ecommerce-store.vercel.app", vercel), {
    kind: "store",
    slug: "nest-and-oak",
  });
  assert.deepEqual(matchStoreHost("admin.nest-and-oak.custom-ecommerce-store.vercel.app", vercel), {
    kind: "store-admin",
    slug: "nest-and-oak",
  });
  assert.equal(
    storefrontPreviewUrlForSlug(
      "nest-and-oak",
      "https://admin.custom-ecommerce-store.vercel.app",
      vercel,
    ),
    "https://nest-and-oak.custom-ecommerce-store.vercel.app/",
  );
});

test("the admin host is the platform host (preview), compared with its port like the proxy does", () => {
  assert.deepEqual(matchStoreHost("admin.shops.test", config()), { kind: "platform" });
  assert.deepEqual(matchStoreHost("ADMIN.shops.test", config()), { kind: "platform" });
  const local = config({ ADMIN_HOST: "admin.localhost:3000", PLATFORM_ROOT_DOMAIN: "localhost", NODE_ENV: "development" });
  assert.deepEqual(matchStoreHost("admin.localhost:3000", local), { kind: "platform" });
  assert.deepEqual(matchStoreHost("admin.localhost:4000", local), { kind: "unknown" }, "admin is reserved, never a store slug");
});

test("the bare root is always the platform business host, including production", () => {
  assert.deepEqual(matchStoreHost("shops.test", config()), { kind: "platform" });
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
  assert.equal(isPlatformBusinessHost("shops.test", {
    ADMIN_HOST: "admin.shops.test",
    PLATFORM_ROOT_DOMAIN: "shops.test",
    NODE_ENV: "production",
  } as unknown as NodeJS.ProcessEnv), true);
  assert.equal(isPlatformBusinessHost("localhost", { ...localEnv, NODE_ENV: "production" }), true);
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
  assert.equal(
    storefrontPreviewUrlForSlug("store-a", "https://preview.shops.test/admin", previewConfig),
    "https://shop.client.test/",
    "a configured public alias wins over temporary path preview",
  );
  assert.equal(
    storefrontPreviewUrlForSlug("store-b", "https://preview.shops.test/admin", previewConfig),
    "https://preview.shops.test/preview/store-b",
    "path preview is only used for a host explicitly configured in path mode",
  );
  assert.equal(
    storefrontPreviewUrlForSlug("store-b", "https://admin.shops.test", config({ STOREFRONT_PREVIEW_MODE: "path" })),
    "https://store-b.shops.test/",
    "a real tenant hostname wins when path preview is not configured on the root host",
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
    "admin.admin.shops.test",
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

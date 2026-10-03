import assert from "node:assert/strict";
import { test } from "node:test";
import type { Client } from "../../lib/server/admin/common";
import { resolveStoreForHost } from "../../lib/server/storefront/catalog";

const env = {
  ADMIN_HOST: "admin.localhost:3000",
  PLATFORM_ROOT_DOMAIN: "localhost",
  NODE_ENV: "development",
} as unknown as NodeJS.ProcessEnv;

test("storefront host resolution follows the slug and ignores a conflicting cookie", async () => {
  const queries: string[] = [];
  const client = {
    storeDomain: {
      findUnique: async () => null,
    },
    store: {
      findFirst: async ({ where }: { where: { slug: string } }) => {
        queries.push(where.slug);
        return where.slug === "threadline" ? { id: "threadline-id" } : null;
      },
    },
  } as unknown as Client;

  assert.equal(await resolveStoreForHost(client, "threadline.localhost:3000", "another-store-id", env), "threadline-id");
  assert.deepEqual(queries, ["threadline"]);
});

test("production platform root never resolves a storefront from a preview cookie or queries a store", async () => {
  const client = {
    store: {
      findFirst: async () => {
        throw new Error("Platform-root requests must not query storefront stores.");
      },
    },
  } as unknown as Client;

  assert.equal(await resolveStoreForHost(client, "localhost:3000", "a-store-id", env), null);
  const productionEnv = {
    ADMIN_HOST: "admin.shops.test",
    PLATFORM_ROOT_DOMAIN: "shops.test",
    NODE_ENV: "production",
  } as unknown as NodeJS.ProcessEnv;
  assert.equal(await resolveStoreForHost(client, "shops.test", "a-store-id", productionEnv), null);
  assert.equal(await resolveStoreForHost(client, "admin.shops.test", "a-store-id", productionEnv), null);
  assert.equal(await resolveStoreForHost(client, "admin.nest-and-oak.shops.test", "a-store-id", productionEnv), null);
});

test("a store-admin hostname never resolves as a public storefront", async () => {
  const client = {
    storeDomain: {
      findUnique: async () => {
        throw new Error("A reserved store-admin hostname must not be treated as a custom storefront domain.");
      },
    },
    store: {
      findFirst: async () => {
        throw new Error("A store-admin hostname must not query public storefronts.");
      },
    },
  } as unknown as Client;
  const productionEnv = {
    ADMIN_HOST: "admin.shops.test",
    PLATFORM_ROOT_DOMAIN: "shops.test",
    NODE_ENV: "production",
  } as unknown as NodeJS.ProcessEnv;

  assert.equal(await resolveStoreForHost(client, "admin.nest-and-oak.shops.test", undefined, productionEnv), null);
});

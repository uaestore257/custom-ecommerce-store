import assert from "node:assert/strict";
import { test } from "node:test";
import type { Client } from "@/lib/server/admin/common";
import { resolveStoreForHost } from "@/lib/server/storefront/catalog";

const env = {
  ADMIN_HOST: "admin.localhost:3001",
  PLATFORM_ROOT_DOMAIN: "localhost",
  STORE_DOMAINS: "shop.example.test=store-a",
  NODE_ENV: "development",
} as unknown as NodeJS.ProcessEnv;

function clientFor(domain: { storeId: string; status: "PENDING" | "VERIFIED" | "DISABLED" } | null, expectedStoreId = "store-b") {
  return {
    storeDomain: {
      findUnique: async ({ where }: { where: { hostname: string } }) => {
        assert.equal(where.hostname, "shop.example.test");
        return domain;
      },
    },
    store: {
      findFirst: async ({ where }: { where: { id: string; status: string; archivedAt: null } }) => {
        assert.equal(where.id, expectedStoreId);
        return { id: where.id };
      },
    },
  } as unknown as Client;
}

test("verified database domains take precedence over static alias mappings", async () => {
  const storeId = await resolveStoreForHost(
    clientFor({ storeId: "store-b", status: "VERIFIED" }),
    "shop.example.test",
    "store-a",
    env,
  );
  assert.equal(storeId, "store-b");
});

test("pending and disabled domains fail closed without falling back to static aliases", async () => {
  for (const status of ["PENDING", "DISABLED"] as const) {
    const client = {
      storeDomain: {
        findUnique: async () => ({ storeId: "store-b", status }),
      },
      store: {
        findFirst: async () => assert.fail("unverified domains must not resolve a store"),
      },
    } as unknown as Client;
    assert.equal(await resolveStoreForHost(client, "shop.example.test", "store-a", env), null, status);
  }
});

test("verified custom domains serve only ACTIVE, non-archived stores", async () => {
  const client = {
    storeDomain: {
      findUnique: async () => ({ storeId: "store-b", status: "VERIFIED" }),
    },
    store: {
      findFirst: async ({ where }: { where: { id: string; status: string; archivedAt: null } }) => {
        assert.deepEqual(where, { id: "store-b", status: "ACTIVE", archivedAt: null });
        return null;
      },
    },
  } as unknown as Client;
  assert.equal(await resolveStoreForHost(client, "shop.example.test", "store-a", env), null);
});

test("legacy operator-configured aliases still resolve when no database owner exists", async () => {
  const client = {
    storeDomain: { findUnique: async () => null },
    store: {
      findFirst: async ({ where }: { where: { slug: string } }) => {
        assert.equal(where.slug, "store-a");
        return { id: "store-a" };
      },
    },
  } as unknown as Client;
  assert.equal(await resolveStoreForHost(client, "shop.example.test", "store-b", env), "store-a");
});

test("unknown hosts cannot select a store using the platform preview cookie", async () => {
  const client = {
    storeDomain: { findUnique: async () => null },
    store: { findFirst: async () => assert.fail("unknown hosts must not resolve a store") },
  } as unknown as Client;
  assert.equal(await resolveStoreForHost(client, "unknown.example.test", "store-a", env), null);
});

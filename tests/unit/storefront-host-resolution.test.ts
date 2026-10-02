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

test("platform business root never resolves to a storefront or queries a store", async () => {
  const client = {
    store: {
      findFirst: async () => {
        throw new Error("Business-root requests must not query storefront stores.");
      },
    },
  } as unknown as Client;

  assert.equal(await resolveStoreForHost(client, "localhost:3000", "a-store-id", env), null);
});

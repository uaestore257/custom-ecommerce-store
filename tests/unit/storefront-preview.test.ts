import assert from "node:assert/strict";
import { test } from "node:test";
import type { Client } from "@/lib/server/admin/common";
import { resolveStorefrontPreviewId } from "@/lib/server/storefront/preview";

test("preview route input resolves by slug and requires an active, non-archived store", async () => {
  const client = {
    store: {
      findFirst: async ({
        where,
        select,
      }: {
        where: { slug: string; status: string; archivedAt: null };
        select: { id: true };
      }) => {
        assert.deepEqual(where, { slug: "store-a", status: "ACTIVE", archivedAt: null });
        assert.deepEqual(select, { id: true });
        return { id: "database-store-id" };
      },
    },
  } as unknown as Client;

  assert.equal(await resolveStorefrontPreviewId(client, "store-a"), "database-store-id");
});

test("invalid slug input and IDs that are not public slugs never resolve", async () => {
  const client = {
    store: {
      findFirst: async ({ where }: { where: { slug: string; status: string; archivedAt: null } }) => {
        assert.deepEqual(where, { slug: "arbitrary-id", status: "ACTIVE", archivedAt: null });
        return null;
      },
    },
  } as unknown as Client;

  assert.equal(await resolveStorefrontPreviewId(client, "bad_slug"), null);
  assert.equal(await resolveStorefrontPreviewId(client, "arbitrary-id"), null);
});

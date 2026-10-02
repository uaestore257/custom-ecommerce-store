import assert from "node:assert/strict";
import { test } from "node:test";
import { hasDomainVerificationRecord } from "@/lib/domain-verification";
import { normalizeCustomHostname, normalizeRequestHostname } from "@/lib/store-domains";
import { storeHostConfig } from "@/lib/store-host";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { disableStoreDomain, listStoreDomains, setPrimaryStoreDomain, verifyStoreDomain } from "@/lib/server/admin/domains";

const config = storeHostConfig({
  ADMIN_HOST: "admin.shops.test",
  PLATFORM_ROOT_DOMAIN: "shops.test",
  NODE_ENV: "production",
} as unknown as NodeJS.ProcessEnv);

test("custom hostnames normalize to DNS ASCII names and reject platform hosts and URL syntax", () => {
  assert.equal(normalizeCustomHostname(" Shop.Example.COM. ", config), "shop.example.com");
  assert.equal(normalizeCustomHostname("münchen.example", config), "xn--mnchen-3ya.example");
  for (const invalid of [
    "https://shop.example.com",
    "shop.example.com:443",
    "shop.example.com/path",
    "admin.shops.test",
    "shops.test",
    "store-a.shops.test",
    "localhost",
    "shop.localhost",
    "127.0.0.1",
    "*.example.com",
    "bad_host.example.com",
    "shop..example.com",
    `${"a".repeat(64)}.example.com`,
    [...Array(4).fill("a".repeat(63)), "a"].join("."),
  ]) {
    assert.equal(normalizeCustomHostname(invalid, config), null, invalid);
  }
  assert.equal(normalizeCustomHostname(42, config), null);
});

test("request Host parsing removes a port and canonicalizes IDNs", () => {
  assert.equal(normalizeRequestHostname("Shop.Example.COM:3001"), "shop.example.com");
  assert.equal(normalizeRequestHostname("münchen.example"), "xn--mnchen-3ya.example");
  assert.equal(normalizeRequestHostname("shop.example.com/path"), null);
});

test("DNS TXT verification requires one exact proof record", async () => {
  const token = "public-proof-token";
  const lookup = async (name: string) => {
    assert.equal(name, "_store-verification.shop.example.com");
    return [["store-verification=", token.slice(0, 8), token.slice(8)]];
  };
  assert.equal(await hasDomainVerificationRecord("shop.example.com", token, lookup), true);
  assert.equal(
    await hasDomainVerificationRecord("shop.example.com", "different-token", async () => [["store-verification=public-proof-token"]]),
    false,
  );
  assert.equal(
    await hasDomainVerificationRecord("shop.example.com", token, async () => [["prefix=store-verification=public-proof-token"]]),
    false,
  );
});

test("domain data operations scope reads and mutations to the authenticated store", async () => {
  const filters: unknown[] = [];
  const client = {
    storeDomain: {
      findMany: async (args: { where: unknown }) => {
        filters.push(args.where);
        return [];
      },
      findFirst: async (args: { where: unknown }) => {
        filters.push(args.where);
        return null;
      },
      updateMany: async (args: { where: unknown }) => {
        filters.push(args.where);
        return { count: 0 };
      },
    },
  } as unknown as PrismaClient;

  await listStoreDomains(client, "store-a");
  assert.deepEqual(filters.pop(), { storeId: "store-a" });

  const verification = await verifyStoreDomain(client, "store-a", "owner-a", "domain-b", async () => {
    assert.fail("a domain belonging to another store must never be DNS-verified");
  });
  assert.equal(verification.ok, false);
  assert.deepEqual(filters.pop(), { id: "domain-b", storeId: "store-a", status: "PENDING" });

  const primary = await setPrimaryStoreDomain(client, "store-a", "owner-a", "domain-b");
  assert.equal(primary.ok, false);
  assert.deepEqual(filters.pop(), { id: "domain-b", storeId: "store-a", status: "VERIFIED" });

  const disabled = await disableStoreDomain(client, "store-a", "owner-a", "domain-b");
  assert.equal(disabled.ok, false);
  assert.deepEqual(filters.pop(), { id: "domain-b", storeId: "store-a", status: { not: "DISABLED" } });
  assert.equal(filters.length, 0);
});

test("verification proof is sent to the owner only while a domain is pending", async () => {
  const client = {
    storeDomain: {
      findMany: async ({ where }: { where: { storeId: string } }) => {
        assert.deepEqual(where, { storeId: "store-a" });
        return [
          {
            id: "pending-domain",
            hostname: "pending.example.test",
            status: "PENDING",
            isPrimary: false,
            verificationToken: "public-proof-token",
            verifiedAt: null,
          },
          {
            id: "verified-domain",
            hostname: "verified.example.test",
            status: "VERIFIED",
            isPrimary: true,
            verificationToken: "old-proof-token",
            verifiedAt: new Date("2026-10-03T12:00:00.000Z"),
          },
          {
            id: "disabled-domain",
            hostname: "disabled.example.test",
            status: "DISABLED",
            isPrimary: false,
            verificationToken: "old-proof-token",
            verifiedAt: null,
          },
        ];
      },
    },
  } as unknown as PrismaClient;

  const domains = await listStoreDomains(client, "store-a");
  assert.deepEqual(
    domains.map(({ status, verificationToken }) => ({ status, verificationToken })),
    [
      { status: "PENDING", verificationToken: "public-proof-token" },
      { status: "VERIFIED", verificationToken: null },
      { status: "DISABLED", verificationToken: null },
    ],
  );
});

test("a domain becoming unverified during primary assignment is not reported as success", async () => {
  let updateCount = 0;
  let auditCount = 0;
  const updateMany = async () => ({ count: ++updateCount === 1 ? 1 : 0 });
  const client = {
    storeDomain: {
      findFirst: async () => ({
        id: "domain-a",
        hostname: "shop.example.com",
        status: "VERIFIED",
        isPrimary: false,
        verificationToken: "public-proof-token",
        verifiedAt: new Date(),
      }),
    },
    $transaction: async (work: (tx: unknown) => Promise<void>) =>
      work({
        storeDomain: { updateMany },
        auditEvent: { create: async () => { auditCount += 1; } },
      }),
  } as unknown as PrismaClient;

  const result = await setPrimaryStoreDomain(client, "store-a", "owner-a", "domain-a");
  assert.equal(result.ok, false);
  assert.equal(updateCount, 2);
  assert.equal(auditCount, 0);
});

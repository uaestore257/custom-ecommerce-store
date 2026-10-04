import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";
import type { PlatformOwner } from "../../lib/server/auth/guards";

export function testDb() {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.includes("test")) {
    throw new Error("Database tests must run through `npm run test:db`.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/** Unique suffix so tests can create records without clashing. */
export const uid = () => Math.random().toString(36).slice(2, 10);

/** Asserts that a database operation is rejected, and why. */
export async function rejects(action: () => Promise<unknown>, reason: RegExp) {
  await assert.rejects(action, (error: unknown) => {
    const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : String(error);
    assert.match(text, reason);
    return true;
  });
}

export const FK = /Foreign key constraint|foreign key|_fkey/i;

/**
 * A PlatformOwner value for calling platform-only data functions directly.
 * In the app this value only comes from requirePlatformOwner(); the guard
 * itself is tested in auth-*.test.ts with real sessions. The user row is
 * real (audit events reference it) but is NOT flagged as platform owner.
 */
export async function testActor(db: PrismaClient): Promise<PlatformOwner> {
  const id = uid();
  const user = await db.user.create({ data: { email: `actor-${id}@example.com`, name: `Test actor ${id}` } });
  return { userId: user.id, email: user.email, name: user.name } as PlatformOwner;
}

/**
 * Offers bank transfer the way Store Owner payment settings do: an enabled
 * "bank_transfer" provider account holding the (public) bank details,
 * linked to the store's enabled bank_transfer method. Bank transfer is only
 * offered once those details exist.
 */
export async function enableBankTransfer(db: PrismaClient, storeId: string) {
  const account = await db.paymentProviderAccount.create({
    data: {
      storeId,
      provider: "bank_transfer",
      displayName: "Bank transfer",
      mode: "TEST",
      enabled: true,
      publicConfig: { bankName: "Example Bank", accountName: "Example Store LLC", accountNumber: "0001234567" },
    },
    select: { id: true },
  });
  await db.storePaymentMethod.update({
    where: { storeId_method: { storeId, method: "bank_transfer" } },
    data: { enabled: true, providerAccountId: account.id },
  });
}

import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";

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

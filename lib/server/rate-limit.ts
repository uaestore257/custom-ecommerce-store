import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

/**
 * Best-effort fixed-window rate limit, backed by the same RateLimit table
 * Better Auth uses for sign-in (see prisma/schema.prisma and
 * lib/server/auth/auth.ts). Callers must namespace their key (e.g.
 * "inquiry:<storeId>:<ip>") so it can never collide with a Better Auth key.
 *
 * This does a plain read-then-write, so two requests arriving in the same
 * instant could both pass. That race is an acceptable tradeoff for spam
 * mitigation on a low-traffic public form — it is not a security boundary,
 * and must not be relied on to prevent abuse that actually matters.
 */
export async function withinRateLimit(
  client: PrismaClient,
  key: string,
  { max, windowMs }: RateLimitOptions,
): Promise<boolean> {
  const now = Date.now();
  const existing = await client.rateLimit.findUnique({ where: { key } });
  if (!existing || now - Number(existing.lastRequest) > windowMs) {
    await client.rateLimit.upsert({
      where: { key },
      create: { id: key, key, count: 1, lastRequest: BigInt(now) },
      update: { count: 1, lastRequest: BigInt(now) },
    });
    return true;
  }
  if (existing.count >= max) return false;
  await client.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}

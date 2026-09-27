import "server-only";
import { connection } from "next/server";
import type { PlatformOwner } from "../auth/guards";
import { requirePlatformOwnerPage } from "../auth/page-guards";
import { getDb } from "../db";

/**
 * Every admin page and layout starts with this. It
 *  1. makes the page render at request time (`connection()`), so admin
 *     pages always show live data and are never prerendered at build time;
 *  2. checks the signed-in session: signed-out visitors are redirected to
 *     /login and anyone who is not the platform owner gets a 404.
 * Pages must call it themselves: a check in a layout alone is not enough,
 * because layouts are not re-run on every navigation.
 */
export async function requireAdminPage(): Promise<{ db: ReturnType<typeof getDb>; owner: PlatformOwner }> {
  await connection();
  const owner = await requirePlatformOwnerPage();
  return { db: getDb(), owner };
}

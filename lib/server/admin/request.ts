import "server-only";
import { connection } from "next/server";
import type { AdminViewer, PlatformOwner, StoreAccessGrant } from "../auth/guards";
import { requireAdminViewerPage, requirePlatformOwnerPage, requireStoreAccessPage } from "../auth/page-guards";
import { getDb } from "../db";

/**
 * Every admin page and layout starts with ONE of these. Each
 *  1. makes the page render at request time (`connection()`), so admin
 *     pages always show live data and are never prerendered at build time;
 *  2. checks the signed-in session on THIS host: signed-out visitors are
 *     redirected to /login and anyone without access gets a 404.
 * Pages must call it themselves: a check in a layout alone is not enough,
 * because layouts are not re-run on every navigation.
 *
 *  * requireAdminPage()        — platform-only pages; the platform owner on ADMIN_HOST.
 *  * requireStorePage(storeId) — pages inside one store; the platform owner on
 *                                ADMIN_HOST or that store's OWNER on its own host.
 *                                `grant.access` is "read" for a suspended store.
 *  * requireAdminViewer()      — the admin layout (either of the above).
 */
export async function requireAdminPage(): Promise<{ db: ReturnType<typeof getDb>; owner: PlatformOwner }> {
  await connection();
  const owner = await requirePlatformOwnerPage();
  return { db: getDb(), owner };
}

export async function requireStorePage(storeId: string): Promise<{ db: ReturnType<typeof getDb>; grant: StoreAccessGrant }> {
  await connection();
  const grant = await requireStoreAccessPage(storeId);
  return { db: getDb(), grant };
}

export async function requireAdminViewer(): Promise<{ db: ReturnType<typeof getDb>; viewer: AdminViewer }> {
  await connection();
  const viewer = await requireAdminViewerPage();
  return { db: getDb(), viewer };
}

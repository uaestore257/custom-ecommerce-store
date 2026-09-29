import "server-only";
import { adminHostOf, mayOpenSession, type AdminHost, type StoreFacts } from "@/lib/admin/store-access";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { storeHostConfig } from "@/lib/store-host";

// ---------------------------------------------------------------
// FACTS FOR THE STORE ACCESS RULES (lib/admin/store-access.ts), read
// from the database. The host's store comes from the request's Host via
// the configured domain rules (lib/store-host.ts) — never from anything
// the browser sends — and ownership is an OWNER StoreMembership row.
// MANAGER and STAFF memberships grant nothing.
// ---------------------------------------------------------------

type Db = Pick<PrismaClient, "store" | "storeMembership" | "user">;

export async function storeFacts(db: Db, where: { id: string } | { slug: string }): Promise<StoreFacts | null> {
  const row = await db.store.findUnique({ where, select: { id: true, status: true, archivedAt: true } });
  return row ? { id: row.id, status: row.status, archived: row.archivedAt !== null } : null;
}

/** The kind of admin host this Host header is, and (for a store host) the store it names, archived or not. */
export async function hostContext(db: Db, rawHost: string): Promise<{ host: AdminHost; hostStore: StoreFacts | null }> {
  const host = adminHostOf(rawHost, storeHostConfig());
  if (host.kind !== "store") return { host, hostStore: null };
  return { host, hostStore: await storeFacts(db, { slug: host.slug }) };
}

/** Whether the user is an OWNER of this exact store. */
export async function isStoreOwner(db: Db, userId: string, storeId: string): Promise<boolean> {
  const membership = await db.storeMembership.findUnique({
    where: { userId_storeId: { userId, storeId } },
    select: { role: true },
  });
  return membership?.role === "OWNER";
}

/**
 * Whether a session may be opened for this user on this host (Better
 * Auth's session hook): the platform owner on ADMIN_HOST, or an OWNER of
 * the (non-archived) store a store host serves. Disabled users never.
 */
export async function sessionAllowed(db: Db, userId: string, rawHost: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isPlatformOwner: true, disabledAt: true } });
  if (!user) return false;
  const { host, hostStore } = await hostContext(db, rawHost);
  const ownsHostStore = hostStore ? await isStoreOwner(db, userId, hostStore.id) : false;
  return mayOpenSession({
    user: { isPlatformOwner: user.isPlatformOwner, disabled: user.disabledAt !== null },
    host,
    hostStore,
    ownsHostStore,
  });
}

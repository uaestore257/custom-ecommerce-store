import "server-only";
import {
  adminHostOf,
  mayOpenSession,
  type AdminHost,
  type StoreFacts,
  type StoreMembershipRole,
} from "@/lib/admin/store-access";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { storeHostConfig } from "@/lib/store-host";

// ---------------------------------------------------------------
// FACTS FOR THE STORE ACCESS RULES (lib/admin/store-access.ts), read
// from the database. The host's store comes from the request's Host via
// the configured domain rules (lib/store-host.ts) — never from anything
// the browser sends — and store roles come from StoreMembership rows.
// ---------------------------------------------------------------

type Db = Pick<PrismaClient, "store" | "storeMembership" | "user">;

export async function storeFacts(db: Db, where: { id: string } | { slug: string }): Promise<StoreFacts | null> {
  const row = await db.store.findUnique({ where, select: { id: true, status: true, archivedAt: true } });
  return row ? { id: row.id, status: row.status, archived: row.archivedAt !== null } : null;
}

/** The kind of admin host this Host header is, and (for a store-admin host) the store it names, archived or not. */
export async function hostContext(db: Db, rawHost: string): Promise<{ host: AdminHost; hostStore: StoreFacts | null }> {
  const host = adminHostOf(rawHost, storeHostConfig());
  if (host.kind !== "store") return { host, hostStore: null };
  return { host, hostStore: await storeFacts(db, { slug: host.slug }) };
}

/** Whether the user is an OWNER of this exact store. */
export async function isStoreOwner(db: Db, userId: string, storeId: string): Promise<boolean> {
  const memberships = await db.storeMembership.findMany({
    where: { userId, role: "OWNER" },
    select: { storeId: true },
    take: 2,
  });
  return memberships.length === 1 && memberships[0].storeId === storeId;
}

export async function storeMembershipRole(
  db: Db,
  userId: string,
  storeId: string,
): Promise<StoreMembershipRole | null> {
  const membership = await db.storeMembership.findUnique({
    where: { userId_storeId: { userId, storeId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/**
 * Whether a session may be opened for this user on this host (Better
 * Auth's session hook): the platform owner on ADMIN_HOST, or a member of
 * the (non-archived) store named by its dedicated admin host. Disabled
 * users never.
 */
export async function sessionAllowed(db: Db, userId: string, rawHost: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isPlatformOwner: true, disabledAt: true } });
  if (!user) return false;
  const { host, hostStore } = await hostContext(db, rawHost);
  const membershipRole = hostStore ? await storeMembershipRole(db, userId, hostStore.id) : null;
  const ownsHostStore =
    hostStore && membershipRole === "OWNER" ? await isStoreOwner(db, userId, hostStore.id) : false;
  return mayOpenSession({
    user: { isPlatformOwner: user.isPlatformOwner, disabled: user.disabledAt !== null },
    host,
    hostStore,
    ownsHostStore,
    membershipRole,
  });
}

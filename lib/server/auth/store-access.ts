import "server-only";
import { cookies } from "next/headers";
import {
  adminHostOf,
  mayOpenSession,
  type AdminHost,
  type StoreFacts,
  type StoreMembershipRole,
} from "@/lib/admin/store-access";
import { STORE_PORTAL_SELECTION_COOKIE } from "@/lib/auth/constants";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { storeHostConfig } from "@/lib/store-host";

// ---------------------------------------------------------------
// FACTS FOR THE STORE ACCESS RULES (lib/admin/store-access.ts), read
// from the database. A dedicated-host store comes from request Host; the
// central root's selected store is only accepted after a live membership
// lookup. Roles always come from StoreMembership rows.
// ---------------------------------------------------------------

type Db = Pick<PrismaClient, "store" | "storeMembership" | "user">;

export interface StorePortalMembership {
  role: StoreMembershipRole;
  store: StoreFacts & { name: string; slug: string };
}

export async function storeFacts(db: Db, where: { id: string } | { slug: string }): Promise<StoreFacts | null> {
  const row = await db.store.findUnique({ where, select: { id: true, status: true, archivedAt: true } });
  return row ? { id: row.id, status: row.status, archived: row.archivedAt !== null } : null;
}

/** The host kind and its store, if the hostname or current membership validates the portal selection. */
export async function hostContext(
  db: Db,
  rawHost: string,
  userId?: string,
): Promise<{ host: AdminHost; hostStore: StoreFacts | null }> {
  const host = adminHostOf(rawHost, storeHostConfig());
  if (host.kind === "store") return { host, hostStore: await storeFacts(db, { slug: host.slug }) };
  if (host.kind !== "store-portal" || !userId) return { host, hostStore: null };
  const selectedId = (await cookies()).get(STORE_PORTAL_SELECTION_COOKIE)?.value;
  if (!selectedId) return { host, hostStore: null };
  const selected = (await storePortalMemberships(db, userId)).find(({ store }) => store.id === selectedId);
  return { host, hostStore: selected?.store ?? null };
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

/** Current, non-archived store memberships that may use the central portal. */
export async function storePortalMemberships(db: Db, userId: string): Promise<StorePortalMembership[]> {
  const memberships = await db.storeMembership.findMany({
    where: { userId },
    select: {
      role: true,
      store: { select: { id: true, name: true, slug: true, status: true, archivedAt: true } },
    },
  });
  const result: StorePortalMembership[] = [];
  for (const membership of memberships) {
    if (membership.store.archivedAt !== null) continue;
    if (membership.role === "OWNER" && !(await isStoreOwner(db, userId, membership.store.id))) continue;
    result.push({
      role: membership.role,
      store: {
        id: membership.store.id,
        name: membership.store.name,
        slug: membership.store.slug,
        status: membership.store.status,
        archived: false,
      },
    });
  }
  return result.sort((a, b) => a.store.name.localeCompare(b.store.name));
}

/**
 * Whether a session may be opened for this user on this host (Better
 * Auth's session hook): the platform owner on ADMIN_HOST, or an eligible
 * member on the business-root portal or a dedicated Store Admin host.
 * Disabled users never.
 */
export async function sessionAllowed(db: Db, userId: string, rawHost: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isPlatformOwner: true, disabledAt: true } });
  if (!user) return false;
  const { host, hostStore } = await hostContext(db, rawHost);
  if (host.kind === "store-portal") {
    return !user.isPlatformOwner && user.disabledAt === null && (await storePortalMemberships(db, userId)).length > 0;
  }
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

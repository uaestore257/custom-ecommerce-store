import "server-only";
import {
  decideStoreAccess,
  mayAccessStoreSection,
  mayRunStoreAction,
  type AdminHost,
  type StoreAccess,
  type StoreFacts,
  type StoreMembershipRole,
  type StoreSection,
  type StoreAction,
} from "@/lib/admin/store-access";
import { getDb } from "@/lib/server/db";
import { requestRuntime } from "@/lib/server/request-runtime";
import { getAuth } from "./auth";
import { hostContext, isStoreOwner, storeFacts, storeMembershipRole, storePortalMemberships } from "./store-access";

// ---------------------------------------------------------------
// ACCESS GUARDS — the only way admin code learns who is calling.
//
// 1. The Better Auth session is read from the request cookie and
//    validated against the Session table (expired or revoked sessions
//    are rejected by Better Auth).
// 2. The user is then RE-READ from our database, so a disabled user or a
//    removed platform-owner flag takes effect on the very next request.
// 3. Browser-supplied roles/flags are never consulted. A portal selection
//    cookie is treated as an untrusted pointer and revalidated by membership.
//
// requirePlatformOwner() returns a PlatformOwner value that can only be
// created here. Platform-only data functions require it as an argument,
// so calling them without this check does not type-check. It also
// requires the exact ADMIN_HOST: the platform owner never works on a
// store's host.
//
// requireStoreAccess(storeId) checks role-based access inside ONE store.
// The platform owner acts on ADMIN_HOST; store members use the exact root
// portal or optional dedicated admin host. Suspended stores are read-only;
// archived stores are closed to members.
// ---------------------------------------------------------------

declare const platformOwnerBrand: unique symbol;

export interface PlatformOwner {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly [platformOwnerBrand]: true;
}

export interface SignedInUser {
  id: string;
  email: string;
  name: string;
  isPlatformOwner: boolean;
}

export class AccessDenied extends Error {
  constructor(readonly reason: "unauthenticated" | "forbidden" | "read-only") {
    super(reason === "unauthenticated" ? "Sign in required." : reason === "read-only" ? "Read-only." : "Access denied.");
  }
}

/** Who is acting inside a store, for audit events. */
export interface StoreActor {
  readonly userId: string;
}

export interface StoreAccessGrant {
  user: SignedInUser;
  access: Exclude<StoreAccess, "none">;
  role: StoreMembershipRole;
  actor: StoreActor;
}

async function requestHost() {
  return (await requestRuntime().headers()).get("host") ?? "";
}

/** The signed-in, non-disabled user of this request, or null. */
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const headers = await requestRuntime().headers();
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const user = await getDb().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, isPlatformOwner: true, disabledAt: true },
  });
  if (!user || user.disabledAt) return null;
  return { id: user.id, email: user.email, name: user.name, isPlatformOwner: user.isPlatformOwner };
}

/** For Server Actions: throws AccessDenied unless the caller is the platform owner, on ADMIN_HOST. */
export async function requirePlatformOwner(): Promise<PlatformOwner> {
  const user = await getSignedInUser();
  if (!user) throw new AccessDenied("unauthenticated");
  const { host } = await hostContext(getDb(), await requestHost());
  if (!user.isPlatformOwner || host.kind !== "admin") throw new AccessDenied("forbidden");
  return { userId: user.id, email: user.email, name: user.name } as PlatformOwner;
}

/**
 * Access to ONE store, for pages (need "read") and Server Actions that
 * change it (need "write"). Throws AccessDenied: "unauthenticated",
 * "forbidden" (no access — also for a store that doesn't exist, so
 * nothing about other stores leaks), or "read-only" (a suspended store's
 * owner asking to change something).
 */
export async function requireStoreAccess(
  storeId: string,
  need: "read" | "write" = "read",
  action?: StoreAction,
): Promise<StoreAccessGrant> {
  const user = await getSignedInUser();
  if (!user) throw new AccessDenied("unauthenticated");
  const db = getDb();
  const { host, hostStore } = await hostContext(db, await requestHost(), user.id);
  const routeStore = await storeFacts(db, { id: storeId });
  const role = routeStore &&
    (host.kind === "store-portal" || (host.kind === "store" && hostStore?.id === routeStore.id))
    ? await storeMembershipRole(db, user.id, routeStore.id)
    : null;
  const ownsRouteStore =
    routeStore && role === "OWNER" && (host.kind === "store" || host.kind === "store-portal")
      ? await isStoreOwner(db, user.id, routeStore.id)
      : false;
  const access = decideStoreAccess({
    user: { isPlatformOwner: user.isPlatformOwner, disabled: false },
    host,
    hostStore: host.kind === "store-portal" ? routeStore : hostStore,
    routeStore,
    membershipRole: role,
    ownsRouteStore,
  });
  if (access === "none") throw new AccessDenied("forbidden");
  if (need === "write" && access !== "write") throw new AccessDenied("read-only");
  if (action && !mayRunStoreAction(role ?? "STAFF", action, user.isPlatformOwner && host.kind === "admin")) {
    throw new AccessDenied("forbidden");
  }
  return { user, access, role: role ?? "STAFF", actor: { userId: user.id } };
}

export type AdminViewer =
  | { kind: "platform"; user: SignedInUser }
  | { kind: "store-portal"; user: SignedInUser; stores: Awaited<ReturnType<typeof storePortalMemberships>> }
  | {
      kind: "store";
      user: SignedInUser;
      store: StoreFacts;
      access: Exclude<StoreAccess, "none">;
      role: StoreMembershipRole;
      portal: boolean;
      availableStores?: Awaited<ReturnType<typeof storePortalMemberships>>;
    };

/**
 * Who is using the admin on this host: the platform owner on ADMIN_HOST,
 * or a member of the store this store-admin host names. Throws AccessDenied
 * otherwise (the admin layout turns that into /login or a 404).
 */
export async function requireAdminViewer(): Promise<AdminViewer> {
  const user = await getSignedInUser();
  if (!user) throw new AccessDenied("unauthenticated");
  const db = getDb();
  const { host, hostStore } = await hostContext(db, await requestHost(), user.id);
  if (host.kind === "admin") {
    if (!user.isPlatformOwner) throw new AccessDenied("forbidden");
    return { kind: "platform", user };
  }
  if (host.kind === "store-portal") {
    const stores = await storePortalMemberships(db, user.id);
    if (user.isPlatformOwner || stores.length === 0) throw new AccessDenied("forbidden");
    const selected = hostStore
      ? stores.find(({ store }) => store.id === hostStore.id)
      : stores.length === 1
        ? stores[0]
        : undefined;
    if (!selected) return { kind: "store-portal", user, stores };
    const selectedStore = hostStore ?? selected.store;
    const access = decideStoreAccess({
      user: { isPlatformOwner: false, disabled: false },
      host,
      hostStore: selectedStore,
      routeStore: selectedStore,
      membershipRole: selected.role,
      ownsRouteStore: selected.role === "OWNER",
    });
    if (access === "none") throw new AccessDenied("forbidden");
    return {
      kind: "store",
      user,
      store: selectedStore,
      access,
      role: selected.role,
      portal: true,
      availableStores: stores,
    };
  }
  if (host.kind !== "store" || !hostStore) throw new AccessDenied("forbidden");
  const role = await storeMembershipRole(db, user.id, hostStore.id);
  const owns = role === "OWNER" ? await isStoreOwner(db, user.id, hostStore.id) : false;
  const access = decideStoreAccess({
    user: { isPlatformOwner: user.isPlatformOwner, disabled: false },
    host,
    hostStore,
    routeStore: hostStore,
    membershipRole: role,
    ownsRouteStore: owns,
  });
  if (access === "none") throw new AccessDenied("forbidden");
  return { kind: "store", user, store: hostStore, access, role: role ?? "STAFF", portal: false };
}

export async function requireStoreSection(storeId: string, section: StoreSection): Promise<StoreAccessGrant> {
  const grant = await requireStoreAccess(storeId);
  if (!mayAccessStoreSection(grant.role, section, grant.user.isPlatformOwner)) throw new AccessDenied("forbidden");
  return grant;
}

export { mayRunStoreAction };
export type { AdminHost, StoreAction, StoreSection };

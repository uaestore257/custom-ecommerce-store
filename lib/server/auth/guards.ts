import "server-only";
import { decideStoreAccess, type AdminHost, type StoreAccess, type StoreFacts } from "@/lib/admin/store-access";
import { getDb } from "@/lib/server/db";
import { requestRuntime } from "@/lib/server/request-runtime";
import { getAuth } from "./auth";
import { hostContext, isStoreOwner, storeFacts } from "./store-access";

// ---------------------------------------------------------------
// ACCESS GUARDS — the only way admin code learns who is calling.
//
// 1. The Better Auth session is read from the request cookie and
//    validated against the Session table (expired or revoked sessions
//    are rejected by Better Auth).
// 2. The user is then RE-READ from our database, so a disabled user or a
//    removed platform-owner flag takes effect on the very next request.
// 3. Nothing the browser sends (store IDs, roles, flags) is consulted.
//
// requirePlatformOwner() returns a PlatformOwner value that can only be
// created here. Platform-only data functions require it as an argument,
// so calling them without this check does not type-check. It also
// requires the exact ADMIN_HOST: the platform owner never works on a
// store's host.
//
// requireStoreAccess(storeId) is for everything inside ONE store. It
// applies lib/admin/store-access.ts: the platform owner on ADMIN_HOST, or
// an OWNER of that exact store on that store's own host (the storeId
// must be the store the Host serves). Suspended stores are read-only;
// archived stores are closed to owners.
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
export async function requireStoreAccess(storeId: string, need: "read" | "write" = "read"): Promise<StoreAccessGrant> {
  const user = await getSignedInUser();
  if (!user) throw new AccessDenied("unauthenticated");
  const db = getDb();
  const { host, hostStore } = await hostContext(db, await requestHost());
  const routeStore = await storeFacts(db, { id: storeId });
  const ownsRouteStore = routeStore && host.kind === "store" ? await isStoreOwner(db, user.id, routeStore.id) : false;
  const access = decideStoreAccess({
    user: { isPlatformOwner: user.isPlatformOwner, disabled: false },
    host,
    hostStore,
    routeStore,
    ownsRouteStore,
  });
  if (access === "none") throw new AccessDenied("forbidden");
  if (need === "write" && access !== "write") throw new AccessDenied("read-only");
  return { user, access, actor: { userId: user.id } };
}

export type AdminViewer =
  | { kind: "platform"; user: SignedInUser }
  | { kind: "store"; user: SignedInUser; store: StoreFacts; access: Exclude<StoreAccess, "none"> };

/**
 * Who is using the admin on this host: the platform owner on ADMIN_HOST,
 * or the owner of the store this store host serves. Throws AccessDenied
 * otherwise (the admin layout turns that into /login or a 404).
 */
export async function requireAdminViewer(): Promise<AdminViewer> {
  const user = await getSignedInUser();
  if (!user) throw new AccessDenied("unauthenticated");
  const db = getDb();
  const { host, hostStore } = await hostContext(db, await requestHost());
  if (host.kind === "admin") {
    if (!user.isPlatformOwner) throw new AccessDenied("forbidden");
    return { kind: "platform", user };
  }
  if (host.kind !== "store" || !hostStore) throw new AccessDenied("forbidden");
  const owns = await isStoreOwner(db, user.id, hostStore.id);
  const access = decideStoreAccess({
    user: { isPlatformOwner: user.isPlatformOwner, disabled: false },
    host,
    hostStore,
    routeStore: hostStore,
    ownsRouteStore: owns,
  });
  if (access === "none") throw new AccessDenied("forbidden");
  return { kind: "store", user, store: hostStore, access };
}

export type { AdminHost };

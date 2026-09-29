import { normalizeHost } from "../auth/constants";
import { matchStoreHost, type StoreHostConfig } from "../store-host";
import type { DbStoreStatus } from "./types";

// ---------------------------------------------------------------
// WHO MAY USE WHICH STORE'S ADMIN, AND HOW (pure rules — no database).
// The server guard (to come: requireStoreAccess) looks up the facts —
// the signed-in user, the store the Host names, the store in the route,
// and the user's OWNER membership — and asks decideStoreAccess(). Nothing
// the browser sends is a fact here: the host's store is resolved on the
// server, and a route/action storeId only counts if it IS that store.
//
//   ADMIN_HOST  -> the platform owner only, every non-archived store,
//                  full access. Store owners never sign in here.
//   store host  -> only an OWNER of the store that host serves, and only
//                  for that store (the route's store must be the host's).
//                  Draft, active and paused: full access. Suspended:
//                  read-only. Archived: no access. The platform owner
//                  does not use store hosts (admin-host-only).
//   other host  -> nobody.
// ---------------------------------------------------------------

export type StoreAccess = "write" | "read" | "none";

export type AdminHost = { kind: "admin" } | { kind: "store"; slug: string } | { kind: "other" };

/** Which kind of admin host a request's Host is. Only the exact ADMIN_HOST is the platform admin. */
export function adminHostOf(rawHost: string, config: StoreHostConfig): AdminHost {
  const host = normalizeHost(rawHost);
  if (config.adminHost && host === config.adminHost) return { kind: "admin" };
  const match = matchStoreHost(host, config);
  return match.kind === "store" ? { kind: "store", slug: match.slug } : { kind: "other" };
}

export interface StoreFacts {
  id: string;
  status: DbStoreStatus;
  archived: boolean;
}

export interface AccessFacts {
  /** The signed-in user, or null. */
  user: { isPlatformOwner: boolean; disabled: boolean } | null;
  host: AdminHost;
  /** On a store host: the store its slug/domain names (looked up by the server), or null. */
  hostStore: StoreFacts | null;
  /** The store the page or action is about (from the route), or null if it doesn't exist. */
  routeStore: StoreFacts | null;
  /** Whether the user has an OWNER membership for routeStore. */
  ownsRouteStore: boolean;
}

export function decideStoreAccess(facts: AccessFacts): StoreAccess {
  const { user, host, hostStore, routeStore } = facts;
  if (!user || user.disabled || !routeStore || routeStore.archived) return "none";

  if (host.kind === "admin") return user.isPlatformOwner ? "write" : "none";
  if (host.kind !== "store" || user.isPlatformOwner) return "none";

  // Store host: the route's store must be exactly the store this host serves.
  if (!hostStore || hostStore.archived || hostStore.id !== routeStore.id) return "none";
  if (!facts.ownsRouteStore) return "none";
  return routeStore.status === "SUSPENDED" ? "read" : "write";
}

/** Whether a sign-in may open a session on this host (the session hook). */
export function mayOpenSession(facts: {
  user: { isPlatformOwner: boolean; disabled: boolean } | null;
  host: AdminHost;
  hostStore: StoreFacts | null;
  ownsHostStore: boolean;
}): boolean {
  const { user, host, hostStore } = facts;
  if (!user || user.disabled) return false;
  if (host.kind === "admin") return user.isPlatformOwner;
  if (host.kind !== "store" || user.isPlatformOwner) return false;
  return Boolean(hostStore && !hostStore.archived && facts.ownsHostStore);
}

export type ActionLevel = "platform-owner" | "store-owner";

/**
 * Whether an action of this level may run. Platform-owner actions (store
 * lifecycle, status, slug, ownership) need the platform owner on the
 * admin host; store-owner actions need write access to that store, so a
 * suspended store's owner (read access) can change nothing.
 */
export function mayRunAction(level: ActionLevel, access: StoreAccess, facts: { isPlatformOwner: boolean; host: AdminHost }) {
  if (level === "platform-owner") return facts.isPlatformOwner && facts.host.kind === "admin";
  return access === "write";
}

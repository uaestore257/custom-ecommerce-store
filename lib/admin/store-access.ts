import { normalizeHost } from "../auth/constants";
import { matchStoreHost, type StoreHostConfig } from "../store-host";
import type { DbStoreStatus } from "./types";

// ---------------------------------------------------------------
// WHO MAY USE WHICH STORE'S ADMIN, AND HOW (pure rules — no database).
// The server guard (requireStoreAccess) looks up the facts —
// the signed-in user, the store the Host names, the store in the route,
// and the user's membership role — and asks decideStoreAccess(). Nothing
// the browser sends is a fact here: the host's store is resolved on the
// server, and a route/action storeId only counts if it IS that store.
//
//   ADMIN_HOST  -> the platform owner only, every non-archived store,
//                  full access. Store owners never sign in here.
//   store host  -> a member of the store that host serves, and only for
//                  that store. OWNER has full access; MANAGER has
//                  operational access; STAFF is read-only. Suspended:
//                  read-only. Archived: no access. The platform owner
//                  does not use store hosts (admin-host-only).
//   other host  -> nobody.
// ---------------------------------------------------------------

export type StoreAccess = "write" | "read" | "none";
export type StoreMembershipRole = "OWNER" | "MANAGER" | "STAFF";
export type StoreSection = "overview" | "products" | "categories" | "orders" | "messages" | "settings" | "team" | "customers" | "domains";

export type AdminHost = { kind: "admin" } | { kind: "store"; slug: string } | { kind: "other" };

/** Which kind of admin host a request's Host is. Only the exact ADMIN_HOST is the platform admin. */
export function adminHostOf(rawHost: string, config: StoreHostConfig): AdminHost {
  const host = normalizeHost(rawHost);
  if (config.adminHost && host === config.adminHost) return { kind: "admin" };
  const match = matchStoreHost(host, config);
  return match.kind === "store-admin" ? { kind: "store", slug: match.slug } : { kind: "other" };
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
  /** The authenticated user's membership role in routeStore, resolved by the server. */
  membershipRole?: StoreMembershipRole | null;
  /** Kept explicit so OWNER authorization retains its existing membership rule. */
  ownsRouteStore: boolean;
}

export function decideStoreAccess(facts: AccessFacts): StoreAccess {
  const { user, host, hostStore, routeStore } = facts;
  if (!user || user.disabled || !routeStore || routeStore.archived) return "none";

  if (host.kind === "admin") return user.isPlatformOwner ? "write" : "none";
  if (host.kind !== "store" || user.isPlatformOwner) return "none";

  // Store host: the route's store must be exactly the store this host serves.
  if (!hostStore || hostStore.archived || hostStore.id !== routeStore.id) return "none";
  const role = facts.membershipRole ?? (facts.ownsRouteStore ? "OWNER" : null);
  if (role === "OWNER" && !facts.ownsRouteStore) return "none";
  if (!role) return "none";
  if (role === "STAFF" || routeStore.status === "SUSPENDED") return "read";
  return "write";
}

/** Whether a sign-in may open a session on this host (the session hook). */
export function mayOpenSession(facts: {
  user: { isPlatformOwner: boolean; disabled: boolean } | null;
  host: AdminHost;
  hostStore: StoreFacts | null;
  ownsHostStore: boolean;
  membershipRole?: StoreMembershipRole | null;
}): boolean {
  const { user, host, hostStore } = facts;
  if (!user || user.disabled) return false;
  if (host.kind === "admin") return user.isPlatformOwner;
  if (host.kind !== "store" || user.isPlatformOwner) return false;
  const role = facts.membershipRole ?? (facts.ownsHostStore ? "OWNER" : null);
  if (!hostStore || hostStore.archived || !role) return false;
  return role !== "OWNER" || facts.ownsHostStore;
}

export function mayAccessStoreSection(role: StoreMembershipRole, section: StoreSection, platform = false): boolean {
  if (platform || role === "OWNER") return true;
  if (section === "overview") return true;
  if (role === "MANAGER") {
    return ["products", "categories", "orders", "messages", "team", "domains"].includes(section);
  }
  return section === "orders" || section === "messages";
}

export type StoreAction = "store-settings" | "team-management" | "domain-management" | "products" | "categories" | "orders" | "messages";

export function mayRunStoreAction(role: StoreMembershipRole, action: StoreAction, platform = false): boolean {
  if (platform || role === "OWNER") return true;
  if (role === "MANAGER") return action !== "store-settings";
  return false;
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

// Store admin access rules (lib/admin/store-access.ts). Pure: no database.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminHostOf,
  decideStoreAccess,
  mayOpenSession,
  mayRunAction,
  type AccessFacts,
  type StoreFacts,
} from "../../lib/admin/store-access";
import type { DbStoreStatus } from "../../lib/admin/types";
import { storeHostConfig } from "../../lib/store-host";

const config = storeHostConfig({
  ADMIN_HOST: "admin.shops.test",
  PLATFORM_ROOT_DOMAIN: "shops.test",
  STORE_DOMAINS: "shop.client.test=nest-and-oak",
  NODE_ENV: "production",
} as unknown as NodeJS.ProcessEnv);

const store = (id: string, status: DbStoreStatus = "ACTIVE", archived = false): StoreFacts => ({ id, status, archived });
const owner = { isPlatformOwner: false, disabled: false };
const platform = { isPlatformOwner: true, disabled: false };
const A = store("store-a");
const B = store("store-b");

/** An owner of store A, on store A's own host, looking at store A — overridable. */
const facts = (overrides: Partial<AccessFacts> = {}): AccessFacts => ({
  user: owner,
  host: { kind: "store", slug: "nest-and-oak" },
  hostStore: A,
  routeStore: A,
  ownsRouteStore: true,
  ...overrides,
});

test("adminHostOf: only the exact ADMIN_HOST is the platform admin; store hosts by subdomain or mapped domain", () => {
  assert.deepEqual(adminHostOf("admin.shops.test", config), { kind: "admin" });
  assert.deepEqual(adminHostOf("ADMIN.shops.test.", config), { kind: "admin" });
  assert.deepEqual(adminHostOf("nest-and-oak.shops.test", config), { kind: "store", slug: "nest-and-oak" });
  assert.deepEqual(adminHostOf("shop.client.test", config), { kind: "store", slug: "nest-and-oak" });
  for (const host of ["shops.test", "admin.shops.test:4000", "evil.example", "admin.shops.test.evil.com", ""]) {
    assert.deepEqual(adminHostOf(host, config), { kind: "other" }, host);
  }
});

test("the platform owner has full access on the admin host, to any non-archived store, whatever its status", () => {
  for (const status of ["DRAFT", "ACTIVE", "PAUSED", "SUSPENDED"] as const) {
    assert.equal(decideStoreAccess({ user: platform, host: { kind: "admin" }, hostStore: null, routeStore: store("x", status), ownsRouteStore: false }), "write", status);
  }
  assert.equal(decideStoreAccess({ user: platform, host: { kind: "admin" }, hostStore: null, routeStore: store("x", "ACTIVE", true), ownsRouteStore: false }), "none", "archived");
});

test("an owner has full access to their own draft, active or paused store on its own host", () => {
  for (const status of ["DRAFT", "ACTIVE", "PAUSED"] as const) {
    const own = store("store-a", status);
    assert.equal(decideStoreAccess(facts({ hostStore: own, routeStore: own })), "write", status);
  }
});

test("a suspended store's owner is read-only; an archived store's owner has no access", () => {
  const suspended = store("store-a", "SUSPENDED");
  assert.equal(decideStoreAccess(facts({ hostStore: suspended, routeStore: suspended })), "read");
  const archived = store("store-a", "ACTIVE", true);
  assert.equal(decideStoreAccess(facts({ hostStore: archived, routeStore: archived })), "none");
});

test("an owner can't reach another store: not by URL/action storeId, not on another store's host, not without membership", () => {
  // Own host, but the route or action names store B.
  assert.equal(decideStoreAccess(facts({ routeStore: B, ownsRouteStore: false })), "none");
  // Even if they also own B, B's admin is only on B's host.
  assert.equal(decideStoreAccess(facts({ routeStore: B, ownsRouteStore: true })), "none");
  // On B's host, looking at B, without owning B.
  assert.equal(decideStoreAccess(facts({ host: { kind: "store", slug: "b" }, hostStore: B, routeStore: B, ownsRouteStore: false })), "none");
  // A host that names no public store record.
  assert.equal(decideStoreAccess(facts({ hostStore: null })), "none");
  // Missing route store.
  assert.equal(decideStoreAccess(facts({ routeStore: null })), "none");
});

test("store owners get nothing on the admin host or unknown hosts; the platform owner gets nothing on store hosts", () => {
  assert.equal(decideStoreAccess(facts({ host: { kind: "admin" } })), "none");
  assert.equal(decideStoreAccess(facts({ host: { kind: "other" } })), "none");
  assert.equal(decideStoreAccess(facts({ user: platform, ownsRouteStore: false })), "none");
  assert.equal(decideStoreAccess(facts({ user: platform, ownsRouteStore: true })), "none", "admin-host-only even if also a member");
});

test("signed-out and disabled users get nothing anywhere", () => {
  for (const user of [null, { isPlatformOwner: false, disabled: true }, { isPlatformOwner: true, disabled: true }]) {
    assert.equal(decideStoreAccess(facts({ user })), "none");
    assert.equal(decideStoreAccess(facts({ user, host: { kind: "admin" } })), "none");
  }
});

test("sessions open only for the platform owner on the admin host, or an owner of a non-archived store on its host", () => {
  const s = (o: Partial<Parameters<typeof mayOpenSession>[0]>) =>
    mayOpenSession({ user: owner, host: { kind: "store", slug: "nest-and-oak" }, hostStore: A, ownsHostStore: true, ...o });
  assert.equal(s({}), true);
  assert.equal(s({ hostStore: store("store-a", "SUSPENDED") }), true, "suspended owners may sign in (read-only)");
  assert.equal(s({ hostStore: store("store-a", "ACTIVE", true) }), false, "archived");
  assert.equal(s({ ownsHostStore: false }), false);
  assert.equal(s({ hostStore: null }), false);
  assert.equal(s({ host: { kind: "admin" } }), false, "owners don't sign in on the admin host");
  assert.equal(s({ user: platform, host: { kind: "admin" }, hostStore: null, ownsHostStore: false }), true);
  assert.equal(s({ user: platform }), false, "platform owner doesn't sign in on store hosts");
  assert.equal(s({ host: { kind: "other" } }), false);
  assert.equal(s({ user: { isPlatformOwner: false, disabled: true } }), false);
  assert.equal(s({ user: null }), false);
});

test("platform-only actions need the platform owner on the admin host; owner actions need write access", () => {
  const admin = { kind: "admin" } as const;
  const storeHost = { kind: "store", slug: "nest-and-oak" } as const;
  assert.equal(mayRunAction("platform-owner", "write", { isPlatformOwner: true, host: admin }), true);
  assert.equal(mayRunAction("platform-owner", "write", { isPlatformOwner: false, host: storeHost }), false, "owner can't run platform-only actions");
  assert.equal(mayRunAction("platform-owner", "write", { isPlatformOwner: true, host: storeHost }), false);
  assert.equal(mayRunAction("store-owner", "write", { isPlatformOwner: false, host: storeHost }), true);
  assert.equal(mayRunAction("store-owner", "read", { isPlatformOwner: false, host: storeHost }), false, "suspended: every change refused");
  assert.equal(mayRunAction("store-owner", "none", { isPlatformOwner: false, host: storeHost }), false);
});

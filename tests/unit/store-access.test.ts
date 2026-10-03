// Store admin access rules (lib/admin/store-access.ts). Pure: no database.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminHostOf,
  decideStoreAccess,
  mayAccessStoreSection,
  mayOpenSession,
  mayRunAction,
  mayRunStoreAction,
  type AccessFacts,
  type StoreFacts,
} from "../../lib/admin/store-access";
import type { DbStoreStatus } from "../../lib/admin/types";
import { safeAdminReturnTo } from "../../lib/auth/constants";
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
  membershipRole: "OWNER",
  ...overrides,
});

test("adminHostOf: platform admin, central Store Admin portal and reserved tenant admin hosts are distinct", () => {
  assert.deepEqual(adminHostOf("admin.shops.test", config), { kind: "admin" });
  assert.deepEqual(adminHostOf("ADMIN.shops.test.", config), { kind: "admin" });
  assert.deepEqual(adminHostOf("shops.test", config), { kind: "store-portal" });
  assert.deepEqual(adminHostOf("shops.test:443", config), { kind: "store-portal" });
  assert.deepEqual(adminHostOf("admin.nest-and-oak.shops.test", config), { kind: "store", slug: "nest-and-oak" });
  for (const host of [
    "nest-and-oak.shops.test",
    "shop.client.test",
    "admin.nest-and-oak.shops.test.evil.com",
    "admin.shops.test:4000",
    "evil.example",
    "admin.shops.test.evil.com",
    "",
  ]) {
    assert.deepEqual(adminHostOf(host, config), { kind: "other" }, host);
  }
});

test("login return paths are restricted to same-origin admin routes", () => {
  assert.equal(safeAdminReturnTo("/admin/stores/store-a/orders/order-1"), "/admin/stores/store-a/orders/order-1");
  assert.equal(safeAdminReturnTo("/admin?from=email"), "/admin?from=email");
  const unsafe: (string | string[])[] = [
    "https://evil.test/admin",
    "//evil.test/admin",
    "/portfolio",
    "/admin/../login",
    ["/admin"],
  ];
  for (const value of unsafe) {
    assert.equal(safeAdminReturnTo(value), null, String(value));
  }
});

test("the central business-root portal requires a selected, matching membership and never grants platform access", () => {
  assert.equal(decideStoreAccess(facts({ host: { kind: "store-portal" } })), "write");
  assert.equal(
    decideStoreAccess(facts({ host: { kind: "store-portal" }, routeStore: B, ownsRouteStore: false })),
    "none",
    "changing the route store cannot change the server-validated selection",
  );
  assert.equal(
    decideStoreAccess(facts({ host: { kind: "store-portal" }, hostStore: B, routeStore: B, membershipRole: "MANAGER", ownsRouteStore: false })),
    "write",
  );
  assert.equal(
    decideStoreAccess(facts({ host: { kind: "store-portal" }, hostStore: B, routeStore: B, membershipRole: "STAFF", ownsRouteStore: false })),
    "read",
  );
  assert.equal(
    decideStoreAccess(facts({ host: { kind: "store-portal" }, user: platform, hostStore: B, routeStore: B, membershipRole: "MANAGER" })),
    "none",
  );
  assert.equal(decideStoreAccess(facts({ host: { kind: "store-portal" }, hostStore: null })), "none");
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

test("Managers and Staff get only their own store access at their assigned level", () => {
  for (const role of ["MANAGER", "STAFF"] as const) {
    assert.equal(decideStoreAccess(facts({ membershipRole: role, ownsRouteStore: false })), role === "MANAGER" ? "write" : "read");
    assert.equal(decideStoreAccess(facts({ membershipRole: role, routeStore: B, ownsRouteStore: false })), "none");
    assert.equal(decideStoreAccess(facts({ membershipRole: role, host: { kind: "admin" }, ownsRouteStore: false })), "none");
  }
  assert.equal(decideStoreAccess(facts({ membershipRole: "MANAGER", routeStore: store("store-a", "SUSPENDED") })), "read");
  assert.equal(decideStoreAccess(facts({ membershipRole: "STAFF", host: { kind: "store", slug: "b" }, hostStore: B, routeStore: B })), "read");
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

test("sessions open for store members on their own store host, or the platform owner on the admin host", () => {
  const s = (o: Partial<Parameters<typeof mayOpenSession>[0]>) =>
    mayOpenSession({ user: owner, host: { kind: "store", slug: "nest-and-oak" }, hostStore: A, ownsHostStore: true, ...o });
  assert.equal(s({}), true);
  assert.equal(s({ hostStore: store("store-a", "SUSPENDED") }), true, "suspended owners may sign in (read-only)");
  assert.equal(s({ hostStore: store("store-a", "ACTIVE", true) }), false, "archived");
  assert.equal(s({ ownsHostStore: false }), false);
  assert.equal(s({ ownsHostStore: false, membershipRole: "MANAGER" }), true);
  assert.equal(s({ ownsHostStore: false, membershipRole: "STAFF" }), true);
  assert.equal(s({ hostStore: null }), false);
  assert.equal(s({ hostStore: store("store-a", "ACTIVE", true), membershipRole: "MANAGER" }), false);
  assert.equal(s({ host: { kind: "admin" } }), false, "owners don't sign in on the admin host");
  assert.equal(s({ user: platform, host: { kind: "admin" }, hostStore: null, ownsHostStore: false }), true);
  assert.equal(
    s({ user: owner, host: { kind: "admin" }, hostStore: null, ownsHostStore: false, membershipRole: "MANAGER" }),
    false,
    "Managers cannot sign in on the Platform Owner host",
  );
  assert.equal(
    s({ user: owner, host: { kind: "admin" }, hostStore: null, ownsHostStore: false, membershipRole: "STAFF" }),
    false,
    "Staff cannot sign in on the Platform Owner host",
  );
  assert.equal(s({ user: platform }), false, "platform owner doesn't sign in on store hosts");
  assert.equal(s({ host: { kind: "other" } }), false);
  assert.equal(s({ user: { isPlatformOwner: false, disabled: true } }), false);
  assert.equal(s({ user: null }), false);
  assert.equal(
    mayOpenSession({
      user: owner,
      host: { kind: "store-portal" },
      hostStore: A,
      ownsHostStore: true,
      membershipRole: "OWNER",
    }),
    true,
  );
  assert.equal(
    mayOpenSession({
      user: platform,
      host: { kind: "store-portal" },
      hostStore: A,
      ownsHostStore: false,
      membershipRole: "MANAGER",
    }),
    false,
  );
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

test("Manager and Staff section and action permissions do not extend to Owner controls", () => {
  assert.equal(mayAccessStoreSection("OWNER", "customers"), true);
  for (const section of ["products", "categories", "orders", "messages", "team", "domains"] as const) {
    assert.equal(mayAccessStoreSection("MANAGER", section), true);
  }
  for (const section of ["settings", "customers"] as const) assert.equal(mayAccessStoreSection("MANAGER", section), false);
  for (const section of ["overview", "orders", "messages"] as const) assert.equal(mayAccessStoreSection("STAFF", section), true);
  for (const section of ["products", "categories", "settings", "team", "customers"] as const) {
    assert.equal(mayAccessStoreSection("STAFF", section), false);
  }

  assert.equal(mayRunStoreAction("MANAGER", "products"), true);
  assert.equal(mayRunStoreAction("MANAGER", "team-management"), true);
  assert.equal(mayRunStoreAction("MANAGER", "domain-management"), true);
  assert.equal(mayRunStoreAction("MANAGER", "store-settings"), false);
  for (const action of ["products", "categories", "orders", "messages", "team-management", "domain-management", "store-settings"] as const) {
    assert.equal(mayRunStoreAction("STAFF", action), false);
  }
  assert.equal(mayAccessStoreSection("STAFF", "customers", true), true, "platform navigation is unchanged");
  assert.equal(mayAccessStoreSection("STAFF", "domains", true), true, "platform store access is unchanged");
  assert.equal(mayRunStoreAction("STAFF", "store-settings", true), true, "platform store actions are unchanged");
});

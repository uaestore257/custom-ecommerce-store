// Every exported admin Server Action, called the way a crafted POST would
// call it: signed out, as a signed-in user who is not the platform owner,
// and as the platform owner. Refused calls must leave the database
// untouched. A new action without a rule in ACTION_PERMISSIONS fails here.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import * as actions from "../../app/admin/actions";
import type { ActionResult } from "../../lib/admin/types";
import { ACTION_PERMISSIONS } from "../../lib/server/admin/permissions";
import { getDb } from "../../lib/server/db";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import { actAs, ensurePlatformOwner, signIn, setTestAuthEnv } from "./auth-helpers";
import { uid } from "./helpers";

setTestAuthEnv();
const db = getDb();
let ownerId = "";
let ownerCookie = "";
let productOfA = "";
let productOfB = "";
let categoryOfA = "";

const SIGNED_OUT = "Your session has ended. Please sign in again.";
const FORBIDDEN = "You don't have access to do this.";

before(async () => {
  ownerId = (await ensurePlatformOwner()).id;
  ownerCookie = await signIn();
  productOfA = (await db.product.findFirstOrThrow({ where: { storeId: "store-a" } })).id;
  productOfB = (await db.product.findFirstOrThrow({ where: { storeId: "store-b" } })).id;
  categoryOfA = (await db.category.findFirstOrThrow({ where: { storeId: "store-a" } })).id;
});
after(async () => {
  setRequestRuntimeForTests(null);
  await db.$disconnect();
});

const newStore = () => ({
  name: "Crafted Store",
  slug: `crafted-${uid()}`,
  businessType: "furniture",
  status: "ACTIVE",
  ownerName: "Crafted Owner",
  ownerEmail: `crafted-${uid()}@example.com`,
  countryCode: "GB",
  baseCurrency: "GBP",
  timezone: "Europe/London",
  defaultLanguage: "en",
  languages: ["en"],
  accentColor: "#123456",
});

// One call per exported action, with arguments a crafted request could send.
interface Target {
  storeId: string;
  productId: string;
  categoryId: string;
}
const calls = (t: Target): Record<keyof typeof ACTION_PERMISSIONS, () => Promise<ActionResult<unknown>>> => ({
  createStoreAction: () => actions.createStoreAction(newStore()),
  updateStoreAction: () => actions.updateStoreAction(t.storeId, { name: "Hijacked", status: "ACTIVE" }),
  setStoreOwnerAction: () => actions.setStoreOwnerAction(t.storeId, { ownerName: "Crafted", ownerEmail: `crafted-owner-${uid()}@example.com` }),
  setStoreStatusAction: () => actions.setStoreStatusAction(t.storeId, "SUSPENDED"),
  archiveStoreAction: () => actions.archiveStoreAction(t.storeId),
  restoreStoreAction: () => actions.restoreStoreAction(t.storeId),
  createProductAction: () => actions.createProductAction(t.storeId, { name: "Injected", sku: `INJ-${uid()}` }),
  updateProductAction: () => actions.updateProductAction(t.storeId, t.productId, { name: "Hijacked" }),
  deleteProductAction: () => actions.deleteProductAction(t.storeId, t.productId),
  createCategoryAction: () => actions.createCategoryAction(t.storeId, { name: `Injected ${uid()}` }),
  updateCategoryAction: () => actions.updateCategoryAction(t.storeId, t.categoryId, { name: `Renamed ${uid()}` }),
  moveCategoryAction: () => actions.moveCategoryAction(t.storeId, t.categoryId, "down"),
  deleteCategoryAction: () => actions.deleteCategoryAction(t.storeId, t.categoryId, null),
});
const seeded = () => calls({ storeId: "store-a", productId: productOfA, categoryId: categoryOfA });

/** Everything a refused action could have changed. */
async function snapshot() {
  const [stores, products, categories, memberships, users, audit] = await Promise.all([
    db.store.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, status: true, archivedAt: true, updatedAt: true } }),
    db.product.findMany({ orderBy: { id: "asc" }, select: { id: true, status: true, updatedAt: true } }),
    db.category.findMany({ orderBy: { id: "asc" }, select: { id: true, position: true, updatedAt: true } }),
    db.storeMembership.findMany({ orderBy: { id: "asc" }, select: { id: true, userId: true, role: true } }),
    db.user.count(),
    db.auditEvent.count({ where: { action: { startsWith: "store." } } }),
  ]);
  return JSON.stringify({ stores, products, categories, memberships, users, audit });
}

test("every exported action has a permission rule, and every rule an action", () => {
  const exported = Object.keys(actions).filter((k) => typeof (actions as Record<string, unknown>)[k] === "function").sort();
  assert.deepEqual(exported, Object.keys(ACTION_PERMISSIONS).sort());
  assert.deepEqual(Object.keys(seeded()).sort(), exported);
});

test("signed out: every action is refused and nothing changes", async () => {
  actAs(null);
  const before = await snapshot();
  for (const [name, call] of Object.entries(seeded())) {
    const result = await call();
    assert.deepEqual(result, { ok: false, error: SIGNED_OUT }, name);
  }
  assert.equal(await snapshot(), before);
});

test("a forged or tampered cookie is treated as signed out", async () => {
  const before = await snapshot();
  for (const cookie of ["codex-admin.session_token=forged.value", ownerCookie.replace(/session_token=([^;.]+)/, "session_token=$1x")]) {
    actAs(cookie);
    for (const [name, call] of Object.entries(seeded())) assert.deepEqual(await call(), { ok: false, error: SIGNED_OUT }, name);
  }
  assert.equal(await snapshot(), before);
});

test("signed in but not the platform owner: every action is refused and nothing changes", async () => {
  await db.user.update({ where: { id: ownerId }, data: { isPlatformOwner: false } });
  try {
    actAs(ownerCookie);
    const before = await snapshot();
    for (const [name, call] of Object.entries(seeded())) {
      assert.deepEqual(await call(), { ok: false, error: FORBIDDEN }, name);
    }
    assert.equal(await snapshot(), before);
  } finally {
    await db.user.update({ where: { id: ownerId }, data: { isPlatformOwner: true } });
  }
});

test("the platform owner passes the check for every action", async () => {
  actAs(ownerCookie);
  // A fresh store with a product and a category, so seeded data stays as is.
  const created = await actions.createStoreAction(newStore());
  assert.ok(created.ok, JSON.stringify(created));
  const storeId = created.data.id;
  const categoryId = (await db.category.findFirstOrThrow({ where: { storeId } })).id;
  const product = await actions.createProductAction(storeId, {
    name: "Test lamp", sku: `LAMP-${uid()}`, categoryId, description: "A warm brass lamp.", price: "10", stock: "3", status: "ACTIVE",
  });
  assert.ok(product.ok, JSON.stringify(product));
  const target = { storeId, productId: product.data.id, categoryId };

  // Archive/restore last, so the other calls find an active store.
  const order = Object.entries(calls(target)).sort(([a], [b]) => Number(/archive|restore/.test(a)) - Number(/archive|restore/.test(b)));
  for (const [name, call] of order) {
    const result = await call();
    assert.ok(result.ok || (result.error !== SIGNED_OUT && result.error !== FORBIDDEN), `${name}: ${JSON.stringify(result)}`);
  }
});

test("platform owner: creating a store is audited with the owner as actor", async () => {
  actAs(ownerCookie);
  const result = await actions.createStoreAction(newStore());
  assert.ok(result.ok, JSON.stringify(result));
  const event = await db.auditEvent.findFirst({ where: { action: "store.create", storeId: result.data.id } });
  assert.equal(event?.actorUserId, ownerId);
});

test("settings can't change status, owner, or another store through smuggled fields", async () => {
  actAs(ownerCookie);
  const created = await actions.createStoreAction({ ...newStore(), status: "DRAFT" });
  assert.ok(created.ok);
  const id = created.data.id;
  const detail = await db.store.findUniqueOrThrow({ where: { id }, include: { memberships: { include: { user: true } } } });
  const b = await db.store.findUniqueOrThrow({ where: { id: "store-b" } });

  const result = await actions.updateStoreAction(id, {
    name: "Renamed Store", slug: detail.slug, businessType: "furniture", countryCode: "GB", baseCurrency: "GBP",
    timezone: "Europe/London", defaultLanguage: "en", languages: ["en"], accentColor: "#123456",
    heroTitle: "Hello", deliveryFee: "0",
    // Smuggled:
    status: "ACTIVE", ownerEmail: "mallory@example.com", ownerName: "Mallory", storeId: "store-b", isPlatformOwner: true, role: "OWNER",
  });
  assert.ok(result.ok, JSON.stringify(result));
  const after = await db.store.findUniqueOrThrow({ where: { id }, include: { memberships: { include: { user: true } } } });
  assert.equal(after.name, "Renamed Store");
  assert.equal(after.status, "DRAFT", "status unchanged");
  assert.deepEqual(after.memberships.map((m) => m.user.email), detail.memberships.map((m) => m.user.email), "owner unchanged");
  assert.equal((await db.store.findUniqueOrThrow({ where: { id: "store-b" } })).name, b.name, "other store untouched");
  assert.equal(await db.user.count({ where: { email: "mallory@example.com" } }), 0);
  assert.equal(await db.user.count({ where: { isPlatformOwner: true } }), 1);
});

test("suspend and reactivate are platform actions that keep all data", async () => {
  actAs(ownerCookie);
  const original = (await db.store.findUniqueOrThrow({ where: { id: "store-c" } })).status;
  const products = await db.product.count({ where: { storeId: "store-c" } });
  assert.ok((await actions.setStoreStatusAction("store-c", "SUSPENDED")).ok);
  assert.equal((await db.store.findUniqueOrThrow({ where: { id: "store-c" } })).status, "SUSPENDED");
  assert.equal(await db.product.count({ where: { storeId: "store-c" } }), products);
  const event = await db.auditEvent.findFirst({ where: { action: "store.status_change", storeId: "store-c" }, orderBy: { createdAt: "desc" } });
  assert.deepEqual(event?.metadata, { from: original, to: "SUSPENDED" });
  assert.ok((await actions.setStoreStatusAction("store-c", "ACTIVE")).ok);
  assert.equal((await db.store.findUniqueOrThrow({ where: { id: "store-c" } })).status, "ACTIVE");
  assert.equal((await actions.setStoreStatusAction("store-c", "DELETED")).ok, false);
  assert.ok((await actions.setStoreStatusAction("store-c", original)).ok);
});

test("assigning an existing user as owner doesn't rename them", async () => {
  actAs(ownerCookie);
  const existing = await db.user.create({ data: { email: `shared-${uid()}@example.com`, name: "Original Name" } });
  const result = await actions.setStoreOwnerAction("store-c", { ownerName: "Changed Name", ownerEmail: existing.email });
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: existing.id } })).name, "Original Name");
  const owners = await db.storeMembership.findMany({ where: { storeId: "store-c", role: "OWNER" } });
  assert.deepEqual(owners.map((m) => m.userId), [existing.id]);
  assert.ok(await db.auditEvent.findFirst({ where: { action: "store.owner_change", storeId: "store-c", targetId: existing.id } }));
});

test("cross-store IDs are refused even for the platform owner's actions", async () => {
  actAs(ownerCookie);
  const beforeB = await db.product.findUniqueOrThrow({ where: { id: productOfB } });
  assert.equal((await actions.deleteProductAction("store-a", productOfB)).ok, false);
  assert.equal((await actions.updateProductAction("store-a", productOfB, { name: "Hijacked" })).ok, false);
  const afterB = await db.product.findUniqueOrThrow({ where: { id: productOfB } });
  assert.deepEqual(afterB, beforeB);
});

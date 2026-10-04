// Every exported admin Server Action, called the way a crafted POST would
// call it: signed out, as a signed-in user who is not the platform owner,
// and as the platform owner. Refused calls must leave the database
// untouched. A new action without a rule in ACTION_PERMISSIONS fails here.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import * as actions from "../../app/admin/actions";
import type { ActionResult } from "../../lib/admin/types";
import { hashStoreInvitationToken } from "../../lib/admin/invitations";
import {
  acceptStoreInvitation,
  createStoreInvitation,
  invitationForAcceptance,
  listStoreInvitations,
  listStoreTeamMembers,
} from "../../lib/server/admin/team";
import { ACTION_PERMISSIONS } from "../../lib/server/admin/permissions";
import { getAuth } from "../../lib/server/auth/auth";
import { requireAdminViewer } from "../../lib/server/auth/guards";
import { getDb } from "../../lib/server/db";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import { actAs, ensurePlatformOwner, signIn, setTestAuthEnv, STORE_HOST } from "./auth-helpers";
import { uid } from "./helpers";

setTestAuthEnv();
const db = getDb();
let ownerId = "";
let ownerCookie = "";
let productOfA = "";
let productOfB = "";
let categoryOfA = "";
let orderOfA = "";

const SIGNED_OUT = "Your session has ended. Please sign in again.";
const FORBIDDEN = "You don't have access to do this.";

before(async () => {
  ownerId = (await ensurePlatformOwner()).id;
  ownerCookie = await signIn();
  productOfA = (await db.product.findFirstOrThrow({ where: { storeId: "store-a" } })).id;
  productOfB = (await db.product.findFirstOrThrow({ where: { storeId: "store-b" } })).id;
  categoryOfA = (await db.category.findFirstOrThrow({ where: { storeId: "store-a" } })).id;
  orderOfA = (await db.order.findFirstOrThrow({ where: { storeId: "store-a", status: "PENDING", paymentStatus: "UNPAID" } })).id;
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
  ownerPassword: "a crafted owner passphrase 2026",
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
  orderId: string;
  inquiryId: string;
  membershipId: string;
}
const calls = (t: Target): Record<keyof typeof ACTION_PERMISSIONS, () => Promise<ActionResult<unknown>>> => ({
  createStoreAction: () => actions.createStoreAction(newStore()),
  updateStoreAction: () => actions.updateStoreAction(t.storeId, { name: "Hijacked", status: "ACTIVE" }),
  updateOwnStoreSettingsAction: () => actions.updateOwnStoreSettingsAction({}),
  setStoreOwnerAction: () => actions.setStoreOwnerAction(t.storeId, { ownerName: "Crafted", ownerEmail: `crafted-owner-${uid()}@example.com` }),
  setStoreStatusAction: () => actions.setStoreStatusAction(t.storeId, "SUSPENDED"),
  archiveStoreAction: () => actions.archiveStoreAction(t.storeId),
  restoreStoreAction: () => actions.restoreStoreAction(t.storeId),
  updateStoreDesignAction: () => actions.updateStoreDesignAction(t.storeId, { templateKey: "atelier", theme: { palette: "charcoal" } }),
  setStoreDemoAction: () => actions.setStoreDemoAction(t.storeId, true),
  updateAgencySettingsAction: () => actions.updateAgencySettingsAction({ platformName: "Hijacked agency", contactEmail: "attacker@example.com" }),
  createProductAction: () => actions.createProductAction(t.storeId, { name: "Injected", sku: `INJ-${uid()}` }),
  updateProductAction: () => actions.updateProductAction(t.storeId, t.productId, { name: "Hijacked" }),
  deleteProductAction: () => actions.deleteProductAction(t.storeId, t.productId),
  createCategoryAction: () => actions.createCategoryAction(t.storeId, { name: `Injected ${uid()}` }),
  updateCategoryAction: () => actions.updateCategoryAction(t.storeId, t.categoryId, { name: `Renamed ${uid()}` }),
  moveCategoryAction: () => actions.moveCategoryAction(t.storeId, t.categoryId, "down"),
  deleteCategoryAction: () => actions.deleteCategoryAction(t.storeId, t.categoryId, null),
  setOrderStatusAction: () => actions.setOrderStatusAction(t.storeId, t.orderId, "PENDING", "PROCESSING"),
  cancelOrderAction: () => actions.cancelOrderAction(t.storeId, t.orderId, "PENDING"),
  setOrderPaymentAction: () => actions.setOrderPaymentAction(t.storeId, t.orderId, "UNPAID", "PAID"),
  setInquiryStatusAction: () => actions.setInquiryStatusAction(t.storeId, t.inquiryId, "NEW", "ARCHIVED"),
  updateStoreMemberRoleAction: () => actions.updateStoreMemberRoleAction(t.membershipId, "STAFF"),
  revokeStoreMemberAction: () => actions.revokeStoreMemberAction(t.membershipId),
  createStoreInvitationAction: () => actions.createStoreInvitationAction(`invite-${uid()}@example.com`, "STAFF"),
  revokeStoreInvitationAction: () => actions.revokeStoreInvitationAction(t.membershipId),
  addStoreDomainAction: () => actions.addStoreDomainAction("shop.example.test"),
  verifyStoreDomainAction: () => actions.verifyStoreDomainAction("missing-domain"),
  setPrimaryStoreDomainAction: () => actions.setPrimaryStoreDomainAction("missing-domain"),
  disableStoreDomainAction: () => actions.disableStoreDomainAction("missing-domain"),
  updateMyAccountAction: () => actions.updateMyAccountAction({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  }),
});
const seeded = () => calls({
  storeId: "store-a",
  productId: productOfA,
  categoryId: categoryOfA,
  orderId: orderOfA,
  inquiryId: "no-such-inquiry",
  membershipId: "missing-membership",
});

/** Everything a refused action could have changed. */
async function snapshot() {
  const [stores, products, categories, memberships, users, orders, variants, inquiries, audit, agency] = await Promise.all([
    db.store.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, status: true, archivedAt: true, updatedAt: true, templateKey: true, themeConfig: true, isDemo: true } }),
    db.product.findMany({ orderBy: { id: "asc" }, select: { id: true, status: true, updatedAt: true } }),
    db.category.findMany({ orderBy: { id: "asc" }, select: { id: true, position: true, updatedAt: true } }),
    db.storeMembership.findMany({ orderBy: { id: "asc" }, select: { id: true, userId: true, role: true } }),
    db.user.count(),
    db.order.findMany({ orderBy: { id: "asc" }, select: { id: true, status: true, paymentStatus: true, updatedAt: true } }),
    db.productVariant.findMany({ orderBy: { id: "asc" }, select: { id: true, stock: true } }),
    db.inquiry.findMany({ orderBy: { id: "asc" }, select: { id: true, status: true } }),
    db.auditEvent.count({ where: { OR: [{ action: { startsWith: "store." } }, { action: { startsWith: "order." } }, { action: { startsWith: "inquiry." } }, { action: { startsWith: "platform." } }] } }),
    db.platformSettings.findUnique({ where: { id: 1 } }),
  ]);
  return JSON.stringify({ stores, products, categories, memberships, users, orders, variants, inquiries, audit, agency });
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

test("a Store Owner can call only actions for their own store and cannot call platform actions", async () => {
  const password = "an action-scoped store owner passphrase 2026";
  const user = await db.user.create({
    data: { email: `scoped-owner-${uid()}@example.com`, name: "Scoped Owner" },
  });

  await db.storeMembership.create({ data: { userId: user.id, storeId: "store-a", role: "OWNER" } });
  const context = await getAuth().$context;
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await context.password.hash(password),
    },
  });
  try {
    const cookie = await signIn(user.email, password, STORE_HOST);
    actAs(cookie, STORE_HOST);
    const own = await actions.setInquiryStatusAction("store-a", "missing-inquiry", "NEW", "READ");
    assert.ok(own.ok || own.error !== FORBIDDEN, "own-store action passes authorization and reaches its scoped lookup");
    const other = await actions.setInquiryStatusAction("store-b", "missing-inquiry", "NEW", "READ");
    assert.deepEqual(other, { ok: false, error: FORBIDDEN });
    const platformOnly = await actions.setStoreOwnerAction("store-a", {
      ownerName: "Attempted",
      ownerEmail: `attempted-${uid()}@example.com`,
      ownerPassword: password,
    });
    assert.deepEqual(platformOnly, { ok: false, error: FORBIDDEN });
  } finally {
    setRequestRuntimeForTests(null);
    await db.user.delete({ where: { id: user.id } });
  }
});

test("Store Owner team operations are scoped to the current store and cannot change Owner memberships", async () => {
  const password = "a team-scoped owner passphrase 2026";
  const store = await db.store.findUniqueOrThrow({ where: { id: "store-a" }, select: { slug: true } });
  const owner = await db.user.create({
    data: { email: `team-owner-${uid()}@example.com`, name: "Team Owner" },
  });
  const ownerMembership = await db.storeMembership.create({
    data: { userId: owner.id, storeId: "store-a", role: "OWNER" },
  });
  const member = await db.user.create({
    data: { email: `team-member-${uid()}@example.com`, name: "Team Member" },
  });
  const memberMembership = await db.storeMembership.create({
    data: { userId: member.id, storeId: "store-a", role: "MANAGER" },
  });
  const otherStoreOwner = await db.storeMembership.findFirstOrThrow({
    where: { storeId: "store-b", role: "OWNER" },
  });
  const platformOwnerMembership = await db.storeMembership.create({
    data: { userId: ownerId, storeId: "store-a", role: "STAFF" },
  });
  let invitedEmail = "";
  const context = await getAuth().$context;
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: owner.id,
      accountId: owner.id,
      providerId: "credential",
      password: await context.password.hash(password),
    },
  });
  try {
    const host = `admin.${store.slug}.test.local`; // the store's dedicated admin host
    const cookie = await signIn(owner.email, password, host);
    actAs(cookie, host);

    const members = await listStoreTeamMembers(db, "store-a");
    assert.ok(members.some(({ id }) => id === memberMembership.id));
    assert.ok(!members.some(({ id }) => id === otherStoreOwner.id));
    assert.equal(members.find(({ id }) => id === platformOwnerMembership.id)?.isPlatformOwner, true);
    assert.deepEqual(await actions.updateStoreMemberRoleAction(memberMembership.id, "STAFF"), {
      ok: true,
      data: undefined,
      message: "Team role updated.",
    });
    assert.equal((await db.storeMembership.findUniqueOrThrow({ where: { id: memberMembership.id } })).role, "STAFF");
    assert.equal((await actions.updateStoreMemberRoleAction(memberMembership.id, "OWNER")).ok, false);
    assert.deepEqual(await actions.revokeStoreMemberAction(memberMembership.id), {
      ok: true,
      data: undefined,
      message: "Team access revoked.",
    });
    assert.equal(await db.storeMembership.findUnique({ where: { id: memberMembership.id } }), null);

    assert.equal((await actions.updateStoreMemberRoleAction(otherStoreOwner.id, "STAFF")).ok, false);
    assert.equal((await actions.revokeStoreMemberAction(otherStoreOwner.id)).ok, false);
    assert.equal((await db.storeMembership.findUniqueOrThrow({ where: { id: otherStoreOwner.id } })).role, "OWNER");
    assert.equal((await actions.updateStoreMemberRoleAction(ownerMembership.id, "STAFF")).ok, false);
    assert.equal((await actions.revokeStoreMemberAction(ownerMembership.id)).ok, false);
    assert.equal((await db.storeMembership.findUniqueOrThrow({ where: { id: ownerMembership.id } })).role, "OWNER");
    assert.equal((await actions.updateStoreMemberRoleAction(platformOwnerMembership.id, "MANAGER")).ok, false);
    assert.equal((await actions.revokeStoreMemberAction(platformOwnerMembership.id)).ok, false);
    assert.equal((await db.storeMembership.findUniqueOrThrow({ where: { id: platformOwnerMembership.id } })).role, "STAFF");

    const delivery: string[] = [];
    invitedEmail = `invited-${uid()}@example.com`;
    const invitationSent = await createStoreInvitation(
      db,
      {
        storeId: "store-a",
        actorUserId: owner.id,
        email: invitedEmail,
        role: "MANAGER",
        storeName: "Test Store",
        acceptUrl: `http://${host}/accept-invitation`,
      },
      { send: async (message) => { delivery.push(message.text); } },
    );
    assert.equal(invitationSent.ok, true);
    const token = /#token=([A-Za-z0-9_-]{43})/.exec(delivery[0])?.[1];
    assert.ok(token);
    const listed = await listStoreInvitations(db, "store-a");
    const pending = listed.find((invitation) => invitation.email === invitedEmail);
    assert.equal(pending?.status, "PENDING");
    assert.equal(JSON.stringify(pending).includes(token), false);
    assert.equal(await invitationForAcceptance(db, "store-b", token), null);
    assert.equal(
      (await acceptStoreInvitation(db, getAuth(), {
        storeId: "store-b",
        token,
        name: "Wrong Store",
        password: "wrong store invitation account passphrase",
      })).ok,
      false,
      "an invitation cannot be accepted on another store",
    );
    assert.equal(
      (await acceptStoreInvitation(db, getAuth(), {
        storeId: "store-a",
        token: `${token}x`,
        name: "New Manager",
        password: "manager invite account passphrase 2026",
      })).ok,
      false,
    );
    const acceptedPassword = "manager invite account passphrase 2026";
    const accepted = await acceptStoreInvitation(db, getAuth(), {
      storeId: "store-a",
      token,
      name: "New Manager",
      password: acceptedPassword,
    });
    assert.equal(accepted.ok, true, JSON.stringify(accepted));
    const invitedUser = await db.user.findUniqueOrThrow({ where: { email: invitedEmail } });
    assert.equal(invitedUser.emailVerified, true);
    assert.equal(
      (await db.storeMembership.findUniqueOrThrow({
        where: { userId_storeId: { userId: invitedUser.id, storeId: "store-a" } },
      })).role,
      "MANAGER",
    );
    const invitedCookie = await signIn(invitedEmail, acceptedPassword, host);
    actAs(invitedCookie, host);
    const invitedViewer = await requireAdminViewer();
    assert.equal(invitedViewer.kind, "store");
    if (invitedViewer.kind === "store") assert.equal(invitedViewer.role, "MANAGER");
    actAs(cookie, host);
    assert.equal(
      (await acceptStoreInvitation(db, getAuth(), {
        storeId: "store-a",
        token,
        name: "New Manager",
        password: "manager invite account passphrase 2026",
      })).ok,
      false,
      "an accepted bearer token cannot be reused",
    );

    const expiredDelivery: string[] = [];
    const expiredEmail = `expired-${uid()}@example.com`;
    const expiredResult = await createStoreInvitation(
      db,
      {
        storeId: "store-a",
        actorUserId: owner.id,
        email: expiredEmail,
        role: "STAFF",
        storeName: "Test Store",
        acceptUrl: `http://${host}/accept-invitation`,
      },
      { send: async (message) => { expiredDelivery.push(message.text); } },
    );
    assert.equal(expiredResult.ok, true);
    const expiredToken = /#token=([A-Za-z0-9_-]{43})/.exec(expiredDelivery[0])?.[1];
    assert.ok(expiredToken);
    await db.storeInvitation.updateMany({
      where: { tokenHash: hashStoreInvitationToken(expiredToken) },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      (await acceptStoreInvitation(db, getAuth(), {
        storeId: "store-a",
        token: expiredToken,
        name: "Expired Staff",
        password: "expired invitation account passphrase",
      })).ok,
      false,
    );
    assert.equal((await createStoreInvitation(
      db,
      { storeId: "store-a", actorUserId: owner.id, email: `owner-role-${uid()}@example.com`, role: "OWNER", storeName: "Test Store", acceptUrl: `http://${host}/accept-invitation` },
      { send: async () => { assert.fail("Owner invitations must not be sent"); } },
    )).ok, false);
    assert.equal((await createStoreInvitation(
      db,
      { storeId: "store-a", actorUserId: owner.id, email: (await db.user.findUniqueOrThrow({ where: { id: ownerId } })).email, role: "STAFF", storeName: "Test Store", acceptUrl: `http://${host}/accept-invitation` },
      { send: async () => { assert.fail("Platform Owner invitations must not be sent"); } },
    )).ok, false);
    assert.equal((await createStoreInvitation(
      db,
      {
        storeId: "store-a",
        actorUserId: owner.id,
        email: (await db.user.findUniqueOrThrow({ where: { id: otherStoreOwner.userId } })).email,
        role: "STAFF",
        storeName: "Test Store",
        acceptUrl: `http://${host}/accept-invitation`,
      },
      { send: async () => { assert.fail("Another store's Owner must not be invited as a team member"); } },
    )).ok, false);

    const revokeDelivery: string[] = [];
    const revokeEmail = `revoke-${uid()}@example.com`;
    assert.equal((await createStoreInvitation(
      db,
      { storeId: "store-a", actorUserId: owner.id, email: revokeEmail, role: "STAFF", storeName: "Test Store", acceptUrl: `http://${host}/accept-invitation` },
      { send: async (message) => { revokeDelivery.push(message.text); } },
    )).ok, true);
    const revokeToken = /#token=([A-Za-z0-9_-]{43})/.exec(revokeDelivery[0])?.[1];
    assert.ok(revokeToken);
    const revokeInvitation = (await listStoreInvitations(db, "store-a")).find(({ email }) => email === revokeEmail);
    assert.ok(revokeInvitation);
    assert.deepEqual(await actions.revokeStoreInvitationAction(revokeInvitation.id), {
      ok: true,
      data: undefined,
      message: "Invitation revoked.",
    });
    assert.equal(
      (await acceptStoreInvitation(db, getAuth(), {
        storeId: "store-a",
        token: revokeToken,
        name: "Revoked Staff",
        password: "revoked invitation account passphrase 2026",
      })).ok,
      false,
    );
  } finally {
    setRequestRuntimeForTests(null);
    if (invitedEmail) await db.user.deleteMany({ where: { email: invitedEmail } });
    await db.storeMembership.delete({ where: { id: platformOwnerMembership.id } });
    await db.user.delete({ where: { id: owner.id } });
    await db.user.delete({ where: { id: member.id } });
  }
});

test("Manager and Staff sessions stay store-scoped and respect their role limits", async () => {
  const store = await db.store.findUniqueOrThrow({ where: { id: "store-a" }, select: { slug: true } });
  const managerPassword = "a manager test passphrase 2026";
  const staffPassword = "a staff test passphrase 2026";
  const context = await getAuth().$context;
  const manager = await db.user.create({
    data: { email: `manager-${uid()}@example.com`, name: "Test Manager" },
  });
  const staff = await db.user.create({
    data: { email: `staff-${uid()}@example.com`, name: "Test Staff" },
  });
  const managedMember = await db.user.create({
    data: { email: `managed-${uid()}@example.com`, name: "Managed Member" },
  });
  const protectedManager = await db.user.create({
    data: { email: `protected-manager-${uid()}@example.com`, name: "Protected Manager" },
  });
  await db.storeMembership.create({ data: { userId: manager.id, storeId: "store-a", role: "MANAGER" } });
  await db.storeMembership.create({ data: { userId: staff.id, storeId: "store-a", role: "STAFF" } });
  const managedMemberMembership = await db.storeMembership.create({
    data: { userId: managedMember.id, storeId: "store-a", role: "MANAGER" },
  });
  const protectedManagerMembership = await db.storeMembership.create({
    data: { userId: protectedManager.id, storeId: "store-a", role: "MANAGER" },
  });
  const platformMembership = await db.storeMembership.create({
    data: { userId: ownerId, storeId: "store-a", role: "STAFF" },
  });
  await Promise.all([
    db.account.create({
      data: {
        id: randomUUID(),
        userId: manager.id,
        accountId: manager.id,
        providerId: "credential",
        password: await context.password.hash(managerPassword),
      },
    }),
    db.account.create({
      data: {
        id: randomUUID(),
        userId: staff.id,
        accountId: staff.id,
        providerId: "credential",
        password: await context.password.hash(staffPassword),
      },
    }),
  ]);
  const ownerMembership = await db.storeMembership.findFirstOrThrow({
    where: { storeId: "store-a", role: "OWNER" },
  });
  try {
    const host = `admin.${store.slug}.test.local`; // the store's dedicated admin host
    const managerCookie = await signIn(manager.email, managerPassword, host);
    actAs(managerCookie, host);
    const managerViewer = await requireAdminViewer();
    assert.equal(managerViewer.kind, "store");
    if (managerViewer.kind === "store") assert.equal(managerViewer.role, "MANAGER");
    const managerOwnAction = await actions.setInquiryStatusAction("store-a", "missing-message", "NEW", "READ");
    assert.ok(managerOwnAction.ok || managerOwnAction.error !== FORBIDDEN, "Manager's own-store operational action passes authorization");
    assert.deepEqual(
      await actions.setInquiryStatusAction("store-b", "missing-message", "NEW", "READ"),
      { ok: false, error: FORBIDDEN },
    );
    assert.deepEqual(await actions.updateOwnStoreSettingsAction({}), { ok: false, error: FORBIDDEN });
    const designBefore = await db.store.findUniqueOrThrow({ where: { id: "store-a" }, select: { templateKey: true, themeConfig: true } });
    assert.deepEqual(
      await actions.updateStoreDesignAction("store-a", { templateKey: "classic", theme: { palette: "soft" } }),
      { ok: false, error: FORBIDDEN },
      "Managers cannot change the store's design",
    );
    assert.deepEqual(await db.store.findUniqueOrThrow({ where: { id: "store-a" }, select: { templateKey: true, themeConfig: true } }), designBefore);
    assert.deepEqual(await actions.createStoreAction(newStore()), { ok: false, error: FORBIDDEN });
    assert.equal((await actions.updateStoreMemberRoleAction(ownerMembership.id, "STAFF")).ok, false);
    assert.equal((await actions.revokeStoreMemberAction(ownerMembership.id)).ok, false);
    assert.equal((await actions.updateStoreMemberRoleAction(platformMembership.id, "MANAGER")).ok, false);
    assert.equal((await db.storeMembership.findUniqueOrThrow({ where: { id: platformMembership.id } })).role, "STAFF");
    assert.deepEqual(await actions.updateStoreMemberRoleAction(managedMemberMembership.id, "STAFF"), {
      ok: true,
      data: undefined,
      message: "Team role updated.",
    });

    const staffCookie = await signIn(staff.email, staffPassword, host);
    actAs(staffCookie, host);
    const staffViewer = await requireAdminViewer();
    assert.equal(staffViewer.kind, "store");
    if (staffViewer.kind === "store") {
      assert.equal(staffViewer.role, "STAFF");
      assert.equal(staffViewer.access, "read");
    }
    assert.deepEqual(await actions.createStoreAction(newStore()), { ok: false, error: FORBIDDEN });
    assert.deepEqual(
      await actions.updateStoreDesignAction("store-a", { templateKey: "classic", theme: { palette: "soft" } }),
      { ok: false, error: FORBIDDEN },
      "Staff cannot change the store's design",
    );
    assert.deepEqual(
      await actions.createStoreInvitationAction(`staff-invite-${uid()}@example.com`, "STAFF"),
      { ok: false, error: FORBIDDEN },
      "Staff cannot create invitations",
    );
    assert.equal((await actions.setInquiryStatusAction("store-a", "missing-message", "NEW", "READ")).ok, false);
    assert.equal((await actions.updateStoreMemberRoleAction(ownerMembership.id, "STAFF")).ok, false);
    assert.equal((await actions.revokeStoreMemberAction(ownerMembership.id)).ok, false);
    assert.equal((await actions.updateStoreMemberRoleAction(protectedManagerMembership.id, "STAFF")).ok, false);
    assert.equal((await actions.revokeStoreMemberAction(protectedManagerMembership.id)).ok, false);
    assert.equal((await db.storeMembership.findUniqueOrThrow({ where: { id: protectedManagerMembership.id } })).role, "MANAGER");
  } finally {
    setRequestRuntimeForTests(null);
    await db.user.deleteMany({ where: { id: { in: [manager.id, staff.id, managedMember.id, protectedManager.id] } } });
    await db.storeMembership.delete({ where: { id: platformMembership.id } });
  }
});

test("Store Owner settings update only the owner store and ignore slug, role and platform fields", async () => {
  actAs(ownerCookie);
  // A UAE/AED store: Stripe Checkout is only offered in that market.
  const input = { ...newStore(), countryCode: "AE", baseCurrency: "AED", timezone: "Asia/Dubai" };
  const created = await actions.createStoreAction(input);
  assert.ok(created.ok, JSON.stringify(created));
  const storeId = created.data.id;
  const store = await db.store.findUniqueOrThrow({
    where: { id: storeId },
    select: { slug: true, status: true, countryCode: true, baseCurrency: true, timezone: true, defaultLanguage: true },
  });
  const host = `admin.${store.slug}.test.local`; // the store's dedicated admin host
  let storeOwnerId = "";

  try {
    const cookie = await signIn(input.ownerEmail, input.ownerPassword, host);
    const owner = await db.user.findUniqueOrThrow({ where: { email: input.ownerEmail }, select: { id: true } });
    storeOwnerId = owner.id;
    actAs(cookie, host);

    const settings = {
      paymentMethods: { cash_on_delivery: true, card_on_delivery: false, bank_transfer: true, cash_on_pickup: true },
      bankTransfer: {
        bankName: "Local Bank",
        accountName: "Nest and Oak",
        accountNumber: "123456789",
        iban: "",
        swiftCode: "",
        instructions: "Use the order number as the payment reference.",
      },
      // Secret references are scoped to the store they belong to.
      stripe: { enabled: true, accountId: "acct_12345678", secretRef: `vault:${storeId}/stripe/test` },
      name: "Owner Updated Store",
      slug: "attempted-slug-change",
      status: "ACTIVE",
      ownerEmail: "must-not-change@example.com",
      role: "STAFF",
      isPlatformOwner: true,
    };
    // The Owner may change their own store's design, and only their own.
    const design = await actions.updateStoreDesignAction(storeId, { templateKey: "atelier", theme: { palette: "stone" } });
    assert.ok(design.ok, JSON.stringify(design));
    assert.equal((await db.store.findUniqueOrThrow({ where: { id: storeId } })).templateKey, "atelier");
    const storeBDesign = await db.store.findUniqueOrThrow({ where: { id: "store-b" }, select: { templateKey: true, themeConfig: true } });
    assert.deepEqual(await actions.updateStoreDesignAction("store-b", { templateKey: "atelier", theme: {} }), { ok: false, error: FORBIDDEN });
    assert.deepEqual(await db.store.findUniqueOrThrow({ where: { id: "store-b" }, select: { templateKey: true, themeConfig: true } }), storeBDesign);
    assert.ok(await db.auditEvent.findFirst({ where: { action: "store.design_update", storeId, actorUserId: storeOwnerId } }));

    const foreignSecret = await actions.updateOwnStoreSettingsAction({
      ...settings,
      stripe: { ...settings.stripe, secretRef: "vault:store-a/stripe/test" },
    });
    assert.equal(foreignSecret.ok, false, "another store's secret reference is refused");
    const result = await actions.updateOwnStoreSettingsAction(settings);
    assert.ok(result.ok, JSON.stringify(result));

    const updated = await db.store.findUniqueOrThrow({
      where: { id: storeId },
      include: { memberships: { include: { user: true } }, paymentMethods: true },
    });
    assert.equal(updated.name, input.name, "store owner cannot change the store name");
    assert.equal(updated.slug, store.slug, "store owner cannot change hostname slug");
    assert.equal(updated.status, store.status, "store owner cannot change lifecycle status");
    assert.equal(updated.countryCode, store.countryCode, "payment settings cannot alter the country");
    assert.equal(updated.baseCurrency, store.baseCurrency, "payment settings cannot alter the currency");
    assert.equal(updated.timezone, store.timezone, "payment settings cannot alter the timezone");
    assert.equal(updated.defaultLanguage, store.defaultLanguage, "payment settings cannot alter the language");
    assert.equal(updated.memberships.length, 1);
    assert.equal(updated.memberships[0].role, "OWNER", "submitted role cannot change membership");
    assert.equal(updated.memberships[0].user.id, storeOwnerId);
    assert.equal(updated.memberships[0].user.email, input.ownerEmail);
    assert.equal(updated.memberships[0].user.isPlatformOwner, false);
    assert.equal(updated.paymentMethods.find(({ method }) => method === "bank_transfer")?.enabled, true);
    assert.equal(updated.paymentMethods.find(({ method }) => method === "online_card")?.enabled, false);
    assert.equal(updated.paymentMethods.find(({ method }) => method === "cash_on_pickup")?.enabled, true);
    const bankAccount = await db.paymentProviderAccount.findFirstOrThrow({ where: { storeId, provider: "bank_transfer" } });
    assert.equal((bankAccount.publicConfig as { bankName: string }).bankName, "Local Bank");
    const stripeAccount = await db.paymentProviderAccount.findFirstOrThrow({ where: { storeId, provider: "stripe_connect" } });
    assert.equal(stripeAccount.secretRef, `vault:${storeId}/stripe/test`);
    assert.equal(stripeAccount.mode, "TEST");
    assert.equal(updated.paymentMethods.find(({ method }) => method === "stripe_checkout")?.enabled, false);

    const otherStoreBefore = await db.store.findUniqueOrThrow({ where: { id: "store-b" }, select: { name: true } });
    const crossStoreAttempt = await actions.updateOwnStoreSettingsAction({ ...settings, storeId: "store-b" });
    assert.ok(crossStoreAttempt.ok, "store identity is derived from the authenticated host");
    assert.equal((await db.store.findUniqueOrThrow({ where: { id: "store-b" }, select: { name: true } })).name, otherStoreBefore.name);

    await db.storeMembership.update({
      where: { userId_storeId: { userId: storeOwnerId, storeId } },
      data: { role: "MANAGER" },
    });
    assert.deepEqual(await actions.updateOwnStoreSettingsAction(settings), {
      ok: false,
      error: FORBIDDEN,
    });
    assert.equal((await db.store.findUniqueOrThrow({ where: { id: storeId }, select: { name: true } })).name, input.name);
  } finally {
    setRequestRuntimeForTests(null);
    // Stores are archived, never deleted, in the app; for test cleanup the
    // translations (NO ACTION references to the store's languages) go first.
    await db.category.deleteMany({ where: { storeId } });
    await db.store.delete({ where: { id: storeId } });
    if (storeOwnerId) await db.user.delete({ where: { id: storeOwnerId } });
  }
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
  // The fresh store has no orders: the order actions only need to get
  // past the permission check here (they answer "not found").
  const target = {
    storeId,
    productId: product.data.id,
    categoryId,
    orderId: "no-such-order",
    inquiryId: "no-such-inquiry",
    membershipId: "missing-membership",
  };

  // Archive/restore last, so the other calls find an active store.
  const order = Object.entries(calls(target)).sort(([a], [b]) => Number(/archive|restore/.test(a)) - Number(/archive|restore/.test(b)));
  for (const [name, call] of order) {
    const result = await call();
    if (ACTION_PERMISSIONS[name as keyof typeof ACTION_PERMISSIONS] === "store-owner-context") {
      assert.deepEqual(result, { ok: false, error: FORBIDDEN }, name);
      continue;
    }
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
    heroTitle: "Hello",
    paymentMethods: { cash_on_delivery: true, card_on_delivery: false, bank_transfer: false, online_card: false },
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

test("reassigning a store owner updates their store-specific details and credentials", async () => {
  actAs(ownerCookie);
  const existing = await db.user.create({ data: { email: `shared-${uid()}@example.com`, name: "Original Name" } });
  const result = await actions.setStoreOwnerAction("store-c", {
    ownerName: "Changed Name",
    ownerEmail: existing.email,
    ownerPassword: "a reassigned owner passphrase 2026",
  });
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: existing.id } })).name, "Changed Name");
  const account = await db.account.findUniqueOrThrow({
    where: { providerId_accountId: { providerId: "credential", accountId: existing.id } },
  });
  assert.notEqual(account.password, "a reassigned owner passphrase 2026");
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
